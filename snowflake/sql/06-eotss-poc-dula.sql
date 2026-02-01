-- =============================================================================
-- 06-eotss-poc-dula.sql
-- EOTSS POC Data Use and License Agreement (DULA)
-- =============================================================================
-- Following the template pattern in sql/governance_agreements_ddl.sql lines 632-732
-- Agreement ID: AGR-EOTSS-POC-001
-- =============================================================================

USE SCHEMA GOVERNANCE;

-- =============================================================================
-- Insert POC Agreement
-- =============================================================================
INSERT INTO GOVERNANCE.AGREEMENTS (
    agreement_id,
    agreement_type,
    agreement_title,
    agency_id,
    counterparty_type,
    counterparty_name,
    effective_date,
    expiration_date,
    status,
    owner_org,
    agreement_owner,
    legal_owner,
    version_current,
    document_format,
    data_domains,
    data_classification_max,
    pii_allowed,
    phi_allowed,
    cross_agency_sharing_allowed,
    ai_processing_allowed,
    ai_restrictions_summary,
    created_by
) VALUES (
    'AGR-EOTSS-POC-001',
    'DULA',
    'PRISM FinOps Intelligence - EOTSS POC Data Use and License Agreement',
    'EOTSS',
    'EOTSS',
    'Executive Office of Technology Services and Security',
    '2026-02-01',
    '2026-09-30',  -- 6-8 week POC + buffer
    'ACTIVE',
    'EOTSS',
    'PRISM Program Office',
    'EOTSS General Counsel',
    '1.0',
    'DOCX',
    ARRAY_CONSTRUCT('CIW', 'CIP', 'COMMBUYS', 'CTHR'),
    'CONFIDENTIAL',
    FALSE,   -- No PII allowed
    FALSE,   -- No PHI allowed
    TRUE,    -- Cross-agency sharing allowed for EOTSS oversight roles
    TRUE,    -- AI processing allowed (FORECAST, ANOMALY_DETECTION, COMPLETE)
    'AI processing permitted for: (1) FORECAST - spending predictions by agency, (2) ANOMALY_DETECTION - flagging spending deviations, (3) COMPLETE - executive narrative generation via Snowflake Intelligence UI. Human-in-the-loop required for executive-level outputs. All prompts and outputs logged. POC uses sample data only — no production agency data without separate agreement.',
    'SYSTEM'
);

-- =============================================================================
-- Insert POC Clauses (5 clauses following template pattern)
-- =============================================================================
INSERT INTO GOVERNANCE.AGREEMENT_CLAUSES (agreement_id, clause_id, clause_type, clause_title, clause_text, clause_priority, policy_json, created_by)
VALUES
-- Clause 1: Purpose Limitation
('AGR-EOTSS-POC-001', 'CLS-POC-001', 'PURPOSE_LIMITATION', 'POC Permitted Purposes',
 'Data provided under this Agreement may only be used for: (a) proof-of-concept demonstration of Snowflake Intelligence UI capabilities for Commonwealth FinOps, (b) financial operations analysis using Cortex Analyst natural language queries, (c) spending anomaly detection and trend forecasting, (d) executive reporting and narrative generation for EOTSS leadership. Data shall not be used for personnel evaluation, vendor performance scoring with contractual consequences, law enforcement purposes, or marketing activities. This POC operates on seeded sample data representative of Commonwealth financial patterns; no production agency data is included without a separate data sharing agreement.',
 100,
 PARSE_JSON('{
   "allowed": ["poc_demonstration", "finops_analysis", "anomaly_detection", "forecasting", "executive_reporting"],
   "prohibited": ["personnel_evaluation", "vendor_scoring_contractual", "law_enforcement", "marketing"],
   "data_type": "sample_data_only"
 }'),
 'SYSTEM'),

-- Clause 2: Data Scope
('AGR-EOTSS-POC-001', 'CLS-POC-002', 'DATA_SCOPE', 'POC Data Domains and Restrictions',
 'This Agreement covers the following data domains: (1) CIW - Comptroller Information Warehouse spending data (monthly obligations, expenditures, budget authority by agency and fund code), (2) CIP - Capital Investment Program project data (IT investment budgets, actuals, and variance), (3) COMMBUYS - State procurement awards (vendor contracts, categories, and diversity designations), (4) CTHR - Commonwealth Human Resources workforce data (position counts, salary obligations, vacancy rates by agency and classification). All data in the POC is synthetic sample data seeded to reflect realistic Commonwealth financial patterns. Personally identifiable information (PII) and Protected Health Information (PHI) are not permitted. Fields including Social Security Number, Date of Birth, Full Address, and patient records must be excluded.',
 100,
 PARSE_JSON('{
   "domains_allowed": ["CIW", "CIP", "COMMBUYS", "CTHR"],
   "fields_prohibited": ["SSN", "DOB", "FULL_ADDRESS", "PATIENT_RECORDS"],
   "pii_allowed": false,
   "phi_allowed": false,
   "data_classification": "CONFIDENTIAL",
   "sample_data_only": true
 }'),
 'SYSTEM'),

-- Clause 3: AI Use
('AGR-EOTSS-POC-001', 'CLS-POC-003', 'AI_USE', 'Artificial Intelligence Processing - POC',
 'AI and machine learning processing is permitted under the following conditions: (1) Snowflake Cortex FORECAST may be used to generate spending predictions by agency for up to 6 months forward. (2) Snowflake Cortex ANOMALY_DETECTION may be used to flag statistical deviations in spending patterns. (3) Snowflake Cortex COMPLETE (via Intelligence UI) may be used for natural language query processing and executive narrative generation. (4) Human review is required before any AI-generated content is promoted to Executive trust state or shared outside the POC team. (5) All prompts submitted to AI systems and all outputs generated must be logged for audit purposes. (6) AI-generated insights must reference source data tables and this governing agreement. (7) No automated decision-making that affects budget allocations, personnel actions, or vendor contracts without explicit human approval.',
 100,
 PARSE_JSON('{
   "ai_allowed": true,
   "models_permitted": ["FORECAST", "ANOMALY_DETECTION", "COMPLETE"],
   "requirements": ["human_in_the_loop_for_executive", "log_prompts_outputs", "cite_sources_and_agreement"],
   "prohibited_actions": ["automated_budget_decisions", "automated_personnel_actions", "automated_vendor_decisions"]
 }'),
 'SYSTEM'),

-- Clause 4: Cross-Agency Sharing
('AGR-EOTSS-POC-001', 'CLS-POC-004', 'CROSS_SHARING', 'Cross-Agency Data Visibility - POC',
 'Cross-agency data visibility is permitted for EOTSS oversight roles only during the POC period. Specifically: (a) EOTSS CIO and designated POC participants may view aggregated spending data across all secretariats. (b) Secretariat-level budget directors may view data for agencies within their secretariat only. (c) Agency-level users may view only their own agency data. (d) Raw agency-level data shall not be shared with external parties, including Archetype Consulting, without prior written approval. (e) Aggregated, de-identified summaries may be included in POC evaluation reports.',
 100,
 PARSE_JSON('{
   "cross_agency_allowed": true,
   "allowed_roles": ["EOTSS_CIO", "EOTSS_POC_PARTICIPANT"],
   "secretariat_level": "own_secretariat_only",
   "agency_level": "own_agency_only",
   "external_sharing_allowed": false,
   "aggregated_reports_allowed": true
 }'),
 'SYSTEM'),

-- Clause 5: Retention and Disposal
('AGR-EOTSS-POC-001', 'CLS-POC-005', 'RETENTION', 'POC Data Retention and Disposal',
 'Data and AI artifacts created under this POC Agreement shall be retained for the duration of the POC period plus ninety (90) days for evaluation purposes. Upon conclusion of the evaluation period: (a) Sample data in EOTSS_POC schema shall be retained if the POC proceeds to production phase, or deleted within 30 days if the POC is not continued. (b) Staging views (EOTSS_STAGING) shall be retained and redirected to production data sources if the POC proceeds. (c) AI model artifacts (FORECAST, ANOMALY_DETECTION) shall be retrained on production data if proceeding, or deleted within 30 days. (d) All query logs, prompt logs, and audit records shall be retained for one (1) year regardless of POC outcome for compliance purposes.',
 100,
 PARSE_JSON('{
   "poc_retention_days": 270,
   "post_poc_deletion_days": 30,
   "audit_log_retention_days": 365,
   "schemas_affected": ["EOTSS_POC", "EOTSS_STAGING"],
   "proceed_to_production": "retain_and_redirect",
   "discontinue": "delete_within_30_days"
 }'),
 'SYSTEM');

-- =============================================================================
-- Verification
-- =============================================================================
SELECT agreement_id, agreement_title, status, effective_date, expiration_date
FROM GOVERNANCE.AGREEMENTS
WHERE agreement_id = 'AGR-EOTSS-POC-001';

SELECT agreement_id, clause_id, clause_type, clause_title
FROM GOVERNANCE.AGREEMENT_CLAUSES
WHERE agreement_id = 'AGR-EOTSS-POC-001'
ORDER BY clause_id;
