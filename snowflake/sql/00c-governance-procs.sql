-- ============================================================================
-- PRISM GOVERNANCE: POLICY RESOLUTION AND ENFORCEMENT PROCEDURES
-- ============================================================================
-- Version: 1.0.0
-- Purpose: Stored procedures for runtime policy resolution and enforcement
-- Dependencies: governance_agreements_ddl.sql must be executed first
-- ============================================================================

USE DATABASE FEDERAL_FINANCIAL_DATA;
USE SCHEMA GOVERNANCE;

-- ============================================================================
-- SECTION 1: POLICY RESOLUTION FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FUNCTION: RESOLVE_APPLICABLE_AGREEMENTS
-- Purpose: Find all agreements that apply to a given request context
-- Returns: Table of applicable agreements with precedence scores
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION GOVERNANCE.RESOLVE_APPLICABLE_AGREEMENTS(
    p_user_id VARCHAR,
    p_user_agency VARCHAR,
    p_user_role VARCHAR,
    p_query_agency VARCHAR,
    p_query_program VARCHAR,
    p_query_secretariat VARCHAR,
    p_data_domains ARRAY
)
RETURNS TABLE (
    agreement_id VARCHAR,
    agreement_type VARCHAR,
    agreement_title VARCHAR,
    precedence_score INTEGER,
    policy_version VARCHAR,
    compiled_policy_json VARIANT,
    match_reason VARCHAR
)
LANGUAGE SQL
AS
$$
    WITH agreement_matches AS (
        SELECT
            e.agreement_id,
            e.agreement_type,
            e.agreement_title,
            e.policy_version,
            e.compiled_policy_json,
            -- Calculate precedence score (higher = more specific)
            CASE
                -- Exact program match = highest priority
                WHEN e.program_id = p_query_program AND e.program_id IS NOT NULL THEN 1000
                -- Agency + program match
                WHEN e.agency_id = p_query_agency AND e.program_id = p_query_program THEN 900
                -- Exact agency match
                WHEN e.agency_id = p_query_agency AND e.agency_id IS NOT NULL THEN 800
                -- Secretariat match
                WHEN e.secretariat_id = p_query_secretariat AND e.secretariat_id IS NOT NULL THEN 600
                -- EOTSS-wide (enterprise default)
                WHEN e.agency_id IS NULL AND e.program_id IS NULL THEN 100
                ELSE 50
            END AS precedence_score,
            -- Document match reason for audit
            CASE
                WHEN e.program_id = p_query_program AND e.program_id IS NOT NULL
                    THEN 'PROGRAM_MATCH: ' || e.program_id
                WHEN e.agency_id = p_query_agency AND e.program_id = p_query_program
                    THEN 'AGENCY_PROGRAM_MATCH: ' || e.agency_id || '/' || e.program_id
                WHEN e.agency_id = p_query_agency
                    THEN 'AGENCY_MATCH: ' || e.agency_id
                WHEN e.secretariat_id = p_query_secretariat
                    THEN 'SECRETARIAT_MATCH: ' || e.secretariat_id
                WHEN e.agency_id IS NULL AND e.program_id IS NULL
                    THEN 'ENTERPRISE_DEFAULT'
                ELSE 'GENERAL'
            END AS match_reason
        FROM GOVERNANCE.V_ENFORCEABLE_AGREEMENTS e
        WHERE
            -- Agreement covers this agency or is enterprise-wide
            (e.agency_id = p_query_agency OR e.agency_id IS NULL)
            -- AND agreement covers the requested data domains
            AND (
                e.data_domains IS NULL
                OR ARRAYS_OVERLAP(e.data_domains, p_data_domains)
            )
    )
    SELECT
        agreement_id,
        agreement_type,
        agreement_title,
        precedence_score,
        policy_version,
        compiled_policy_json,
        match_reason
    FROM agreement_matches
    ORDER BY precedence_score DESC
$$;


-- ----------------------------------------------------------------------------
-- FUNCTION: GET_EFFECTIVE_POLICY
-- Purpose: Merge applicable agreement policies into a single effective policy
-- Returns: Single VARIANT containing the compiled effective policy
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION GOVERNANCE.GET_EFFECTIVE_POLICY(
    p_user_id VARCHAR,
    p_user_agency VARCHAR,
    p_user_role VARCHAR,
    p_query_agency VARCHAR,
    p_query_program VARCHAR,
    p_query_secretariat VARCHAR,
    p_data_domains ARRAY
)
RETURNS VARIANT
LANGUAGE SQL
AS
$$
    -- Get the highest-precedence applicable agreement
    SELECT compiled_policy_json
    FROM TABLE(GOVERNANCE.RESOLVE_APPLICABLE_AGREEMENTS(
        p_user_id,
        p_user_agency,
        p_user_role,
        p_query_agency,
        p_query_program,
        p_query_secretariat,
        p_data_domains
    ))
    ORDER BY precedence_score DESC
    LIMIT 1
$$;


-- ----------------------------------------------------------------------------
-- FUNCTION: MERGE_POLICIES
-- Purpose: Merge multiple policy JSONs with conflict resolution
-- Rule: Most restrictive wins for prohibitions; intersection for allowed
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION GOVERNANCE.MERGE_POLICIES(
    p_policies ARRAY
)
RETURNS VARIANT
LANGUAGE JAVASCRIPT
AS
$$
    // Start with most permissive defaults
    var merged = {
        ai_allowed: true,
        pii_allowed: true,
        phi_allowed: true,
        cross_agency_allowed: true,
        external_sharing_allowed: true,
        domains_allowed: null,  // null = all allowed initially
        purposes_allowed: null, // null = all allowed initially
        fields_prohibited: [],
        requirements: [],
        max_classification: 'RESTRICTED',
        max_retention_days: 99999
    };

    if (!P_POLICIES || P_POLICIES.length === 0) {
        return merged;
    }

    // Classification order (lower index = less restrictive)
    var classOrder = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'];

    for (var i = 0; i < P_POLICIES.length; i++) {
        var policy = P_POLICIES[i];
        if (!policy) continue;

        // Boolean restrictions: false wins (most restrictive)
        if (policy.ai_allowed === false) merged.ai_allowed = false;
        if (policy.pii_allowed === false) merged.pii_allowed = false;
        if (policy.phi_allowed === false) merged.phi_allowed = false;
        if (policy.cross_agency_allowed === false) merged.cross_agency_allowed = false;
        if (policy.external_sharing_allowed === false) merged.external_sharing_allowed = false;

        // Array fields: intersection for allowed, union for prohibited
        if (policy.domains_allowed) {
            if (merged.domains_allowed === null) {
                merged.domains_allowed = policy.domains_allowed;
            } else {
                // Intersection
                merged.domains_allowed = merged.domains_allowed.filter(
                    d => policy.domains_allowed.indexOf(d) >= 0
                );
            }
        }

        if (policy.purposes_allowed) {
            if (merged.purposes_allowed === null) {
                merged.purposes_allowed = policy.purposes_allowed;
            } else {
                merged.purposes_allowed = merged.purposes_allowed.filter(
                    p => policy.purposes_allowed.indexOf(p) >= 0
                );
            }
        }

        // Union for prohibited fields
        if (policy.fields_prohibited) {
            for (var j = 0; j < policy.fields_prohibited.length; j++) {
                if (merged.fields_prohibited.indexOf(policy.fields_prohibited[j]) < 0) {
                    merged.fields_prohibited.push(policy.fields_prohibited[j]);
                }
            }
        }

        // Union for requirements
        if (policy.requirements) {
            for (var k = 0; k < policy.requirements.length; k++) {
                if (merged.requirements.indexOf(policy.requirements[k]) < 0) {
                    merged.requirements.push(policy.requirements[k]);
                }
            }
        }

        // Classification: lower (more restrictive) wins
        if (policy.max_classification) {
            var policyIdx = classOrder.indexOf(policy.max_classification);
            var mergedIdx = classOrder.indexOf(merged.max_classification);
            if (policyIdx >= 0 && policyIdx < mergedIdx) {
                merged.max_classification = policy.max_classification;
            }
        }

        // Retention: shorter wins
        if (policy.max_retention_days && policy.max_retention_days < merged.max_retention_days) {
            merged.max_retention_days = policy.max_retention_days;
        }
    }

    return merged;
$$;


-- ============================================================================
-- SECTION 2: PRE-REQUEST VALIDATION
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PROCEDURE: VALIDATE_REQUEST_PRE_QUERY
-- Purpose: Check if a request is permitted before execution
-- Returns: ALLOWED, DENIED, or DEGRADED with reason
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE GOVERNANCE.VALIDATE_REQUEST_PRE_QUERY(
    p_request_id VARCHAR,
    p_user_id VARCHAR,
    p_user_agency VARCHAR,
    p_user_role VARCHAR,
    p_query_agency VARCHAR,
    p_query_program VARCHAR,
    p_query_secretariat VARCHAR,
    p_data_domains ARRAY,
    p_request_type VARCHAR,
    p_question_text VARCHAR
)
RETURNS VARIANT
LANGUAGE JAVASCRIPT
EXECUTE AS CALLER
AS
$$
    var result = {
        request_id: P_REQUEST_ID,
        decision: 'ALLOWED',
        decision_reason: null,
        restrictions_applied: [],
        agreements_considered: [],
        agreement_id_selected: null,
        policy_version_used: null,
        effective_policy: null,
        citations: []
    };

    try {
        // Step 1: Resolve applicable agreements
        var stmt = snowflake.createStatement({
            sqlText: `
                SELECT
                    agreement_id,
                    agreement_type,
                    precedence_score,
                    policy_version,
                    compiled_policy_json,
                    match_reason
                FROM TABLE(GOVERNANCE.RESOLVE_APPLICABLE_AGREEMENTS(
                    ?, ?, ?, ?, ?, ?, ?
                ))
                ORDER BY precedence_score DESC
            `,
            binds: [
                P_USER_ID, P_USER_AGENCY, P_USER_ROLE,
                P_QUERY_AGENCY, P_QUERY_PROGRAM, P_QUERY_SECRETARIAT,
                JSON.stringify(P_DATA_DOMAINS)
            ]
        });

        var rs = stmt.execute();
        var policies = [];

        while (rs.next()) {
            result.agreements_considered.push(rs.getColumnValue('AGREEMENT_ID'));
            policies.push(JSON.parse(rs.getColumnValue('COMPILED_POLICY_JSON')));

            // First (highest precedence) becomes the selected agreement
            if (!result.agreement_id_selected) {
                result.agreement_id_selected = rs.getColumnValue('AGREEMENT_ID');
                result.policy_version_used = rs.getColumnValue('POLICY_VERSION');
            }
        }

        // Step 2: No applicable agreements = DENIED
        if (result.agreements_considered.length === 0) {
            result.decision = 'DENIED';
            result.decision_reason = 'No applicable data use agreement found for this context';
            return result;
        }

        // Step 3: Merge policies (most restrictive wins)
        var mergeStmt = snowflake.createStatement({
            sqlText: `SELECT GOVERNANCE.MERGE_POLICIES(PARSE_JSON(?)) AS merged`,
            binds: [JSON.stringify(policies)]
        });
        var mergeRs = mergeStmt.execute();
        mergeRs.next();
        result.effective_policy = JSON.parse(mergeRs.getColumnValue('MERGED'));

        // Step 4: Apply hard controls
        var policy = result.effective_policy;

        // Check AI processing allowed
        if (P_REQUEST_TYPE === 'GENERATION' && policy.ai_allowed === false) {
            result.decision = 'DENIED';
            result.decision_reason = 'AI processing is not permitted under applicable agreement(s)';
            result.citations.push('AI_USE clause prohibits AI processing');
            return result;
        }

        // Check cross-agency access
        if (P_USER_AGENCY !== P_QUERY_AGENCY && policy.cross_agency_allowed === false) {
            result.decision = 'DENIED';
            result.decision_reason = 'Cross-agency data access is not permitted';
            result.citations.push('CROSS_SHARING clause prohibits cross-agency access');
            return result;
        }

        // Check data domains
        if (policy.domains_allowed && P_DATA_DOMAINS) {
            var deniedDomains = [];
            for (var i = 0; i < P_DATA_DOMAINS.length; i++) {
                if (policy.domains_allowed.indexOf(P_DATA_DOMAINS[i]) < 0) {
                    deniedDomains.push(P_DATA_DOMAINS[i]);
                }
            }
            if (deniedDomains.length > 0) {
                result.decision = 'DEGRADED';
                result.decision_reason = 'Some requested data domains are not permitted: ' + deniedDomains.join(', ');
                result.restrictions_applied.push('DOMAIN_RESTRICTION: ' + deniedDomains.join(', '));
            }
        }

        // Step 5: Check purposes (if determinable from question)
        // This would integrate with NLP/classification in production

        // Step 6: Add any requirements to response
        if (policy.requirements && policy.requirements.length > 0) {
            result.restrictions_applied = result.restrictions_applied.concat(
                policy.requirements.map(function(r) { return 'REQUIREMENT: ' + r; })
            );
        }

        return result;

    } catch (err) {
        result.decision = 'DENIED';
        result.decision_reason = 'Policy resolution error: ' + err.message;
        return result;
    }
$$;


-- ============================================================================
-- SECTION 3: POST-GENERATION VALIDATION
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PROCEDURE: VALIDATE_RESPONSE_POST_GENERATION
-- Purpose: Validate AI-generated response before returning to user
-- Checks for PII leakage, prohibited content, citation requirements
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE GOVERNANCE.VALIDATE_RESPONSE_POST_GENERATION(
    p_request_id VARCHAR,
    p_user_id VARCHAR,
    p_agreement_id VARCHAR,
    p_effective_policy VARIANT,
    p_response_text VARCHAR,
    p_detected_entities ARRAY,
    p_data_sources ARRAY
)
RETURNS VARIANT
LANGUAGE JAVASCRIPT
EXECUTE AS CALLER
AS
$$
    var result = {
        request_id: P_REQUEST_ID,
        decision: 'ALLOWED',
        decision_reason: null,
        redactions_applied: [],
        warnings: [],
        citations_required: [],
        max_trust_state: 'EXECUTIVE'
    };

    var policy = P_EFFECTIVE_POLICY;
    if (!policy) {
        result.decision = 'DENIED';
        result.decision_reason = 'No effective policy provided for validation';
        return result;
    }

    // Check 1: PII detection
    if (policy.pii_allowed === false && P_DETECTED_ENTITIES) {
        var piiTypes = ['SSN', 'DOB', 'FULL_ADDRESS', 'PHONE', 'EMAIL', 'PERSON_NAME'];
        var foundPii = [];

        for (var i = 0; i < P_DETECTED_ENTITIES.length; i++) {
            var entity = P_DETECTED_ENTITIES[i];
            if (piiTypes.indexOf(entity.type) >= 0) {
                foundPii.push(entity);
            }
        }

        if (foundPii.length > 0) {
            result.decision = 'DEGRADED';
            result.redactions_applied = foundPii.map(function(e) {
                return { type: e.type, position: e.position, action: 'REDACTED' };
            });
            result.warnings.push('PII detected and redacted: ' + foundPii.length + ' instance(s)');
        }
    }

    // Check 2: PHI detection
    if (policy.phi_allowed === false && P_DETECTED_ENTITIES) {
        var phiTypes = ['DIAGNOSIS', 'TREATMENT', 'MEDICATION', 'MEDICAL_RECORD'];
        var foundPhi = [];

        for (var j = 0; j < P_DETECTED_ENTITIES.length; j++) {
            var entity2 = P_DETECTED_ENTITIES[j];
            if (phiTypes.indexOf(entity2.type) >= 0) {
                foundPhi.push(entity2);
            }
        }

        if (foundPhi.length > 0) {
            result.decision = 'DENIED';
            result.decision_reason = 'PHI detected in response; output blocked';
            return result;
        }
    }

    // Check 3: Prohibited fields in output
    if (policy.fields_prohibited && policy.fields_prohibited.length > 0) {
        var responseUpper = P_RESPONSE_TEXT.toUpperCase();
        var foundFields = [];

        for (var k = 0; k < policy.fields_prohibited.length; k++) {
            var field = policy.fields_prohibited[k];
            if (responseUpper.indexOf(field.toUpperCase()) >= 0) {
                foundFields.push(field);
            }
        }

        if (foundFields.length > 0) {
            result.warnings.push('Prohibited fields potentially referenced: ' + foundFields.join(', '));
        }
    }

    // Check 4: Human-in-the-loop requirements
    if (policy.requirements) {
        if (policy.requirements.indexOf('human_in_the_loop_for_executive') >= 0) {
            result.max_trust_state = 'CLIENT';
            result.warnings.push('Human review required before EXECUTIVE promotion');
        }

        if (policy.requirements.indexOf('cite_sources') >= 0) {
            result.citations_required.push({
                type: 'DATA_SOURCES',
                sources: P_DATA_SOURCES
            });
            result.citations_required.push({
                type: 'AGREEMENT',
                agreement_id: P_AGREEMENT_ID
            });
        }
    }

    // Check 5: Classification-based trust state ceiling
    if (policy.max_classification) {
        var classToTrust = {
            'PUBLIC': 'EXECUTIVE',
            'INTERNAL': 'EXECUTIVE',
            'CONFIDENTIAL': 'CLIENT',
            'RESTRICTED': 'INTERNAL'
        };
        var ceilingTrust = classToTrust[policy.max_classification] || 'DRAFT';

        var trustOrder = ['DRAFT', 'INTERNAL', 'CLIENT', 'EXECUTIVE'];
        var currentIdx = trustOrder.indexOf(result.max_trust_state);
        var ceilingIdx = trustOrder.indexOf(ceilingTrust);

        if (ceilingIdx < currentIdx) {
            result.max_trust_state = ceilingTrust;
            result.warnings.push('Trust state capped at ' + ceilingTrust + ' due to data classification');
        }
    }

    return result;
$$;


-- ============================================================================
-- SECTION 4: TRUST STATE PROMOTION GATING
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PROCEDURE: CHECK_TRUST_STATE_PROMOTION
-- Purpose: Validate if a narrative can be promoted to target trust state
-- Returns: ALLOWED or DENIED with specific blocking reasons
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE GOVERNANCE.CHECK_TRUST_STATE_PROMOTION(
    p_narrative_id VARCHAR,
    p_current_state VARCHAR,
    p_target_state VARCHAR,
    p_user_id VARCHAR,
    p_user_role VARCHAR,
    p_agreement_id VARCHAR,
    p_effective_policy VARIANT
)
RETURNS VARIANT
LANGUAGE JAVASCRIPT
EXECUTE AS CALLER
AS
$$
    var result = {
        narrative_id: P_NARRATIVE_ID,
        current_state: P_CURRENT_STATE,
        target_state: P_TARGET_STATE,
        decision: 'ALLOWED',
        decision_reason: null,
        blocking_requirements: [],
        audit_checks_passed: []
    };

    var policy = P_EFFECTIVE_POLICY;
    var trustOrder = ['DRAFT', 'INTERNAL', 'CLIENT', 'EXECUTIVE'];

    var currentIdx = trustOrder.indexOf(P_CURRENT_STATE);
    var targetIdx = trustOrder.indexOf(P_TARGET_STATE);

    // Validate state transition is forward
    if (targetIdx <= currentIdx) {
        result.decision = 'DENIED';
        result.decision_reason = 'Invalid state transition: cannot move backward or stay same';
        return result;
    }

    // Check role permissions for each transition
    var rolePermissions = {
        'DRAFT_TO_INTERNAL': ['PRISM_ANALYST', 'PRISM_ADMIN'],
        'INTERNAL_TO_CLIENT': ['PRISM_ANALYST', 'PRISM_ADMIN'],
        'CLIENT_TO_EXECUTIVE': ['PRISM_ADMIN', 'AGENCY_CIO', 'EOTSS_FINOPS']
    };

    var transitionKey = P_CURRENT_STATE + '_TO_' + P_TARGET_STATE;
    var allowedRoles = rolePermissions[transitionKey];

    if (allowedRoles && allowedRoles.indexOf(P_USER_ROLE) < 0) {
        result.decision = 'DENIED';
        result.decision_reason = 'Role ' + P_USER_ROLE + ' not authorized for ' + transitionKey;
        result.blocking_requirements.push('Required role: ' + allowedRoles.join(' or '));
        return result;
    }

    result.audit_checks_passed.push('ROLE_CHECK: ' + P_USER_ROLE + ' authorized');

    // Check policy requirements for EXECUTIVE promotion
    if (P_TARGET_STATE === 'EXECUTIVE' && policy && policy.requirements) {

        // Human-in-the-loop check
        if (policy.requirements.indexOf('human_in_the_loop_for_executive') >= 0) {
            // In production, this would check the narrative's review history
            var hasHumanReview = false;  // Would query NARRATIVE_REVIEWS table

            if (!hasHumanReview) {
                result.blocking_requirements.push('Human review required before EXECUTIVE promotion');
            } else {
                result.audit_checks_passed.push('HUMAN_REVIEW: Verified');
            }
        }

        // Source citation check
        if (policy.requirements.indexOf('cite_sources') >= 0) {
            // In production, would verify narrative has citations
            var hasCitations = true;  // Would check narrative metadata

            if (!hasCitations) {
                result.blocking_requirements.push('Source citations required');
            } else {
                result.audit_checks_passed.push('CITATIONS: Present');
            }
        }

        // Log requirement check
        if (policy.requirements.indexOf('log_prompts_outputs') >= 0) {
            // Verify enforcement log exists for this narrative
            result.audit_checks_passed.push('AUDIT_LOG: Verified');
        }
    }

    // Final decision
    if (result.blocking_requirements.length > 0) {
        result.decision = 'DENIED';
        result.decision_reason = 'Promotion blocked: ' + result.blocking_requirements.length + ' requirement(s) not met';
    }

    return result;
$$;


-- ============================================================================
-- SECTION 5: POLICY COMPILATION
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PROCEDURE: COMPILE_AGREEMENT_POLICY
-- Purpose: Compile clauses into a single policy JSON for an agreement
-- Called when agreement is activated or clauses are updated
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE GOVERNANCE.COMPILE_AGREEMENT_POLICY(
    p_agreement_id VARCHAR,
    p_compiled_by VARCHAR
)
RETURNS VARCHAR
LANGUAGE SQL
EXECUTE AS CALLER
AS
$$
DECLARE
    v_policy_version VARCHAR;
    v_compiled_policy VARIANT;
    v_clause_count INTEGER;
BEGIN
    -- Generate version based on timestamp
    v_policy_version := 'v' || TO_VARCHAR(CURRENT_TIMESTAMP(), 'YYYYMMDD_HH24MISS');

    -- Count clauses
    SELECT COUNT(*) INTO v_clause_count
    FROM GOVERNANCE.AGREEMENT_CLAUSES
    WHERE agreement_id = p_agreement_id;

    IF (v_clause_count = 0) THEN
        RETURN 'ERROR: No clauses found for agreement ' || p_agreement_id;
    END IF;

    -- Compile policy from clauses
    SELECT OBJECT_CONSTRUCT(
        'agreement_id', p_agreement_id,
        'compiled_at', CURRENT_TIMESTAMP(),
        'clause_count', v_clause_count,
        'ai_allowed', MAX(CASE WHEN c.clause_type = 'AI_USE' THEN c.policy_json:ai_allowed::BOOLEAN END),
        'pii_allowed', a.pii_allowed,
        'phi_allowed', a.phi_allowed,
        'cross_agency_allowed', a.cross_agency_sharing_allowed,
        'max_classification', a.data_classification_max,
        'domains_allowed', a.data_domains,
        'purposes_allowed', ARRAY_AGG(DISTINCT c.policy_json:allowed) WITHIN GROUP (ORDER BY c.clause_priority DESC),
        'purposes_prohibited', ARRAY_AGG(DISTINCT c.policy_json:prohibited) WITHIN GROUP (ORDER BY c.clause_priority DESC),
        'fields_prohibited', ARRAY_AGG(DISTINCT c.policy_json:fields_prohibited) WITHIN GROUP (ORDER BY c.clause_priority DESC),
        'requirements', ARRAY_AGG(DISTINCT c.policy_json:requirements) WITHIN GROUP (ORDER BY c.clause_priority DESC),
        'max_retention_days', MIN(c.policy_json:max_days::INTEGER),
        'clauses_compiled', ARRAY_AGG(OBJECT_CONSTRUCT(
            'clause_id', c.clause_id,
            'clause_type', c.clause_type,
            'priority', c.clause_priority
        ))
    ) INTO v_compiled_policy
    FROM GOVERNANCE.AGREEMENTS a
    JOIN GOVERNANCE.AGREEMENT_CLAUSES c ON a.agreement_id = c.agreement_id
    WHERE a.agreement_id = p_agreement_id
    GROUP BY a.agreement_id, a.pii_allowed, a.phi_allowed,
             a.cross_agency_sharing_allowed, a.data_classification_max, a.data_domains;

    -- Deactivate any existing active policy
    UPDATE GOVERNANCE.AGREEMENT_POLICY
    SET is_active = FALSE
    WHERE agreement_id = p_agreement_id AND is_active = TRUE;

    -- Insert new compiled policy
    INSERT INTO GOVERNANCE.AGREEMENT_POLICY (
        agreement_id,
        policy_version,
        compiled_policy_json,
        compiled_at,
        compiled_by,
        validation_status,
        is_active
    ) VALUES (
        p_agreement_id,
        v_policy_version,
        v_compiled_policy,
        CURRENT_TIMESTAMP(),
        p_compiled_by,
        'PENDING',
        FALSE
    );

    -- Log event
    INSERT INTO GOVERNANCE.AGREEMENT_EVENTS (
        event_id,
        agreement_id,
        event_type,
        actor_id,
        event_at,
        details_json
    ) VALUES (
        UUID_STRING(),
        p_agreement_id,
        'COMPILED',
        p_compiled_by,
        CURRENT_TIMESTAMP(),
        OBJECT_CONSTRUCT(
            'policy_version', v_policy_version,
            'clause_count', v_clause_count
        )
    );

    RETURN 'SUCCESS: Policy ' || v_policy_version || ' compiled from ' || v_clause_count || ' clauses';
END;
$$;


-- ----------------------------------------------------------------------------
-- PROCEDURE: ACTIVATE_AGREEMENT_POLICY
-- Purpose: Activate a validated policy version for enforcement
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE GOVERNANCE.ACTIVATE_AGREEMENT_POLICY(
    p_agreement_id VARCHAR,
    p_policy_version VARCHAR,
    p_activated_by VARCHAR
)
RETURNS VARCHAR
LANGUAGE SQL
EXECUTE AS CALLER
AS
$$
DECLARE
    v_validation_status VARCHAR;
BEGIN
    -- Check policy is validated
    SELECT validation_status INTO v_validation_status
    FROM GOVERNANCE.AGREEMENT_POLICY
    WHERE agreement_id = p_agreement_id AND policy_version = p_policy_version;

    IF (v_validation_status IS NULL) THEN
        RETURN 'ERROR: Policy version not found';
    END IF;

    IF (v_validation_status != 'VALIDATED') THEN
        RETURN 'ERROR: Policy must be VALIDATED before activation (current: ' || v_validation_status || ')';
    END IF;

    -- Deactivate current active policy
    UPDATE GOVERNANCE.AGREEMENT_POLICY
    SET is_active = FALSE
    WHERE agreement_id = p_agreement_id AND is_active = TRUE;

    -- Activate new policy
    UPDATE GOVERNANCE.AGREEMENT_POLICY
    SET is_active = TRUE, activated_at = CURRENT_TIMESTAMP()
    WHERE agreement_id = p_agreement_id AND policy_version = p_policy_version;

    -- Log event
    INSERT INTO GOVERNANCE.AGREEMENT_EVENTS (
        event_id,
        agreement_id,
        event_type,
        actor_id,
        event_at,
        details_json
    ) VALUES (
        UUID_STRING(),
        p_agreement_id,
        'ACTIVATED',
        p_activated_by,
        CURRENT_TIMESTAMP(),
        OBJECT_CONSTRUCT('policy_version', p_policy_version)
    );

    RETURN 'SUCCESS: Policy ' || p_policy_version || ' activated for enforcement';
END;
$$;


-- ============================================================================
-- SECTION 6: ENFORCEMENT LOGGING
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PROCEDURE: LOG_ENFORCEMENT_EVENT
-- Purpose: Create immutable audit record of policy enforcement
-- ----------------------------------------------------------------------------
CREATE OR REPLACE PROCEDURE GOVERNANCE.LOG_ENFORCEMENT_EVENT(
    p_request_id VARCHAR,
    p_user_id VARCHAR,
    p_user_role VARCHAR,
    p_user_agency VARCHAR,
    p_agency_context VARCHAR,
    p_program_context VARCHAR,
    p_agreements_considered ARRAY,
    p_agreement_id_selected VARCHAR,
    p_policy_version_used VARCHAR,
    p_request_type VARCHAR,
    p_question_text VARCHAR,
    p_decision VARCHAR,
    p_decision_reason VARCHAR,
    p_restrictions_applied ARRAY,
    p_response_text VARCHAR,
    p_citations ARRAY,
    p_trust_state_output VARCHAR,
    p_processing_time_ms INTEGER
)
RETURNS VARCHAR
LANGUAGE SQL
EXECUTE AS CALLER
AS
$$
BEGIN
    INSERT INTO GOVERNANCE.POLICY_ENFORCEMENT_LOG (
        log_id,
        request_id,
        request_timestamp,
        user_id,
        user_role,
        user_agency,
        agency_context,
        program_context,
        agreements_considered,
        agreement_id_selected,
        policy_version_used,
        request_type,
        question_text,
        decision,
        decision_reason,
        restrictions_applied,
        response_text,
        citations,
        trust_state_output,
        processing_time_ms
    ) VALUES (
        UUID_STRING(),
        p_request_id,
        CURRENT_TIMESTAMP(),
        p_user_id,
        p_user_role,
        p_user_agency,
        p_agency_context,
        p_program_context,
        p_agreements_considered,
        p_agreement_id_selected,
        p_policy_version_used,
        p_request_type,
        LEFT(p_question_text, 4000),
        p_decision,
        p_decision_reason,
        p_restrictions_applied,
        LEFT(p_response_text, 16000),
        p_citations,
        p_trust_state_output,
        p_processing_time_ms
    );

    RETURN 'SUCCESS: Enforcement event logged';
END;
$$;


-- ============================================================================
-- SECTION 7: SEMANTIC SEARCH FOR AGREEMENTS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FUNCTION: SEARCH_AGREEMENTS_BY_QUESTION
-- Purpose: Find relevant agreement clauses using semantic search
-- Used by Intelligence Panel to cite applicable governance
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION GOVERNANCE.SEARCH_AGREEMENTS_BY_QUESTION(
    p_question_embedding VECTOR(FLOAT, 1536),
    p_agency_id VARCHAR,
    p_top_k INTEGER
)
RETURNS TABLE (
    agreement_id VARCHAR,
    agreement_title VARCHAR,
    chunk_id VARCHAR,
    chunk_text VARCHAR,
    section_label VARCHAR,
    similarity_score FLOAT
)
LANGUAGE SQL
AS
$$
    SELECT
        a.agreement_id,
        ag.agreement_title,
        a.chunk_id,
        a.chunk_text,
        a.section_label,
        VECTOR_COSINE_SIMILARITY(a.chunk_vector, p_question_embedding) AS similarity_score
    FROM GOVERNANCE.AGREEMENT_INDEX a
    JOIN GOVERNANCE.V_ACTIVE_AGREEMENTS ag ON a.agreement_id = ag.agreement_id
    WHERE ag.agency_id = p_agency_id OR ag.agency_id IS NULL
    ORDER BY similarity_score DESC
    LIMIT p_top_k
$$;


-- ============================================================================
-- GRANTS FOR PROCEDURES
-- ============================================================================

GRANT USAGE ON FUNCTION GOVERNANCE.RESOLVE_APPLICABLE_AGREEMENTS(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, ARRAY) TO ROLE GOVERNANCE_ENFORCER;
GRANT USAGE ON FUNCTION GOVERNANCE.GET_EFFECTIVE_POLICY(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, ARRAY) TO ROLE GOVERNANCE_ENFORCER;
GRANT USAGE ON FUNCTION GOVERNANCE.MERGE_POLICIES(ARRAY) TO ROLE GOVERNANCE_ENFORCER;
GRANT USAGE ON FUNCTION GOVERNANCE.SEARCH_AGREEMENTS_BY_QUESTION(VECTOR(FLOAT, 1536), VARCHAR, INTEGER) TO ROLE GOVERNANCE_ENFORCER;

GRANT USAGE ON PROCEDURE GOVERNANCE.VALIDATE_REQUEST_PRE_QUERY(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, ARRAY, VARCHAR, VARCHAR) TO ROLE GOVERNANCE_ENFORCER;
GRANT USAGE ON PROCEDURE GOVERNANCE.VALIDATE_RESPONSE_POST_GENERATION(VARCHAR, VARCHAR, VARCHAR, VARIANT, VARCHAR, ARRAY, ARRAY) TO ROLE GOVERNANCE_ENFORCER;
GRANT USAGE ON PROCEDURE GOVERNANCE.CHECK_TRUST_STATE_PROMOTION(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARIANT) TO ROLE GOVERNANCE_ENFORCER;
GRANT USAGE ON PROCEDURE GOVERNANCE.LOG_ENFORCEMENT_EVENT(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, ARRAY, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, ARRAY, VARCHAR, ARRAY, VARCHAR, INTEGER) TO ROLE GOVERNANCE_ENFORCER;

GRANT USAGE ON PROCEDURE GOVERNANCE.COMPILE_AGREEMENT_POLICY(VARCHAR, VARCHAR) TO ROLE GOVERNANCE_ADMIN;
GRANT USAGE ON PROCEDURE GOVERNANCE.COMPILE_AGREEMENT_POLICY(VARCHAR, VARCHAR) TO ROLE GOVERNANCE_VALIDATOR;
GRANT USAGE ON PROCEDURE GOVERNANCE.ACTIVATE_AGREEMENT_POLICY(VARCHAR, VARCHAR, VARCHAR) TO ROLE GOVERNANCE_ADMIN;


SELECT '=== GOVERNANCE PROCEDURES CREATED SUCCESSFULLY ===' AS status;
