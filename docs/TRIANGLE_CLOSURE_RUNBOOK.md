# PRISM Triangle Closure Runbook

## Purpose

This runbook provides the exact specifications, role definitions, test configurations, and acceptance criteria required to close the SSO-DULA-Snowflake governance triangle. Completion of this runbook demonstrates that PRISM enforces agreement-governed, identity-attributed, audit-logged data access.

**Triangle Definition:** The intersection of:
1. **Identity** - Authenticated user with attributable actions
2. **Authorization** - Agreement-governed access with policy enforcement
3. **Isolation** - Database-enforced data boundaries

---

## Part 1: Snowflake RBAC Role Hierarchy

### 1.1 Governance Roles (System)

These roles manage the governance infrastructure itself.

```sql
-- =============================================================================
-- GOVERNANCE SYSTEM ROLES
-- =============================================================================

-- Top-level governance administrator
CREATE ROLE IF NOT EXISTS PRISM_GOVERNANCE_ADMIN;
COMMENT ON ROLE PRISM_GOVERNANCE_ADMIN IS 'Manages agreement registry, policy compilation, and governance configuration';

-- Policy validator - reviews and approves compiled policies
CREATE ROLE IF NOT EXISTS PRISM_POLICY_VALIDATOR;
COMMENT ON ROLE PRISM_POLICY_VALIDATOR IS 'Reviews and validates compiled agreement policies before activation';

-- Enforcement engine - executes policy checks (service account)
CREATE ROLE IF NOT EXISTS PRISM_ENFORCER;
COMMENT ON ROLE PRISM_ENFORCER IS 'Service role for policy enforcement procedures';

-- Audit reader - read-only access to enforcement logs
CREATE ROLE IF NOT EXISTS PRISM_AUDIT_READER;
COMMENT ON ROLE PRISM_AUDIT_READER IS 'Read-only access to audit and enforcement logs';

-- Role hierarchy
GRANT ROLE PRISM_POLICY_VALIDATOR TO ROLE PRISM_GOVERNANCE_ADMIN;
GRANT ROLE PRISM_AUDIT_READER TO ROLE PRISM_GOVERNANCE_ADMIN;
GRANT ROLE PRISM_AUDIT_READER TO ROLE PRISM_POLICY_VALIDATOR;
```

### 1.2 Business Roles (Secretariat Level)

```sql
-- =============================================================================
-- SECRETARIAT-LEVEL ROLES
-- =============================================================================

-- EOTSS Executive - can view all EOTSS agencies, promote to EXECUTIVE
CREATE ROLE IF NOT EXISTS EOTSS_EXECUTIVE;
COMMENT ON ROLE EOTSS_EXECUTIVE IS 'EOTSS executive with cross-agency visibility and EXECUTIVE promotion rights';

-- EOTSS FinOps Analyst - EOTSS-wide analysis, promote to CLIENT
CREATE ROLE IF NOT EXISTS EOTSS_FINOPS_ANALYST;
COMMENT ON ROLE EOTSS_FINOPS_ANALYST IS 'EOTSS analyst with secretariat-wide data access';

-- EOTSS Viewer - read-only EOTSS dashboards
CREATE ROLE IF NOT EXISTS EOTSS_VIEWER;
COMMENT ON ROLE EOTSS_VIEWER IS 'Read-only access to EOTSS dashboards and reports';

-- Role hierarchy
GRANT ROLE EOTSS_FINOPS_ANALYST TO ROLE EOTSS_EXECUTIVE;
GRANT ROLE EOTSS_VIEWER TO ROLE EOTSS_FINOPS_ANALYST;
```

### 1.3 Business Roles (Agency Level)

```sql
-- =============================================================================
-- AGENCY-LEVEL ROLES (Template - repeat for each agency)
-- =============================================================================

-- Pattern: AGENCY_<CODE>_<LEVEL>
-- Levels: ADMIN, ANALYST, VIEWER

-- Example: ITD (Information Technology Division)
CREATE ROLE IF NOT EXISTS AGENCY_ITD_ADMIN;
CREATE ROLE IF NOT EXISTS AGENCY_ITD_ANALYST;
CREATE ROLE IF NOT EXISTS AGENCY_ITD_VIEWER;

GRANT ROLE AGENCY_ITD_ANALYST TO ROLE AGENCY_ITD_ADMIN;
GRANT ROLE AGENCY_ITD_VIEWER TO ROLE AGENCY_ITD_ANALYST;

-- Example: MassIT
CREATE ROLE IF NOT EXISTS AGENCY_MASSIT_ADMIN;
CREATE ROLE IF NOT EXISTS AGENCY_MASSIT_ANALYST;
CREATE ROLE IF NOT EXISTS AGENCY_MASSIT_VIEWER;

GRANT ROLE AGENCY_MASSIT_ANALYST TO ROLE AGENCY_MASSIT_ADMIN;
GRANT ROLE AGENCY_MASSIT_VIEWER TO ROLE AGENCY_MASSIT_ANALYST;

-- Example: DPH (Department of Public Health)
CREATE ROLE IF NOT EXISTS AGENCY_DPH_ADMIN;
CREATE ROLE IF NOT EXISTS AGENCY_DPH_ANALYST;
CREATE ROLE IF NOT EXISTS AGENCY_DPH_VIEWER;

GRANT ROLE AGENCY_DPH_ANALYST TO ROLE AGENCY_DPH_ADMIN;
GRANT ROLE AGENCY_DPH_VIEWER TO ROLE AGENCY_DPH_ANALYST;
```

### 1.4 Role Permissions Matrix

| Role | Read Own Agency | Read Secretariat | Read Cross-Agency | Promote to INTERNAL | Promote to CLIENT | Promote to EXECUTIVE | Manage Agreements |
|------|-----------------|------------------|-------------------|---------------------|-------------------|----------------------|-------------------|
| AGENCY_*_VIEWER | Yes | No | No | No | No | No | No |
| AGENCY_*_ANALYST | Yes | No | No | Yes | No | No | No |
| AGENCY_*_ADMIN | Yes | No | No | Yes | Yes | No | No |
| EOTSS_VIEWER | Yes (all EOTSS) | Yes | No | No | No | No | No |
| EOTSS_FINOPS_ANALYST | Yes (all EOTSS) | Yes | Agreement-gated | Yes | Yes | No | No |
| EOTSS_EXECUTIVE | Yes (all EOTSS) | Yes | Agreement-gated | Yes | Yes | Yes | No |
| PRISM_GOVERNANCE_ADMIN | Via role grants | Via role grants | Via role grants | N/A | N/A | N/A | Yes |

---

## Part 2: SSO Identity Mapping

### 2.1 Required IdP Claims

The SSO provider (SAML/OIDC) must include these claims in the token:

```json
{
  "sub": "unique-user-id-from-idp",
  "email": "user@mass.gov",
  "name": "Jane Smith",
  "given_name": "Jane",
  "family_name": "Smith",

  // Custom claims (required for PRISM)
  "prism_agency_id": "ITD",
  "prism_secretariat_id": "EOTSS",
  "prism_role": "ANALYST",
  "prism_groups": ["EOTSS_FINOPS", "ITD_STAFF"]
}
```

### 2.2 Claim to Role Mapping Rules

```typescript
// =============================================================================
// PRISM Role Resolution Logic
// =============================================================================

interface IdPClaims {
  sub: string;
  email: string;
  prism_agency_id: string;
  prism_secretariat_id: string;
  prism_role: 'VIEWER' | 'ANALYST' | 'ADMIN' | 'EXECUTIVE';
  prism_groups: string[];
}

interface ResolvedContext {
  userId: string;
  email: string;
  agencyId: string;
  secretariatId: string;
  prismRole: string;           // Application role
  snowflakeRole: string;       // Snowflake role to assume
  canPromoteToExecutive: boolean;
}

function resolveUserContext(claims: IdPClaims): ResolvedContext {
  const { prism_agency_id, prism_secretariat_id, prism_role, prism_groups } = claims;

  // Determine if user has secretariat-level access
  const isSecretariatLevel = prism_groups.includes(`${prism_secretariat_id}_FINOPS`) ||
                             prism_groups.includes(`${prism_secretariat_id}_EXEC`);

  // Resolve Snowflake role
  let snowflakeRole: string;

  if (isSecretariatLevel && prism_role === 'EXECUTIVE') {
    snowflakeRole = `${prism_secretariat_id}_EXECUTIVE`;
  } else if (isSecretariatLevel && prism_role === 'ANALYST') {
    snowflakeRole = `${prism_secretariat_id}_FINOPS_ANALYST`;
  } else if (isSecretariatLevel) {
    snowflakeRole = `${prism_secretariat_id}_VIEWER`;
  } else {
    // Agency-level role
    snowflakeRole = `AGENCY_${prism_agency_id}_${prism_role}`;
  }

  return {
    userId: claims.sub,
    email: claims.email,
    agencyId: prism_agency_id,
    secretariatId: prism_secretariat_id,
    prismRole: prism_role,
    snowflakeRole,
    canPromoteToExecutive: prism_role === 'EXECUTIVE'
  };
}
```

### 2.3 Snowflake Session Configuration

```sql
-- =============================================================================
-- Session setup procedure (called on every authenticated request)
-- =============================================================================

CREATE OR REPLACE PROCEDURE GOVERNANCE.SETUP_USER_SESSION(
    p_user_id VARCHAR,
    p_email VARCHAR,
    p_agency_id VARCHAR,
    p_secretariat_id VARCHAR,
    p_snowflake_role VARCHAR
)
RETURNS OBJECT
LANGUAGE SQL
AS
$$
DECLARE
    v_result OBJECT;
BEGIN
    -- Set session context variables for RLS policies
    ALTER SESSION SET
        PRISM_USER_ID = p_user_id,
        PRISM_USER_EMAIL = p_email,
        PRISM_AGENCY_ID = p_agency_id,
        PRISM_SECRETARIAT_ID = p_secretariat_id;

    -- Use the resolved role
    USE ROLE IDENTIFIER(p_snowflake_role);

    -- Log session establishment
    INSERT INTO GOVERNANCE.SESSION_LOG (
        session_id, user_id, email, agency_id, secretariat_id,
        snowflake_role, established_at
    ) VALUES (
        CURRENT_SESSION(), p_user_id, p_email, p_agency_id, p_secretariat_id,
        p_snowflake_role, CURRENT_TIMESTAMP()
    );

    v_result := OBJECT_CONSTRUCT(
        'session_id', CURRENT_SESSION(),
        'role', p_snowflake_role,
        'agency_id', p_agency_id,
        'established', TRUE
    );

    RETURN v_result;
END;
$$;
```

---

## Part 3: Row-Level Security Implementation

### 3.1 Row Access Policy Definition

```sql
-- =============================================================================
-- ROW ACCESS POLICY: Agency Isolation
-- =============================================================================

CREATE OR REPLACE ROW ACCESS POLICY GOVERNANCE.AGENCY_ISOLATION_POLICY
AS (agency_id VARCHAR) RETURNS BOOLEAN ->
    -- Governance admins see all (for maintenance)
    CURRENT_ROLE() IN ('PRISM_GOVERNANCE_ADMIN', 'ACCOUNTADMIN')
    OR
    -- Secretariat executives see all agencies in their secretariat
    (
        CURRENT_ROLE() LIKE '%_EXECUTIVE'
        AND EXISTS (
            SELECT 1 FROM GOVERNANCE.SECRETARIAT_AGENCIES sa
            WHERE sa.secretariat_id = GETVARIABLE('PRISM_SECRETARIAT_ID')
            AND sa.agency_id = agency_id
        )
    )
    OR
    -- Secretariat analysts see all agencies in their secretariat
    (
        CURRENT_ROLE() LIKE '%_FINOPS_ANALYST'
        AND EXISTS (
            SELECT 1 FROM GOVERNANCE.SECRETARIAT_AGENCIES sa
            WHERE sa.secretariat_id = GETVARIABLE('PRISM_SECRETARIAT_ID')
            AND sa.agency_id = agency_id
        )
    )
    OR
    -- Agency users see only their agency
    (
        CURRENT_ROLE() LIKE 'AGENCY_%'
        AND agency_id = GETVARIABLE('PRISM_AGENCY_ID')
    );

-- =============================================================================
-- Apply policy to all spending tables
-- =============================================================================

ALTER TABLE ANALYTICS.AGENCY_SPENDING
    ADD ROW ACCESS POLICY GOVERNANCE.AGENCY_ISOLATION_POLICY ON (agency_id);

ALTER TABLE ANALYTICS.SPENDING_BY_CATEGORY
    ADD ROW ACCESS POLICY GOVERNANCE.AGENCY_ISOLATION_POLICY ON (agency_id);

ALTER TABLE ANALYTICS.VENDOR_SPEND
    ADD ROW ACCESS POLICY GOVERNANCE.AGENCY_ISOLATION_POLICY ON (agency_id);

ALTER TABLE ANALYTICS.CONTRACT_UTILIZATION
    ADD ROW ACCESS POLICY GOVERNANCE.AGENCY_ISOLATION_POLICY ON (agency_id);
```

### 3.2 Secretariat-Agency Mapping Table

```sql
-- =============================================================================
-- Reference table for secretariat membership
-- =============================================================================

CREATE TABLE IF NOT EXISTS GOVERNANCE.SECRETARIAT_AGENCIES (
    secretariat_id VARCHAR(50) NOT NULL,
    agency_id VARCHAR(50) NOT NULL,
    agency_name VARCHAR(255),
    joined_date DATE DEFAULT CURRENT_DATE(),
    PRIMARY KEY (secretariat_id, agency_id)
);

-- Seed EOTSS agencies
INSERT INTO GOVERNANCE.SECRETARIAT_AGENCIES (secretariat_id, agency_id, agency_name) VALUES
    ('EOTSS', 'ITD', 'Information Technology Division'),
    ('EOTSS', 'MASSIT', 'MassIT'),
    ('EOTSS', 'CYBER', 'Cybersecurity'),
    ('EOTSS', 'CIO', 'Office of the CIO');

-- Seed HHS agencies
INSERT INTO GOVERNANCE.SECRETARIAT_AGENCIES (secretariat_id, agency_id, agency_name) VALUES
    ('HHS', 'DPH', 'Department of Public Health'),
    ('HHS', 'DCFS', 'Department of Children and Family Services'),
    ('HHS', 'DMH', 'Department of Mental Health'),
    ('HHS', 'EOHHS', 'Executive Office of Health and Human Services');
```

---

## Part 4: Pilot Test Users

### 4.1 Test User Matrix

| User ID | Name | Email | Agency | Secretariat | Role | Snowflake Role | Purpose |
|---------|------|-------|--------|-------------|------|----------------|---------|
| test-eotss-exec | Alex Director | alex.director@mass.gov | EOTSS | EOTSS | EXECUTIVE | EOTSS_EXECUTIVE | Scenario C testing |
| test-eotss-analyst | Jordan Analyst | jordan.analyst@mass.gov | EOTSS | EOTSS | ANALYST | EOTSS_FINOPS_ANALYST | Scenario A, B testing |
| test-itd-analyst | Morgan Analyst | morgan.analyst@mass.gov | ITD | EOTSS | ANALYST | AGENCY_ITD_ANALYST | Scenario A, B testing |
| test-massit-analyst | Casey Analyst | casey.analyst@mass.gov | MASSIT | EOTSS | ANALYST | AGENCY_MASSIT_ANALYST | Cross-agency denial testing |
| test-dph-analyst | Riley Analyst | riley.analyst@mass.gov | DPH | HHS | ANALYST | AGENCY_DPH_ANALYST | Cross-secretariat testing |

### 4.2 Test User Setup SQL

```sql
-- =============================================================================
-- Create test users in Snowflake (for development/testing)
-- =============================================================================

-- Note: In production, users are created via SSO provisioning
-- These are for local testing only

CREATE USER IF NOT EXISTS TEST_EOTSS_EXEC
    PASSWORD = 'TestPassword123!'
    DEFAULT_ROLE = EOTSS_EXECUTIVE
    MUST_CHANGE_PASSWORD = FALSE;
GRANT ROLE EOTSS_EXECUTIVE TO USER TEST_EOTSS_EXEC;

CREATE USER IF NOT EXISTS TEST_EOTSS_ANALYST
    PASSWORD = 'TestPassword123!'
    DEFAULT_ROLE = EOTSS_FINOPS_ANALYST
    MUST_CHANGE_PASSWORD = FALSE;
GRANT ROLE EOTSS_FINOPS_ANALYST TO USER TEST_EOTSS_ANALYST;

CREATE USER IF NOT EXISTS TEST_ITD_ANALYST
    PASSWORD = 'TestPassword123!'
    DEFAULT_ROLE = AGENCY_ITD_ANALYST
    MUST_CHANGE_PASSWORD = FALSE;
GRANT ROLE AGENCY_ITD_ANALYST TO USER TEST_ITD_ANALYST;

CREATE USER IF NOT EXISTS TEST_MASSIT_ANALYST
    PASSWORD = 'TestPassword123!'
    DEFAULT_ROLE = AGENCY_MASSIT_ANALYST
    MUST_CHANGE_PASSWORD = FALSE;
GRANT ROLE AGENCY_MASSIT_ANALYST TO USER TEST_MASSIT_ANALYST;

CREATE USER IF NOT EXISTS TEST_DPH_ANALYST
    PASSWORD = 'TestPassword123!'
    DEFAULT_ROLE = AGENCY_DPH_ANALYST
    MUST_CHANGE_PASSWORD = FALSE;
GRANT ROLE AGENCY_DPH_ANALYST TO USER TEST_DPH_ANALYST;
```

---

## Part 5: Pilot DULA Specification

### 5.1 DULA: EOTSS Enterprise Data Use and License Agreement

```sql
-- =============================================================================
-- Insert pilot executed DULA
-- =============================================================================

INSERT INTO GOVERNANCE.AGREEMENTS (
    agreement_id,
    title,
    agreement_type,
    status,
    provider_org_id,
    provider_org_name,
    consumer_org_id,
    consumer_org_name,
    effective_date,
    expiration_date,
    version,
    executed_by,
    executed_at
) VALUES (
    'DULA-EOTSS-2024-001',
    'EOTSS Enterprise Data Use and License Agreement',
    'DULA',
    'EXECUTED',
    'COMMONWEALTH',
    'Commonwealth of Massachusetts',
    'EOTSS',
    'Executive Office of Technology Services and Security',
    '2024-01-01',
    '2027-01-01',
    '1.0',
    'CIO_OFFICE',
    '2024-01-01 09:00:00'
);

-- =============================================================================
-- Insert agreement clauses with policy_json
-- =============================================================================

-- Clause 1: Purpose Restrictions
INSERT INTO GOVERNANCE.AGREEMENT_CLAUSES (
    clause_id,
    agreement_id,
    clause_number,
    clause_type,
    title,
    clause_text,
    policy_json
) VALUES (
    'DULA-EOTSS-2024-001-C01',
    'DULA-EOTSS-2024-001',
    '3.1',
    'PURPOSE_RESTRICTION',
    'Permitted Purposes',
    'Data may be used solely for: (a) operational efficiency analysis, (b) budget planning and forecasting, (c) vendor performance evaluation, (d) executive reporting to state leadership. Any other use requires written amendment.',
    '{
        "allowed_purposes": ["OPERATIONAL_ANALYSIS", "BUDGET_PLANNING", "VENDOR_EVALUATION", "EXECUTIVE_REPORTING"],
        "prohibited_purposes": ["COMMERCIAL_RESALE", "INDIVIDUAL_PROFILING", "LAW_ENFORCEMENT"],
        "requires_amendment_for": ["RESEARCH", "THIRD_PARTY_SHARING"]
    }'
);

-- Clause 2: Data Domain Access
INSERT INTO GOVERNANCE.AGREEMENT_CLAUSES (
    clause_id,
    agreement_id,
    clause_number,
    clause_type,
    title,
    clause_text,
    policy_json
) VALUES (
    'DULA-EOTSS-2024-001-C02',
    'DULA-EOTSS-2024-001',
    '4.1',
    'DATA_DOMAIN',
    'Authorized Data Domains',
    'Consumer is authorized to access the following data domains: (a) IT Spending, (b) Cloud Costs, (c) Vendor Contracts, (d) Budget Allocations. Access to Personnel data, Procurement-sensitive data, and Security incident data is prohibited without supplemental agreement.',
    '{
        "allowed_domains": ["IT_SPENDING", "CLOUD_COSTS", "VENDOR_CONTRACTS", "BUDGET_ALLOCATIONS"],
        "prohibited_domains": ["PERSONNEL", "PROCUREMENT_SENSITIVE", "SECURITY_INCIDENTS"],
        "supplemental_required": ["HR_ANALYTICS", "SECURITY_POSTURE"]
    }'
);

-- Clause 3: Cross-Agency Sharing
INSERT INTO GOVERNANCE.AGREEMENT_CLAUSES (
    clause_id,
    agreement_id,
    clause_number,
    clause_type,
    title,
    clause_text,
    policy_json
) VALUES (
    'DULA-EOTSS-2024-001-C03',
    'DULA-EOTSS-2024-001',
    '5.1',
    'CROSS_AGENCY',
    'Cross-Agency Data Sharing',
    'Agencies within EOTSS secretariat may share aggregated, non-identifying spending data for benchmarking purposes. Line-item or vendor-specific data sharing between agencies requires explicit data sharing agreement between agencies. Cross-secretariat sharing is prohibited without Commonwealth-level approval.',
    '{
        "intra_secretariat": {
            "allowed": true,
            "aggregation_required": true,
            "line_item_requires_dsa": true
        },
        "cross_secretariat": {
            "allowed": false,
            "requires": "COMMONWEALTH_APPROVAL"
        }
    }'
);

-- Clause 4: AI Processing
INSERT INTO GOVERNANCE.AGREEMENT_CLAUSES (
    clause_id,
    agreement_id,
    clause_number,
    clause_type,
    title,
    clause_text,
    policy_json
) VALUES (
    'DULA-EOTSS-2024-001-C04',
    'DULA-EOTSS-2024-001',
    '6.1',
    'AI_PROCESSING',
    'AI and Machine Learning Processing',
    'AI-assisted analysis is permitted for trend identification, anomaly detection, and narrative generation. All AI-generated content must be clearly labeled. Promotion of AI-generated content to EXECUTIVE trust state requires human review and approval. AI models may not be trained on raw data without separate ML agreement.',
    '{
        "ai_allowed": true,
        "allowed_ai_uses": ["TREND_ANALYSIS", "ANOMALY_DETECTION", "NARRATIVE_GENERATION", "FORECASTING"],
        "prohibited_ai_uses": ["MODEL_TRAINING", "AUTOMATED_DECISIONS"],
        "trust_state_ceiling": "CLIENT",
        "executive_requires_human_review": true,
        "labeling_required": true
    }'
);

-- Clause 5: PII/PHI Protections
INSERT INTO GOVERNANCE.AGREEMENT_CLAUSES (
    clause_id,
    agreement_id,
    clause_number,
    clause_type,
    title,
    clause_text,
    policy_json
) VALUES (
    'DULA-EOTSS-2024-001-C05',
    'DULA-EOTSS-2024-001',
    '7.1',
    'DATA_PROTECTION',
    'Personally Identifiable Information',
    'No PII shall be processed through PRISM without explicit consent and supplemental privacy agreement. System must detect and redact potential PII before AI processing. PHI is categorically prohibited.',
    '{
        "pii_allowed": false,
        "phi_allowed": false,
        "detection_required": true,
        "redaction_required": true,
        "supplemental_for_pii": "PRIVACY_AGREEMENT"
    }'
);

-- Clause 6: Audit Requirements
INSERT INTO GOVERNANCE.AGREEMENT_CLAUSES (
    clause_id,
    agreement_id,
    clause_number,
    clause_type,
    title,
    clause_text,
    policy_json
) VALUES (
    'DULA-EOTSS-2024-001-C06',
    'DULA-EOTSS-2024-001',
    '8.1',
    'AUDIT',
    'Audit and Logging Requirements',
    'All data access must be logged with user identity, timestamp, query context, and purpose declaration. Logs must be retained for 7 years minimum. Provider reserves right to audit Consumer access patterns quarterly.',
    '{
        "logging_required": true,
        "log_fields": ["user_id", "timestamp", "query_hash", "purpose", "agency_id", "data_domains_accessed"],
        "retention_years": 7,
        "audit_frequency": "QUARTERLY",
        "audit_access": "PROVIDER"
    }'
);

-- =============================================================================
-- Compile the agreement policy
-- =============================================================================

CALL GOVERNANCE.COMPILE_AGREEMENT_POLICY('DULA-EOTSS-2024-001');
```

---

## Part 6: Acceptance Criteria (Sign-off Ready)

### 6.1 Scenario A: Allowed Use with Agency Isolation

**Test ID:** TRIANGLE-A-001

**Preconditions:**
- User `test-itd-analyst` authenticated via SSO
- DULA `DULA-EOTSS-2024-001` is active
- Session context set with `agency_id = 'ITD'`

**Test Steps:**
1. User asks: "Show me our monthly IT spending trend for Q1 2024"
2. System resolves applicable agreement
3. System validates request against policy
4. System executes query with RLS active
5. System generates response
6. System validates response
7. System logs enforcement decision

**Expected Results:**

| Check | Expected Value |
|-------|----------------|
| Agreement resolved | DULA-EOTSS-2024-001 |
| Policy version | 1.0 |
| Pre-query decision | ALLOWED |
| Data returned | ITD data only (verify no MASSIT, no DPH) |
| Response includes | Trend chart, narrative |
| Clause citations | 3.1 (purpose), 4.1 (domain) |
| Enforcement log entry | Created with all fields |

**Verification SQL:**
```sql
-- Verify RLS is working
SELECT DISTINCT agency_id
FROM ANALYTICS.AGENCY_SPENDING
WHERE fiscal_year = 2024 AND fiscal_quarter = 1;
-- Expected: Only 'ITD'

-- Verify enforcement log
SELECT * FROM GOVERNANCE.POLICY_ENFORCEMENT_LOG
WHERE session_id = CURRENT_SESSION()
ORDER BY enforced_at DESC
LIMIT 1;
-- Expected: decision='ALLOWED', agreement_id='DULA-EOTSS-2024-001'
```

**Sign-off:** [ ] Security [ ] Legal [ ] Product

---

### 6.2 Scenario B: Blocked Cross-Agency Request

**Test ID:** TRIANGLE-B-001

**Preconditions:**
- User `test-itd-analyst` authenticated via SSO
- DULA `DULA-EOTSS-2024-001` is active
- Session context set with `agency_id = 'ITD'`

**Test Steps:**
1. User asks: "Compare ITD spending to MassIT spending"
2. System resolves applicable agreement
3. System validates request against policy
4. System detects cross-agency access attempt
5. System blocks request with explanation
6. System logs enforcement decision with clause citation

**Expected Results:**

| Check | Expected Value |
|-------|----------------|
| Agreement resolved | DULA-EOTSS-2024-001 |
| Pre-query decision | DENIED |
| Denial reason | Cross-agency line-item access requires DSA |
| Clause cited | 5.1 (Cross-Agency Data Sharing) |
| UI shows | Denial explanation + "Request Amendment" option |
| Enforcement log | decision='DENIED', violated_clause='DULA-EOTSS-2024-001-C03' |
| Data returned | None |

**Verification SQL:**
```sql
-- Verify enforcement log shows denial
SELECT
    decision,
    agreement_id,
    violated_clause,
    denial_reason
FROM GOVERNANCE.POLICY_ENFORCEMENT_LOG
WHERE session_id = CURRENT_SESSION()
AND decision = 'DENIED'
ORDER BY enforced_at DESC
LIMIT 1;
-- Expected: decision='DENIED', violated_clause contains 'C03'
```

**Sign-off:** [ ] Security [ ] Legal [ ] Product

---

### 6.3 Scenario C: Executive Promotion with Human-in-the-Loop

**Test ID:** TRIANGLE-C-001

**Preconditions:**
- User `test-eotss-analyst` authenticated via SSO
- DULA `DULA-EOTSS-2024-001` is active
- Existing narrative at CLIENT trust state

**Test Steps:**
1. Analyst requests promotion of narrative to EXECUTIVE
2. System checks trust state promotion rules
3. System identifies DULA requires human review for EXECUTIVE
4. System blocks automatic promotion
5. System notifies required approvers
6. Executive approves
7. System promotes to EXECUTIVE
8. System logs with approver attribution

**Expected Results:**

| Check | Expected Value |
|-------|----------------|
| Initial promotion attempt | BLOCKED |
| Block reason | Clause 6.1 requires human review |
| Required approver role | EOTSS_EXECUTIVE or PRISM_GOVERNANCE_ADMIN |
| After approval | Trust state = EXECUTIVE |
| Enforcement log (block) | decision='GATED', gate_type='HUMAN_REVIEW' |
| Enforcement log (approval) | decision='APPROVED', approver_id=<exec user> |

**Verification SQL:**
```sql
-- Verify gate was enforced
SELECT * FROM GOVERNANCE.POLICY_ENFORCEMENT_LOG
WHERE request_type = 'TRUST_STATE_PROMOTION'
AND target_state = 'EXECUTIVE'
ORDER BY enforced_at DESC;
-- Expected: First entry shows GATED, subsequent shows APPROVED with approver

-- Verify narrative trust state
SELECT trust_state, promoted_by, promoted_at
FROM ANALYTICS.NARRATIVES
WHERE narrative_id = '<test_narrative_id>';
-- Expected: trust_state='EXECUTIVE', promoted_by=<executive user>
```

**Sign-off:** [ ] Security [ ] Legal [ ] Product

---

## Part 7: Exit Criteria Checklist

### 7.1 Identity Triangle (SSO)

| # | Criterion | Verified | Date | Verifier |
|---|-----------|----------|------|----------|
| 1 | SSO authentication working with state IdP | [ ] | | |
| 2 | IdP claims include all required fields | [ ] | | |
| 3 | Claims map correctly to PRISM roles | [ ] | | |
| 4 | PRISM roles map correctly to Snowflake roles | [ ] | | |
| 5 | Session context variables set on each request | [ ] | | |
| 6 | No manual role selection possible (except admin) | [ ] | | |
| 7 | Session log captures all authentications | [ ] | | |

### 7.2 Authorization Triangle (DULA)

| # | Criterion | Verified | Date | Verifier |
|---|-----------|----------|------|----------|
| 1 | DULA loaded in GOVERNANCE.AGREEMENTS | [ ] | | |
| 2 | All clauses loaded with policy_json | [ ] | | |
| 3 | COMPILE_AGREEMENT_POLICY succeeds | [ ] | | |
| 4 | GET_EFFECTIVE_POLICY returns complete policy | [ ] | | |
| 5 | VALIDATE_REQUEST_PRE_QUERY executes on every request | [ ] | | |
| 6 | VALIDATE_RESPONSE_POST_GENERATION executes on every response | [ ] | | |
| 7 | CHECK_TRUST_STATE_PROMOTION enforces HITL | [ ] | | |
| 8 | All enforcement decisions logged with clause citations | [ ] | | |

### 7.3 Isolation Triangle (RLS)

| # | Criterion | Verified | Date | Verifier |
|---|-----------|----------|------|----------|
| 1 | Row access policy created and active | [ ] | | |
| 2 | Policy applied to all ANALYTICS tables | [ ] | | |
| 3 | Agency users see only their agency data | [ ] | | |
| 4 | Secretariat users see only their secretariat | [ ] | | |
| 5 | Cross-secretariat access blocked by RLS | [ ] | | |
| 6 | RLS cannot be bypassed by query manipulation | [ ] | | |
| 7 | RLS works with all query types (aggregate, detail, join) | [ ] | | |

### 7.4 Integration Proof

| # | Criterion | Verified | Date | Verifier |
|---|-----------|----------|------|----------|
| 1 | Scenario A passes all checks | [ ] | | |
| 2 | Scenario B passes all checks | [ ] | | |
| 3 | Scenario C passes all checks | [ ] | | |
| 4 | All three scenarios work in same session | [ ] | | |
| 5 | Audit log captures complete trail | [ ] | | |

---

## Part 8: Sign-Off Page

### Triangle Closure Declaration

We, the undersigned, have reviewed the test results and verify that the PRISM SSO-DULA-Snowflake governance triangle is closed. All acceptance criteria have been met.

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Security Lead | | | |
| Legal/Compliance | | | |
| Product Owner | | | |
| Technical Lead | | | |
| CIO/Executive Sponsor | | | |

### Attestations

- [ ] All test scenarios executed in production environment
- [ ] No critical or high security findings open
- [ ] Audit logs demonstrate complete attribution chain
- [ ] DULA enforcement is legally binding per legal review
- [ ] System meets state data protection requirements

---

*Document Version: 1.0*
*Last Updated: 2026-01-19*
*Classification: INTERNAL*
