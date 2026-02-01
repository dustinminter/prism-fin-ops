-- =============================================================================
-- 13-horizon.sql
-- PRISM Horizon Unified Governance
-- =============================================================================
-- Object tags, classification, row-level access policies
-- Coexists with GOVERNANCE schema (DULAs, clauses) — Horizon handles runtime enforcement
-- =============================================================================

USE DATABASE FEDERAL_FINANCIAL_DATA;

-- =============================================================================
-- 1. Object Tags
-- =============================================================================
CREATE TAG IF NOT EXISTS GOVERNANCE.SENSITIVITY_LEVEL
    ALLOWED_VALUES 'PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'
    COMMENT = 'Data sensitivity classification per Commonwealth data governance policy';

CREATE TAG IF NOT EXISTS GOVERNANCE.DATA_DOMAIN
    ALLOWED_VALUES 'CIW', 'CIP', 'COMMBUYS', 'CTHR', 'ANOMALY', 'FORECAST', 'GOVERNANCE'
    COMMENT = 'Source data domain for lineage tracking';

CREATE TAG IF NOT EXISTS GOVERNANCE.PII_FLAG
    ALLOWED_VALUES 'NONE', 'CONTAINS_PII', 'CONTAINS_PHI'
    COMMENT = 'Personally identifiable or health information indicator';

-- =============================================================================
-- 2. Tag CIW Spending columns
-- =============================================================================
ALTER VIEW EOTSS_STAGING.V_CIW_SPENDING SET TAG
    GOVERNANCE.DATA_DOMAIN = 'CIW',
    GOVERNANCE.PII_FLAG = 'NONE';

ALTER VIEW EOTSS_STAGING.V_CIW_SPENDING MODIFY COLUMN
    AGENCY_CODE SET TAG GOVERNANCE.SENSITIVITY_LEVEL = 'INTERNAL';
ALTER VIEW EOTSS_STAGING.V_CIW_SPENDING MODIFY COLUMN
    AGENCY_NAME SET TAG GOVERNANCE.SENSITIVITY_LEVEL = 'INTERNAL';
ALTER VIEW EOTSS_STAGING.V_CIW_SPENDING MODIFY COLUMN
    TOTAL_OBLIGATIONS SET TAG GOVERNANCE.SENSITIVITY_LEVEL = 'CONFIDENTIAL';
ALTER VIEW EOTSS_STAGING.V_CIW_SPENDING MODIFY COLUMN
    TOTAL_EXPENDITURES SET TAG GOVERNANCE.SENSITIVITY_LEVEL = 'CONFIDENTIAL';
ALTER VIEW EOTSS_STAGING.V_CIW_SPENDING MODIFY COLUMN
    BUDGET_AUTHORITY SET TAG GOVERNANCE.SENSITIVITY_LEVEL = 'CONFIDENTIAL';
ALTER VIEW EOTSS_STAGING.V_CIW_SPENDING MODIFY COLUMN
    BURN_RATE_PCT SET TAG GOVERNANCE.SENSITIVITY_LEVEL = 'CONFIDENTIAL';

-- =============================================================================
-- 3. Tag CIP Investments
-- =============================================================================
ALTER VIEW EOTSS_STAGING.V_CIP_INVESTMENTS SET TAG
    GOVERNANCE.DATA_DOMAIN = 'CIP',
    GOVERNANCE.PII_FLAG = 'NONE';

ALTER VIEW EOTSS_STAGING.V_CIP_INVESTMENTS MODIFY COLUMN
    PLANNED_BUDGET SET TAG GOVERNANCE.SENSITIVITY_LEVEL = 'CONFIDENTIAL';
ALTER VIEW EOTSS_STAGING.V_CIP_INVESTMENTS MODIFY COLUMN
    ACTUAL_SPEND SET TAG GOVERNANCE.SENSITIVITY_LEVEL = 'CONFIDENTIAL';
ALTER VIEW EOTSS_STAGING.V_CIP_INVESTMENTS MODIFY COLUMN
    PROJECT_MANAGER SET TAG GOVERNANCE.SENSITIVITY_LEVEL = 'INTERNAL';

-- =============================================================================
-- 4. Tag Commbuys Awards
-- =============================================================================
ALTER VIEW EOTSS_STAGING.V_COMMBUYS_AWARDS SET TAG
    GOVERNANCE.DATA_DOMAIN = 'COMMBUYS',
    GOVERNANCE.PII_FLAG = 'NONE';

ALTER VIEW EOTSS_STAGING.V_COMMBUYS_AWARDS MODIFY COLUMN
    VENDOR_NAME SET TAG GOVERNANCE.SENSITIVITY_LEVEL = 'INTERNAL';
ALTER VIEW EOTSS_STAGING.V_COMMBUYS_AWARDS MODIFY COLUMN
    AWARD_AMOUNT SET TAG GOVERNANCE.SENSITIVITY_LEVEL = 'CONFIDENTIAL';

-- =============================================================================
-- 5. Tag CTHR Workforce
-- =============================================================================
ALTER VIEW EOTSS_STAGING.V_CTHR_WORKFORCE SET TAG
    GOVERNANCE.DATA_DOMAIN = 'CTHR',
    GOVERNANCE.PII_FLAG = 'NONE';

ALTER VIEW EOTSS_STAGING.V_CTHR_WORKFORCE MODIFY COLUMN
    SALARY_OBLIGATIONS SET TAG GOVERNANCE.SENSITIVITY_LEVEL = 'CONFIDENTIAL';
ALTER VIEW EOTSS_STAGING.V_CTHR_WORKFORCE MODIFY COLUMN
    VACANCY_RATE SET TAG GOVERNANCE.SENSITIVITY_LEVEL = 'INTERNAL';

-- =============================================================================
-- 6. Tag Anomaly/Forecast outputs
-- =============================================================================
ALTER VIEW EOTSS_STAGING.V_SPEND_ANOMALIES SET TAG
    GOVERNANCE.DATA_DOMAIN = 'ANOMALY',
    GOVERNANCE.SENSITIVITY_LEVEL = 'CONFIDENTIAL';

ALTER VIEW EOTSS_STAGING.V_BUDGET_RISK SET TAG
    GOVERNANCE.DATA_DOMAIN = 'FORECAST',
    GOVERNANCE.SENSITIVITY_LEVEL = 'CONFIDENTIAL';

ALTER VIEW EOTSS_STAGING.V_PROCUREMENT_OUTLIERS SET TAG
    GOVERNANCE.DATA_DOMAIN = 'COMMBUYS',
    GOVERNANCE.SENSITIVITY_LEVEL = 'CONFIDENTIAL';

-- =============================================================================
-- 7. Row Access Policy: Secretariat-scoped access
-- Replaces custom GOVERNANCE.CROSS_SHARING logic with Horizon enforcement
-- =============================================================================
CREATE OR REPLACE ROW ACCESS POLICY GOVERNANCE.SECRETARIAT_ACCESS_POLICY
AS (SECRETARIAT_ID VARCHAR) RETURNS BOOLEAN ->
    -- ACCOUNTADMIN and SYSADMIN see all data
    CURRENT_ROLE() IN ('ACCOUNTADMIN', 'SYSADMIN')
    OR
    -- EOTSS roles see all EOTSS data
    (CURRENT_ROLE() LIKE '%EOTSS%')
    OR
    -- Secretariat directors see their own secretariat
    (CURRENT_ROLE() LIKE '%' || SECRETARIAT_ID || '%')
    OR
    -- The PRISM_FINOPS_ANALYST role sees all data (analyst POC role)
    CURRENT_ROLE() = 'PRISM_FINOPS_ANALYST';

-- Apply to CIW spending (has SECRETARIAT_ID column)
-- ALTER VIEW EOTSS_STAGING.V_CIW_SPENDING
--   ADD ROW ACCESS POLICY GOVERNANCE.SECRETARIAT_ACCESS_POLICY ON (SECRETARIAT_ID);

-- Apply to CTHR workforce
-- ALTER VIEW EOTSS_STAGING.V_CTHR_WORKFORCE
--   ADD ROW ACCESS POLICY GOVERNANCE.SECRETARIAT_ACCESS_POLICY ON (SECRETARIAT_ID);

-- =============================================================================
-- 8. Tag Governance schema itself
-- =============================================================================
ALTER TABLE GOVERNANCE.SECRETARIAT_AGENCIES SET TAG
    GOVERNANCE.DATA_DOMAIN = 'GOVERNANCE',
    GOVERNANCE.SENSITIVITY_LEVEL = 'INTERNAL';

-- =============================================================================
-- Verification
-- =============================================================================
-- Check tags applied:
-- SELECT SYSTEM$GET_TAG('GOVERNANCE.SENSITIVITY_LEVEL', 'EOTSS_STAGING.V_CIW_SPENDING.TOTAL_EXPENDITURES', 'COLUMN');
-- Expected: 'CONFIDENTIAL'

-- List all tagged objects:
-- SELECT * FROM TABLE(INFORMATION_SCHEMA.TAG_REFERENCES_ALL_COLUMNS('EOTSS_STAGING.V_CIW_SPENDING', 'TABLE'));

-- Test row access policy:
-- USE ROLE PRISM_FINOPS_ANALYST;
-- SELECT COUNT(*) FROM EOTSS_STAGING.V_CIW_SPENDING;  -- should see all rows
