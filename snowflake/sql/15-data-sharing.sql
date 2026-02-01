-- =============================================================================
-- 15-data-sharing.sql
-- PRISM Internal Data Sharing
-- =============================================================================
-- Share staging and anomaly views with internal Snowflake accounts
-- =============================================================================

USE DATABASE FEDERAL_FINANCIAL_DATA;

-- =============================================================================
-- Internal Share: PRISM FinOps Intelligence
-- =============================================================================
CREATE SHARE IF NOT EXISTS PRISM_FINOPS_INTERNAL
    COMMENT = 'PRISM FinOps Intelligence - Internal share of Commonwealth financial analytics';

-- Grant database usage
GRANT USAGE ON DATABASE FEDERAL_FINANCIAL_DATA TO SHARE PRISM_FINOPS_INTERNAL;
GRANT USAGE ON SCHEMA EOTSS_STAGING TO SHARE PRISM_FINOPS_INTERNAL;

-- Share 4 staging views
GRANT SELECT ON VIEW EOTSS_STAGING.V_CIW_SPENDING TO SHARE PRISM_FINOPS_INTERNAL;
GRANT SELECT ON VIEW EOTSS_STAGING.V_CIP_INVESTMENTS TO SHARE PRISM_FINOPS_INTERNAL;
GRANT SELECT ON VIEW EOTSS_STAGING.V_COMMBUYS_AWARDS TO SHARE PRISM_FINOPS_INTERNAL;
GRANT SELECT ON VIEW EOTSS_STAGING.V_CTHR_WORKFORCE TO SHARE PRISM_FINOPS_INTERNAL;

-- Share 3 anomaly views
GRANT SELECT ON VIEW EOTSS_STAGING.V_SPEND_ANOMALIES TO SHARE PRISM_FINOPS_INTERNAL;
GRANT SELECT ON VIEW EOTSS_STAGING.V_BUDGET_RISK TO SHARE PRISM_FINOPS_INTERNAL;
GRANT SELECT ON VIEW EOTSS_STAGING.V_PROCUREMENT_OUTLIERS TO SHARE PRISM_FINOPS_INTERNAL;

-- NOTE: Raw ML output (SPEND_ANOMALY_RESULTS, BUDGET_FORECAST_RESULTS) and
-- GOVERNANCE schema are NOT shared. Only curated views are exposed.

-- =============================================================================
-- Add consumer accounts (uncomment and add account locators)
-- =============================================================================
-- ALTER SHARE PRISM_FINOPS_INTERNAL ADD ACCOUNTS = <account_locator>;

-- =============================================================================
-- Verification
-- =============================================================================
-- SHOW SHARES LIKE 'PRISM_FINOPS_INTERNAL';
-- SHOW GRANTS TO SHARE PRISM_FINOPS_INTERNAL;
