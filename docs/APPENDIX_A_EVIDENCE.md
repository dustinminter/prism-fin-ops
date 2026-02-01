# Appendix A: Triangle Closure Evidence Package

**Document:** GA Sign-Off Memo Appendix A
**Version:** 1.0
**Collection Date:** _______________
**Collected By:** _______________

---

## Evidence Naming Convention

All evidence artifacts follow this naming pattern:

```
{section}_{subsection}_{descriptor}_{date}.{ext}

Examples:
A1_1_schemas_deployed_20260119.png
A2_2_persona_itd_analyst_login_20260119.png
A5_1_scenario_a_enforcement_log_20260119.sql
```

Artifacts are stored in: `/docs/evidence/`

---

## A1. Production Snowflake Environment Evidence

### A1.1 Schemas Deployed

**Requirement:** PRISM and GOVERNANCE schemas exist in production account.

**Evidence Artifact:** `A1_1_schemas_deployed_{date}.png`

**Verification Query:**
```sql
SHOW SCHEMAS IN DATABASE PRISM_PROD;
-- Expected: ANALYTICS, GOVERNANCE, PUBLIC
```

**Capture:**
- [ ] Screenshot of schema list
- [ ] SQL output saved

**Evidence Location:** `/docs/evidence/A1_1_schemas_deployed_{date}.png`

**Status:** [ ] NOT COLLECTED  [ ] COLLECTED  [ ] VERIFIED

**Notes:** _____________________________________________

---

### A1.2 RBAC Grants Export

**Requirement:** Role hierarchy matches Triangle Closure Runbook Part 1.

**Evidence Artifact:** `A1_2_rbac_grants_{date}.csv`

**Verification Query:**
```sql
-- Export role grants
SHOW GRANTS TO ROLE PRISM_GOVERNANCE_ADMIN;
SHOW GRANTS TO ROLE EOTSS_EXECUTIVE;
SHOW GRANTS TO ROLE EOTSS_FINOPS_ANALYST;
SHOW GRANTS TO ROLE AGENCY_ITD_ANALYST;
SHOW GRANTS TO ROLE AGENCY_MASSIT_ANALYST;
SHOW GRANTS TO ROLE AGENCY_DPH_ANALYST;

-- Export role hierarchy
SHOW GRANTS OF ROLE PRISM_GOVERNANCE_ADMIN;
SHOW GRANTS OF ROLE EOTSS_EXECUTIVE;
```

**Capture:**
- [ ] Role hierarchy diagram or export
- [ ] Grant listings for each role
- [ ] Confirmation no unexpected grants exist

**Evidence Location:** `/docs/evidence/A1_2_rbac_grants_{date}.csv`

**Status:** [ ] NOT COLLECTED  [ ] COLLECTED  [ ] VERIFIED

**Notes:** _____________________________________________

---

### A1.3 Audit Settings Proof

**Requirement:** ACCESS_HISTORY and query logging enabled.

**Evidence Artifact:** `A1_3_audit_settings_{date}.png`

**Verification Query:**
```sql
-- Check account parameters
SHOW PARAMETERS LIKE '%HISTORY%' IN ACCOUNT;
SHOW PARAMETERS LIKE '%AUDIT%' IN ACCOUNT;

-- Verify ACCESS_HISTORY is populated
SELECT COUNT(*) FROM SNOWFLAKE.ACCOUNT_USAGE.ACCESS_HISTORY
WHERE query_start_time > DATEADD(day, -1, CURRENT_TIMESTAMP());
```

**Capture:**
- [ ] Account parameter settings
- [ ] Proof ACCESS_HISTORY has recent entries
- [ ] POLICY_ENFORCEMENT_LOG table exists

**Evidence Location:** `/docs/evidence/A1_3_audit_settings_{date}.png`

**Status:** [ ] NOT COLLECTED  [ ] COLLECTED  [ ] VERIFIED

**Notes:** _____________________________________________

---

### A1.4 Cortex AI Enablement (If Applicable)

**Requirement:** Cortex AI functions available for PRISM use.

**Evidence Artifact:** `A1_4_cortex_enabled_{date}.png`

**Verification Query:**
```sql
-- Test Cortex availability
SELECT SNOWFLAKE.CORTEX.COMPLETE('mistral-large', 'Say hello');

-- Check Cortex functions exist
SHOW FUNCTIONS LIKE '%CORTEX%' IN ACCOUNT;
```

**Capture:**
- [ ] Cortex function test output
- [ ] Available model list
- [ ] Token/credit limits configured

**Evidence Location:** `/docs/evidence/A1_4_cortex_enabled_{date}.png`

**Status:** [ ] NOT COLLECTED  [ ] COLLECTED  [ ] N/A (not in GA scope)

**Notes:** _____________________________________________

---

## A2. SSO and Claim Mapping Evidence

### A2.1 IdP Claim Mapping Configuration

**Requirement:** IdP configured to emit required PRISM claims.

**Evidence Artifact:** `A2_1_idp_claim_mapping_{date}.pdf` (redacted)

**Required Claims:**
- [ ] `sub` (unique user ID)
- [ ] `email`
- [ ] `prism_agency_id`
- [ ] `prism_secretariat_id`
- [ ] `prism_role`
- [ ] `prism_groups`

**Capture:**
- [ ] IdP claim configuration (redacted screenshot)
- [ ] Mapping rules documentation

**Evidence Location:** `/docs/evidence/A2_1_idp_claim_mapping_{date}.pdf`

**Status:** [ ] NOT COLLECTED  [ ] COLLECTED  [ ] VERIFIED

**Notes:** _____________________________________________

---

### A2.2 Persona Login Proofs

**Requirement:** Each test persona authenticates and resolves to correct role.

#### Persona 1: EOTSS Executive (test-eotss-exec)

**Evidence Artifact:** `A2_2_persona_eotss_exec_{date}.png`

| Field | Expected | Actual |
|-------|----------|--------|
| User | test-eotss-exec | |
| Email | alex.director@mass.gov | |
| Agency ID | EOTSS | |
| Secretariat ID | EOTSS | |
| PRISM Role | EXECUTIVE | |
| Snowflake Role | EOTSS_EXECUTIVE | |

**Capture:**
- [ ] Login success screenshot
- [ ] PRISM role indicator visible
- [ ] No role selection UI available

**Status:** [ ] NOT COLLECTED  [ ] COLLECTED  [ ] VERIFIED

---

#### Persona 2: EOTSS Analyst (test-eotss-analyst)

**Evidence Artifact:** `A2_2_persona_eotss_analyst_{date}.png`

| Field | Expected | Actual |
|-------|----------|--------|
| User | test-eotss-analyst | |
| Email | jordan.analyst@mass.gov | |
| Agency ID | EOTSS | |
| Secretariat ID | EOTSS | |
| PRISM Role | ANALYST | |
| Snowflake Role | EOTSS_FINOPS_ANALYST | |

**Capture:**
- [ ] Login success screenshot
- [ ] PRISM role indicator visible

**Status:** [ ] NOT COLLECTED  [ ] COLLECTED  [ ] VERIFIED

---

#### Persona 3: ITD Analyst (test-itd-analyst)

**Evidence Artifact:** `A2_2_persona_itd_analyst_{date}.png`

| Field | Expected | Actual |
|-------|----------|--------|
| User | test-itd-analyst | |
| Email | morgan.analyst@mass.gov | |
| Agency ID | ITD | |
| Secretariat ID | EOTSS | |
| PRISM Role | ANALYST | |
| Snowflake Role | AGENCY_ITD_ANALYST | |

**Capture:**
- [ ] Login success screenshot
- [ ] Agency context visible in UI

**Status:** [ ] NOT COLLECTED  [ ] COLLECTED  [ ] VERIFIED

---

#### Persona 4: MassIT Analyst (test-massit-analyst)

**Evidence Artifact:** `A2_2_persona_massit_analyst_{date}.png`

| Field | Expected | Actual |
|-------|----------|--------|
| User | test-massit-analyst | |
| Email | casey.analyst@mass.gov | |
| Agency ID | MASSIT | |
| Secretariat ID | EOTSS | |
| PRISM Role | ANALYST | |
| Snowflake Role | AGENCY_MASSIT_ANALYST | |

**Capture:**
- [ ] Login success screenshot

**Status:** [ ] NOT COLLECTED  [ ] COLLECTED  [ ] VERIFIED

---

#### Persona 5: DPH Analyst (test-dph-analyst)

**Evidence Artifact:** `A2_2_persona_dph_analyst_{date}.png`

| Field | Expected | Actual |
|-------|----------|--------|
| User | test-dph-analyst | |
| Email | riley.analyst@mass.gov | |
| Agency ID | DPH | |
| Secretariat ID | HHS | |
| PRISM Role | ANALYST | |
| Snowflake Role | AGENCY_DPH_ANALYST | |

**Capture:**
- [ ] Login success screenshot
- [ ] Different secretariat confirmed

**Status:** [ ] NOT COLLECTED  [ ] COLLECTED  [ ] VERIFIED

---

### A2.3 Role Resolution Logs

**Requirement:** PRISM logs role resolution for each authentication.

**Evidence Artifact:** `A2_3_role_resolution_logs_{date}.json`

**Verification Query:**
```sql
SELECT * FROM GOVERNANCE.SESSION_LOG
WHERE established_at > DATEADD(hour, -1, CURRENT_TIMESTAMP())
ORDER BY established_at DESC;
```

**Capture:**
- [ ] Session log entries for all 5 personas
- [ ] Timestamps correlate with login times
- [ ] Snowflake roles match expected

**Evidence Location:** `/docs/evidence/A2_3_role_resolution_logs_{date}.json`

**Status:** [ ] NOT COLLECTED  [ ] COLLECTED  [ ] VERIFIED

**Notes:** _____________________________________________

---

## A3. Row-Level Security Evidence

### A3.1 RLS Policy Definition

**Requirement:** AGENCY_ISOLATION_POLICY exists and is applied.

**Evidence Artifact:** `A3_1_rls_policy_definition_{date}.sql`

**Verification Query:**
```sql
-- Show policy definition
DESCRIBE ROW ACCESS POLICY GOVERNANCE.AGENCY_ISOLATION_POLICY;

-- Show policy applications
SELECT * FROM INFORMATION_SCHEMA.ROW_ACCESS_POLICIES
WHERE policy_name = 'AGENCY_ISOLATION_POLICY';

-- Show tables with policy
SELECT * FROM INFORMATION_SCHEMA.POLICY_REFERENCES
WHERE policy_name = 'AGENCY_ISOLATION_POLICY';
```

**Capture:**
- [ ] Policy definition SQL
- [ ] List of tables with policy applied
- [ ] Confirmation all ANALYTICS tables covered

**Evidence Location:** `/docs/evidence/A3_1_rls_policy_definition_{date}.sql`

**Status:** [ ] NOT COLLECTED  [ ] COLLECTED  [ ] VERIFIED

**Notes:** _____________________________________________

---

### A3.2 RLS Verification Outputs

**Requirement:** Each role sees only authorized data.

#### Test: Agency User Isolation

**Evidence Artifact:** `A3_2_rls_agency_isolation_{date}.sql`

**As AGENCY_ITD_ANALYST:**
```sql
USE ROLE AGENCY_ITD_ANALYST;
SELECT DISTINCT agency_id FROM ANALYTICS.AGENCY_SPENDING;
-- Expected: Only 'ITD'
```

**Actual Output:**
```
agency_id
---------
(paste actual output here)
```

**Pass:** [ ] YES  [ ] NO

---

#### Test: Agency Cannot See Other Agency

**As AGENCY_ITD_ANALYST:**
```sql
USE ROLE AGENCY_ITD_ANALYST;
SELECT COUNT(*) FROM ANALYTICS.AGENCY_SPENDING WHERE agency_id = 'MASSIT';
-- Expected: 0
```

**Actual Output:** _______________

**Pass:** [ ] YES  [ ] NO

---

#### Test: Secretariat User Sees Secretariat

**Evidence Artifact:** `A3_2_rls_secretariat_scope_{date}.sql`

**As EOTSS_FINOPS_ANALYST:**
```sql
USE ROLE EOTSS_FINOPS_ANALYST;
SELECT DISTINCT agency_id FROM ANALYTICS.AGENCY_SPENDING;
-- Expected: ITD, MASSIT, CYBER, CIO (all EOTSS agencies)
```

**Actual Output:**
```
agency_id
---------
(paste actual output here)
```

**Pass:** [ ] YES  [ ] NO

---

#### Test: Cross-Secretariat Blocked

**As EOTSS_FINOPS_ANALYST:**
```sql
USE ROLE EOTSS_FINOPS_ANALYST;
SELECT COUNT(*) FROM ANALYTICS.AGENCY_SPENDING WHERE agency_id = 'DPH';
-- Expected: 0 (DPH is HHS, not EOTSS)
```

**Actual Output:** _______________

**Pass:** [ ] YES  [ ] NO

---

#### Test: Governance Admin Full Access

**As PRISM_GOVERNANCE_ADMIN:**
```sql
USE ROLE PRISM_GOVERNANCE_ADMIN;
SELECT DISTINCT agency_id FROM ANALYTICS.AGENCY_SPENDING;
-- Expected: All agencies (for maintenance)
```

**Actual Output:**
```
agency_id
---------
(paste actual output here)
```

**Pass:** [ ] YES  [ ] NO

**Status:** [ ] NOT COLLECTED  [ ] COLLECTED  [ ] VERIFIED

**Notes:** _____________________________________________

---

## A4. Executed DULA and Policy Compilation Evidence

### A4.1 Agreement Registry Record

**Requirement:** DULA-EOTSS-2024-001 exists in GOVERNANCE.AGREEMENTS.

**Evidence Artifact:** `A4_1_agreement_record_{date}.json`

**Verification Query:**
```sql
SELECT * FROM GOVERNANCE.AGREEMENTS
WHERE agreement_id = 'DULA-EOTSS-2024-001';
```

**Expected Fields:**
- [ ] agreement_id = 'DULA-EOTSS-2024-001'
- [ ] status = 'EXECUTED'
- [ ] effective_date <= CURRENT_DATE
- [ ] expiration_date > CURRENT_DATE
- [ ] executed_by is populated
- [ ] executed_at is populated

**Evidence Location:** `/docs/evidence/A4_1_agreement_record_{date}.json`

**Status:** [ ] NOT COLLECTED  [ ] COLLECTED  [ ] VERIFIED

**Notes:** _____________________________________________

---

### A4.2 Clause Records with policy_json

**Requirement:** All 6 clauses loaded with executable policy_json.

**Evidence Artifact:** `A4_2_clause_records_{date}.json`

**Verification Query:**
```sql
SELECT clause_id, clause_number, clause_type, title, policy_json
FROM GOVERNANCE.AGREEMENT_CLAUSES
WHERE agreement_id = 'DULA-EOTSS-2024-001'
ORDER BY clause_number;
```

**Expected Clauses:**

| Clause | Type | Has policy_json |
|--------|------|-----------------|
| 3.1 | PURPOSE_RESTRICTION | [ ] |
| 4.1 | DATA_DOMAIN | [ ] |
| 5.1 | CROSS_AGENCY | [ ] |
| 6.1 | AI_PROCESSING | [ ] |
| 7.1 | DATA_PROTECTION | [ ] |
| 8.1 | AUDIT | [ ] |

**Evidence Location:** `/docs/evidence/A4_2_clause_records_{date}.json`

**Status:** [ ] NOT COLLECTED  [ ] COLLECTED  [ ] VERIFIED

**Notes:** _____________________________________________

---

### A4.3 Compiled Policy Version

**Requirement:** Policy compiled and validated.

**Evidence Artifact:** `A4_3_compiled_policy_{date}.json`

**Verification Query:**
```sql
SELECT * FROM GOVERNANCE.COMPILED_POLICIES
WHERE agreement_id = 'DULA-EOTSS-2024-001'
AND status = 'ACTIVE';
```

**Expected:**
- [ ] Compiled policy record exists
- [ ] policy_version is populated
- [ ] compiled_by is populated
- [ ] validated_by is populated
- [ ] status = 'ACTIVE'

**Evidence Location:** `/docs/evidence/A4_3_compiled_policy_{date}.json`

**Status:** [ ] NOT COLLECTED  [ ] COLLECTED  [ ] VERIFIED

**Notes:** _____________________________________________

---

### A4.4 Agreement Search Citations

**Requirement:** PRISM can find and cite agreement clauses.

**Evidence Artifact:** `A4_4_search_citations_{date}.png`

**Test:**
1. In PRISM, ask: "What does our agreement say about AI processing?"
2. System should cite Clause 6.1 with relevant text

**Capture:**
- [ ] Screenshot of question
- [ ] Screenshot of response with clause citation
- [ ] Correct clause number and text shown

**Evidence Location:** `/docs/evidence/A4_4_search_citations_{date}.png`

**Status:** [ ] NOT COLLECTED  [ ] COLLECTED  [ ] VERIFIED

**Notes:** _____________________________________________

---

## A5. Proof Scenarios Evidence

### A5.1 Scenario A: Allowed Use with Agency Isolation

**Test ID:** TRIANGLE-A-001
**Persona:** test-itd-analyst (AGENCY_ITD_ANALYST)

#### A5.1.1 PRISM UI Evidence

**Evidence Artifact:** `A5_1_scenario_a_prism_ui_{date}.png`

**Prompt:** "Show me our monthly IT spending trend for Q1 2024"

**Capture:**
- [ ] Screenshot of prompt input
- [ ] Screenshot of response with data visualization
- [ ] Governance indicator shows agreement badge
- [ ] Trust state visible
- [ ] Clause citations visible (if applicable)

**Evidence Location:** `/docs/evidence/A5_1_scenario_a_prism_ui_{date}.png`

---

#### A5.1.2 Snowflake Enforcement Log

**Evidence Artifact:** `A5_1_scenario_a_enforcement_log_{date}.json`

**Verification Query:**
```sql
SELECT
    log_id,
    request_id,
    user_id,
    agency_id,
    request_type,
    agreement_id,
    policy_version,
    decision,
    enforced_at
FROM GOVERNANCE.POLICY_ENFORCEMENT_LOG
WHERE user_id = 'test-itd-analyst'
AND decision = 'ALLOWED'
ORDER BY enforced_at DESC
LIMIT 1;
```

**Expected Values:**
- [ ] agreement_id = 'DULA-EOTSS-2024-001'
- [ ] decision = 'ALLOWED'
- [ ] agency_id = 'ITD'

**Actual Output:**
```json
(paste actual JSON here)
```

**Evidence Location:** `/docs/evidence/A5_1_scenario_a_enforcement_log_{date}.json`

---

#### A5.1.3 Data Isolation Verification

**Evidence Artifact:** `A5_1_scenario_a_data_isolation_{date}.sql`

**Verification:** Confirm response only contains ITD data

```sql
-- Check what agencies were accessed in the query
SELECT DISTINCT agency_id
FROM ANALYTICS.AGENCY_SPENDING
WHERE -- (filter conditions from PRISM query)
```

**Pass:** [ ] Only ITD data returned  [ ] FAIL - other agencies visible

---

**Scenario A Overall Status:** [ ] PASS  [ ] FAIL

**Notes:** _____________________________________________

---

### A5.2 Scenario B: Blocked Cross-Agency Request

**Test ID:** TRIANGLE-B-001
**Persona:** test-itd-analyst (AGENCY_ITD_ANALYST)

#### A5.2.1 PRISM UI Evidence

**Evidence Artifact:** `A5_2_scenario_b_prism_ui_{date}.png`

**Prompt:** "Compare ITD spending to MassIT spending"

**Capture:**
- [ ] Screenshot of prompt input
- [ ] Screenshot of denial response
- [ ] Clause citation visible (5.1 Cross-Agency)
- [ ] "Request Amendment" option visible
- [ ] No MassIT data shown

**Evidence Location:** `/docs/evidence/A5_2_scenario_b_prism_ui_{date}.png`

---

#### A5.2.2 Snowflake Enforcement Log

**Evidence Artifact:** `A5_2_scenario_b_enforcement_log_{date}.json`

**Verification Query:**
```sql
SELECT
    log_id,
    request_id,
    user_id,
    agency_id,
    request_type,
    agreement_id,
    policy_version,
    decision,
    violated_clause,
    denial_reason,
    enforced_at
FROM GOVERNANCE.POLICY_ENFORCEMENT_LOG
WHERE user_id = 'test-itd-analyst'
AND decision = 'DENIED'
ORDER BY enforced_at DESC
LIMIT 1;
```

**Expected Values:**
- [ ] agreement_id = 'DULA-EOTSS-2024-001'
- [ ] decision = 'DENIED'
- [ ] violated_clause contains 'C03' or '5.1'
- [ ] denial_reason references cross-agency

**Actual Output:**
```json
(paste actual JSON here)
```

**Evidence Location:** `/docs/evidence/A5_2_scenario_b_enforcement_log_{date}.json`

---

**Scenario B Overall Status:** [ ] PASS  [ ] FAIL

**Notes:** _____________________________________________

---

### A5.3 Scenario C: Executive Promotion with HITL

**Test ID:** TRIANGLE-C-001
**Personas:** test-eotss-analyst (initial), test-eotss-exec (approver)

#### A5.3.1 Initial Promotion Attempt (Should Block)

**Evidence Artifact:** `A5_3_scenario_c_blocked_{date}.png`

**Action:** Analyst attempts to promote narrative from CLIENT to EXECUTIVE

**Capture:**
- [ ] Screenshot showing CLIENT trust state
- [ ] Screenshot of promotion attempt
- [ ] Screenshot of block message citing HITL requirement
- [ ] Required approver role shown

**Evidence Location:** `/docs/evidence/A5_3_scenario_c_blocked_{date}.png`

---

#### A5.3.2 Enforcement Log (Gate)

**Evidence Artifact:** `A5_3_scenario_c_gate_log_{date}.json`

**Verification Query:**
```sql
SELECT *
FROM GOVERNANCE.POLICY_ENFORCEMENT_LOG
WHERE request_type = 'TRUST_STATE_PROMOTION'
AND target_state = 'EXECUTIVE'
AND decision = 'GATED'
ORDER BY enforced_at DESC
LIMIT 1;
```

**Expected Values:**
- [ ] decision = 'GATED'
- [ ] gate_type = 'HUMAN_REVIEW' or similar
- [ ] required_approver_role populated

**Actual Output:**
```json
(paste actual JSON here)
```

---

#### A5.3.3 Executive Approval

**Evidence Artifact:** `A5_3_scenario_c_approved_{date}.png`

**Action:** Executive (test-eotss-exec) approves promotion

**Capture:**
- [ ] Screenshot of approval interface
- [ ] Screenshot showing EXECUTIVE trust state after approval
- [ ] Approver attribution visible

**Evidence Location:** `/docs/evidence/A5_3_scenario_c_approved_{date}.png`

---

#### A5.3.4 Enforcement Log (Approval)

**Evidence Artifact:** `A5_3_scenario_c_approval_log_{date}.json`

**Verification Query:**
```sql
SELECT *
FROM GOVERNANCE.POLICY_ENFORCEMENT_LOG
WHERE request_type = 'TRUST_STATE_PROMOTION'
AND target_state = 'EXECUTIVE'
AND decision = 'APPROVED'
ORDER BY enforced_at DESC
LIMIT 1;
```

**Expected Values:**
- [ ] decision = 'APPROVED'
- [ ] approver_id = 'test-eotss-exec'
- [ ] Timestamp after gate timestamp

**Actual Output:**
```json
(paste actual JSON here)
```

---

**Scenario C Overall Status:** [ ] PASS  [ ] FAIL

**Notes:** _____________________________________________

---

## A6. Operational Controls Evidence

### A6.1 Enforcement Logging Proof

**Requirement:** All governance decisions logged with complete attribution.

**Evidence Artifact:** `A6_1_enforcement_log_sample_{date}.json`

**Verification Query:**
```sql
SELECT
    log_id,
    request_id,
    session_id,
    user_id,
    agency_id,
    secretariat_id,
    snowflake_role,
    request_type,
    agreement_id,
    policy_version,
    decision,
    violated_clause,
    denial_reason,
    enforced_at
FROM GOVERNANCE.POLICY_ENFORCEMENT_LOG
ORDER BY enforced_at DESC
LIMIT 20;
```

**Verification Checklist:**
- [ ] All required fields populated
- [ ] Entries for all 3 scenarios present
- [ ] Timestamps sequential
- [ ] No null agreement_id for governed requests

**Evidence Location:** `/docs/evidence/A6_1_enforcement_log_sample_{date}.json`

**Status:** [ ] NOT COLLECTED  [ ] COLLECTED  [ ] VERIFIED

**Notes:** _____________________________________________

---

### A6.2 Query Tagging Proof

**Requirement:** Queries tagged with governance context for audit correlation.

**Evidence Artifact:** `A6_2_query_tags_{date}.json`

**Verification Query:**
```sql
SELECT
    query_id,
    query_tag,
    user_name,
    role_name,
    start_time
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE query_tag IS NOT NULL
AND query_tag LIKE '%prism%'
ORDER BY start_time DESC
LIMIT 10;
```

**Expected Tags:**
- [ ] `prism_feature` present
- [ ] `agreement_id` present
- [ ] `policy_version` present
- [ ] `user_role` present
- [ ] `agency_context` present

**Evidence Location:** `/docs/evidence/A6_2_query_tags_{date}.json`

**Status:** [ ] NOT COLLECTED  [ ] COLLECTED  [ ] VERIFIED

**Notes:** _____________________________________________

---

### A6.3 Monitoring and Alerting Proof (If in GA Scope)

**Requirement:** Operational monitoring active.

**Evidence Artifact:** `A6_3_monitoring_config_{date}.png`

**Capture:**
- [ ] Health check endpoint responding
- [ ] Error rate dashboard configured
- [ ] Credit consumption alerts configured
- [ ] Failed query alerts configured

**Evidence Location:** `/docs/evidence/A6_3_monitoring_config_{date}.png`

**Status:** [ ] NOT COLLECTED  [ ] COLLECTED  [ ] N/A (not in GA scope)

**Notes:** _____________________________________________

---

## Evidence Package Sign-Off

### Collection Verification

| Section | Artifacts Collected | Verified By | Date |
|---------|---------------------|-------------|------|
| A1. Snowflake Environment | [ ] Complete | | |
| A2. SSO and Claims | [ ] Complete | | |
| A3. Row-Level Security | [ ] Complete | | |
| A4. DULA and Policy | [ ] Complete | | |
| A5. Proof Scenarios | [ ] Complete | | |
| A6. Operational Controls | [ ] Complete | | |

### Attestation

I certify that the evidence in this package was collected from the production PRISM environment and accurately represents the system state at the time of collection.

| Field | Value |
|-------|-------|
| Collected By | |
| Title | |
| Date | |
| Signature | |

---

*Appendix A Version: 1.0*
*Template Date: 2026-01-19*
