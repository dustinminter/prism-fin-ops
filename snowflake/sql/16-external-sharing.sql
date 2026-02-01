-- =============================================================================
-- 16-external-sharing.sql
-- PRISM External Data Sharing (Federal Oversight)
-- =============================================================================
-- Aggregated secure views only — no agency-level detail per DULA CLS-POC-004
-- =============================================================================

USE DATABASE FEDERAL_FINANCIAL_DATA;
USE SCHEMA EOTSS_STAGING;

-- =============================================================================
-- External secure views (aggregated to secretariat level)
-- =============================================================================

-- Aggregated spend summary by secretariat (no agency detail)
CREATE OR REPLACE SECURE VIEW EOTSS_STAGING.V_EXTERNAL_SPEND_SUMMARY AS
SELECT
    SECRETARIAT_ID,
    FISCAL_YEAR_LABEL,
    FISCAL_PERIOD_DATE,
    COUNT(DISTINCT AGENCY_CODE) AS AGENCY_COUNT,
    SUM(TOTAL_OBLIGATIONS) AS TOTAL_OBLIGATIONS,
    SUM(TOTAL_EXPENDITURES) AS TOTAL_EXPENDITURES,
    SUM(BUDGET_AUTHORITY) AS TOTAL_BUDGET_AUTHORITY,
    ROUND(SUM(TOTAL_EXPENDITURES) / NULLIF(SUM(BUDGET_AUTHORITY), 0) * 100, 2) AS AVG_BURN_RATE_PCT
FROM EOTSS_STAGING.V_CIW_SPENDING
GROUP BY SECRETARIAT_ID, FISCAL_YEAR_LABEL, FISCAL_PERIOD_DATE;

-- Aggregated anomaly summary (no individual agency flags)
CREATE OR REPLACE SECURE VIEW EOTSS_STAGING.V_EXTERNAL_ANOMALY_SUMMARY AS
SELECT
    a.SECRETARIAT_ID,
    a.FISCAL_PERIOD_DATE,
    COUNT(*) AS TOTAL_PERIODS,
    SUM(CASE WHEN a.IS_ANOMALY THEN 1 ELSE 0 END) AS ANOMALY_COUNT,
    SUM(CASE WHEN a.ANOMALY_SEVERITY = 'Critical' THEN 1 ELSE 0 END) AS CRITICAL_COUNT,
    SUM(CASE WHEN a.ANOMALY_SEVERITY = 'Warning' THEN 1 ELSE 0 END) AS WARNING_COUNT,
    AVG(a.SPEND_DEVIATION_PCT) AS AVG_DEVIATION_PCT
FROM EOTSS_STAGING.V_SPEND_ANOMALIES a
GROUP BY a.SECRETARIAT_ID, a.FISCAL_PERIOD_DATE;

-- Aggregated budget risk summary
CREATE OR REPLACE SECURE VIEW EOTSS_STAGING.V_EXTERNAL_BUDGET_RISK_SUMMARY AS
SELECT
    SECRETARIAT_ID,
    FISCAL_YEAR,
    COUNT(*) AS AGENCY_COUNT,
    SUM(YTD_SPEND) AS TOTAL_YTD_SPEND,
    SUM(BUDGET_AUTHORITY) AS TOTAL_BUDGET_AUTHORITY,
    ROUND(SUM(YTD_SPEND) / NULLIF(SUM(BUDGET_AUTHORITY), 0) * 100, 2) AS AVG_BURN_RATE_PCT,
    SUM(CASE WHEN BUDGET_RISK_LEVEL = 'Over Budget' THEN 1 ELSE 0 END) AS OVER_BUDGET_COUNT,
    SUM(CASE WHEN BUDGET_RISK_LEVEL = 'At Risk' THEN 1 ELSE 0 END) AS AT_RISK_COUNT,
    SUM(CASE WHEN BUDGET_RISK_LEVEL = 'On Track' THEN 1 ELSE 0 END) AS ON_TRACK_COUNT,
    SUM(CASE WHEN BUDGET_RISK_LEVEL = 'Under-Utilized' THEN 1 ELSE 0 END) AS UNDER_UTILIZED_COUNT
FROM EOTSS_STAGING.V_BUDGET_RISK
GROUP BY SECRETARIAT_ID, FISCAL_YEAR;

-- =============================================================================
-- External Share
-- =============================================================================
CREATE SHARE IF NOT EXISTS PRISM_FINOPS_FEDERAL_OVERSIGHT
    COMMENT = 'PRISM FinOps - Federal oversight: aggregated secretariat-level analytics (no agency detail per DULA)';

GRANT USAGE ON DATABASE FEDERAL_FINANCIAL_DATA TO SHARE PRISM_FINOPS_FEDERAL_OVERSIGHT;
GRANT USAGE ON SCHEMA EOTSS_STAGING TO SHARE PRISM_FINOPS_FEDERAL_OVERSIGHT;

GRANT SELECT ON VIEW EOTSS_STAGING.V_EXTERNAL_SPEND_SUMMARY TO SHARE PRISM_FINOPS_FEDERAL_OVERSIGHT;
GRANT SELECT ON VIEW EOTSS_STAGING.V_EXTERNAL_ANOMALY_SUMMARY TO SHARE PRISM_FINOPS_FEDERAL_OVERSIGHT;
GRANT SELECT ON VIEW EOTSS_STAGING.V_EXTERNAL_BUDGET_RISK_SUMMARY TO SHARE PRISM_FINOPS_FEDERAL_OVERSIGHT;

-- =============================================================================
-- Reader account option for partners without Snowflake
-- =============================================================================
-- CREATE MANAGED ACCOUNT prism_federal_reader
--     ADMIN_NAME = 'prism_reader_admin',
--     ADMIN_PASSWORD = '<secure_password>',
--     TYPE = READER;
--
-- ALTER SHARE PRISM_FINOPS_FEDERAL_OVERSIGHT ADD ACCOUNTS = <reader_account_locator>;

-- =============================================================================
-- Verification
-- =============================================================================
-- SHOW SHARES LIKE 'PRISM_FINOPS_FEDERAL_OVERSIGHT';
-- SHOW GRANTS TO SHARE PRISM_FINOPS_FEDERAL_OVERSIGHT;
-- SELECT COUNT(*) FROM EOTSS_STAGING.V_EXTERNAL_SPEND_SUMMARY;
