-- =============================================================================
-- PRISM FinOps Intelligence -- Native App Setup Script
-- =============================================================================
-- Creates schemas, staging views, anomaly analytics, governance framework,
-- and semantic model within the consumer's installed application.
-- =============================================================================

-- =============================================================================
-- 1. Schema Setup
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS STAGING;
CREATE SCHEMA IF NOT EXISTS ANALYTICS;
CREATE SCHEMA IF NOT EXISTS GOVERNANCE;
CREATE SCHEMA IF NOT EXISTS SEMANTIC;
CREATE SCHEMA IF NOT EXISTS CONFIG;

-- =============================================================================
-- 2. Reference Registration (consumer maps their source tables)
-- =============================================================================
CREATE OR REPLACE PROCEDURE CONFIG.REGISTER_REFERENCE(ref_name VARCHAR, operation VARCHAR, ref_or_alias VARCHAR)
RETURNS VARCHAR
LANGUAGE SQL
AS
$$
BEGIN
    CASE (operation)
        WHEN 'ADD' THEN
            SELECT SYSTEM$SET_REFERENCE(:ref_name, :ref_or_alias);
        WHEN 'REMOVE' THEN
            SELECT SYSTEM$REMOVE_REFERENCE(:ref_name, :ref_or_alias);
        WHEN 'CLEAR' THEN
            SELECT SYSTEM$REMOVE_ALL_REFERENCES(:ref_name);
    END CASE;
    RETURN 'Success';
END;
$$;

-- =============================================================================
-- 3. Staging Views (reference consumer-mapped tables)
-- =============================================================================
CREATE OR REPLACE VIEW STAGING.V_SPENDING AS
SELECT
    AGENCY_CODE,
    AGENCY_NAME,
    SECRETARIAT_ID,
    FISCAL_YEAR_LABEL,
    FISCAL_PERIOD_DATE,
    TOTAL_OBLIGATIONS,
    TOTAL_EXPENDITURES,
    BUDGET_AUTHORITY,
    TOTAL_OBLIGATIONS - TOTAL_EXPENDITURES AS UNLIQUIDATED_OBLIGATIONS,
    ROUND(TOTAL_EXPENDITURES / NULLIF(BUDGET_AUTHORITY, 0) * 100, 2) AS BURN_RATE_PCT
FROM REFERENCE('spending_data');

CREATE OR REPLACE VIEW STAGING.V_INVESTMENTS AS
SELECT
    AGENCY_CODE,
    AGENCY_NAME,
    INVESTMENT_NAME,
    INVESTMENT_TYPE,
    FISCAL_YEAR,
    PLANNED_SPEND,
    ACTUAL_SPEND,
    ACTUAL_SPEND - PLANNED_SPEND AS VARIANCE_AMOUNT,
    ROUND((ACTUAL_SPEND - PLANNED_SPEND) / NULLIF(PLANNED_SPEND, 0) * 100, 2) AS VARIANCE_PCT,
    LIFECYCLE_STAGE,
    RISK_LEVEL
FROM REFERENCE('investment_data');

CREATE OR REPLACE VIEW STAGING.V_PROCUREMENT AS
SELECT *
FROM REFERENCE('procurement_data');

CREATE OR REPLACE VIEW STAGING.V_WORKFORCE AS
SELECT *
FROM REFERENCE('workforce_data');

-- =============================================================================
-- 4. Anomaly Detection Views
-- =============================================================================

-- Spend anomalies (joins with ML results when available)
CREATE OR REPLACE VIEW ANALYTICS.V_SPEND_ANOMALIES AS
SELECT
    s.AGENCY_CODE,
    s.AGENCY_NAME,
    s.SECRETARIAT_ID,
    s.FISCAL_PERIOD_DATE,
    s.TOTAL_EXPENDITURES,
    s.BUDGET_AUTHORITY,
    s.BURN_RATE_PCT,
    -- Statistical deviation from agency mean
    s.TOTAL_EXPENDITURES - AVG(s.TOTAL_EXPENDITURES) OVER (
        PARTITION BY s.AGENCY_CODE
    ) AS SPEND_DEVIATION,
    ROUND((s.TOTAL_EXPENDITURES - AVG(s.TOTAL_EXPENDITURES) OVER (
        PARTITION BY s.AGENCY_CODE
    )) / NULLIF(STDDEV(s.TOTAL_EXPENDITURES) OVER (
        PARTITION BY s.AGENCY_CODE
    ), 0), 2) AS SPEND_DEVIATION_PCT,
    CASE
        WHEN ABS((s.TOTAL_EXPENDITURES - AVG(s.TOTAL_EXPENDITURES) OVER (
            PARTITION BY s.AGENCY_CODE
        )) / NULLIF(STDDEV(s.TOTAL_EXPENDITURES) OVER (
            PARTITION BY s.AGENCY_CODE
        ), 0)) > 3 THEN TRUE
        ELSE FALSE
    END AS IS_ANOMALY,
    CASE
        WHEN ABS((s.TOTAL_EXPENDITURES - AVG(s.TOTAL_EXPENDITURES) OVER (
            PARTITION BY s.AGENCY_CODE
        )) / NULLIF(STDDEV(s.TOTAL_EXPENDITURES) OVER (
            PARTITION BY s.AGENCY_CODE
        ), 0)) > 3 THEN 'Critical'
        WHEN ABS((s.TOTAL_EXPENDITURES - AVG(s.TOTAL_EXPENDITURES) OVER (
            PARTITION BY s.AGENCY_CODE
        )) / NULLIF(STDDEV(s.TOTAL_EXPENDITURES) OVER (
            PARTITION BY s.AGENCY_CODE
        ), 0)) > 2 THEN 'Warning'
        WHEN ABS((s.TOTAL_EXPENDITURES - AVG(s.TOTAL_EXPENDITURES) OVER (
            PARTITION BY s.AGENCY_CODE
        )) / NULLIF(STDDEV(s.TOTAL_EXPENDITURES) OVER (
            PARTITION BY s.AGENCY_CODE
        ), 0)) > 1 THEN 'Minor'
        ELSE NULL
    END AS ANOMALY_SEVERITY
FROM STAGING.V_SPENDING s;

-- Budget risk assessment
CREATE OR REPLACE VIEW ANALYTICS.V_BUDGET_RISK AS
WITH current_fy AS (
    SELECT
        CASE
            WHEN MONTH(CURRENT_DATE()) >= 7 THEN YEAR(CURRENT_DATE()) + 1
            ELSE YEAR(CURRENT_DATE())
        END AS FY_END_YEAR
),
fy_params AS (
    SELECT
        FY_END_YEAR,
        'FY' || FY_END_YEAR AS FISCAL_YEAR,
        DATE_FROM_PARTS(FY_END_YEAR - 1, 7, 1) AS FY_START,
        DATE_FROM_PARTS(FY_END_YEAR, 6, 30) AS FY_END,
        DATEDIFF('day', DATE_FROM_PARTS(FY_END_YEAR - 1, 7, 1), CURRENT_DATE()) /
            DATEDIFF('day', DATE_FROM_PARTS(FY_END_YEAR - 1, 7, 1), DATE_FROM_PARTS(FY_END_YEAR, 6, 30))
        AS PCT_FY_ELAPSED
    FROM current_fy
),
agency_ytd AS (
    SELECT
        s.AGENCY_CODE,
        s.AGENCY_NAME,
        s.SECRETARIAT_ID,
        fp.FISCAL_YEAR,
        fp.PCT_FY_ELAPSED,
        SUM(s.TOTAL_EXPENDITURES) AS YTD_SPEND,
        MAX(s.BUDGET_AUTHORITY) AS BUDGET_AUTHORITY
    FROM STAGING.V_SPENDING s
    CROSS JOIN fy_params fp
    WHERE s.FISCAL_PERIOD_DATE >= fp.FY_START
      AND s.FISCAL_PERIOD_DATE <= CURRENT_DATE()
    GROUP BY s.AGENCY_CODE, s.AGENCY_NAME, s.SECRETARIAT_ID,
             fp.FISCAL_YEAR, fp.PCT_FY_ELAPSED
)
SELECT
    AGENCY_CODE,
    AGENCY_NAME,
    SECRETARIAT_ID,
    FISCAL_YEAR,
    YTD_SPEND,
    BUDGET_AUTHORITY,
    ROUND(YTD_SPEND / NULLIF(BUDGET_AUTHORITY, 0) * 100, 2) AS BURN_RATE_PCT,
    ROUND(PCT_FY_ELAPSED * 100, 1) AS PCT_FY_ELAPSED,
    ROUND((YTD_SPEND / NULLIF(PCT_FY_ELAPSED, 0)) - BUDGET_AUTHORITY, 2) AS PROJECTED_OVERRUN,
    CASE
        WHEN YTD_SPEND > BUDGET_AUTHORITY THEN 'Over Budget'
        WHEN (YTD_SPEND / NULLIF(PCT_FY_ELAPSED, 0)) > BUDGET_AUTHORITY * 1.1 THEN 'At Risk'
        WHEN (YTD_SPEND / NULLIF(PCT_FY_ELAPSED, 0)) < BUDGET_AUTHORITY * 0.7 THEN 'Under-Utilized'
        ELSE 'On Track'
    END AS BUDGET_RISK_LEVEL
FROM agency_ytd;

-- =============================================================================
-- 5. Governance Framework
-- =============================================================================
CREATE TABLE IF NOT EXISTS GOVERNANCE.DATA_USE_AGREEMENTS (
    DULA_ID VARCHAR(36) DEFAULT UUID_STRING(),
    AGREEMENT_NAME VARCHAR(500),
    EFFECTIVE_DATE DATE,
    EXPIRATION_DATE DATE,
    DATA_SCOPE VARCHAR(1000),
    RESTRICTIONS VARCHAR(2000),
    STATUS VARCHAR(20) DEFAULT 'Active',
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS GOVERNANCE.SECRETARIAT_AGENCIES (
    SECRETARIAT_ID VARCHAR(10),
    SECRETARIAT_NAME VARCHAR(200),
    AGENCY_CODE VARCHAR(20),
    AGENCY_NAME VARCHAR(200)
);

-- =============================================================================
-- 6. Application Metadata
-- =============================================================================
CREATE TABLE IF NOT EXISTS CONFIG.APP_METADATA (
    KEY VARCHAR(100),
    VALUE VARCHAR(1000),
    UPDATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

INSERT INTO CONFIG.APP_METADATA SELECT 'app_name', 'PRISM FinOps Intelligence', CURRENT_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM CONFIG.APP_METADATA WHERE KEY = 'app_name');
INSERT INTO CONFIG.APP_METADATA SELECT 'version', '1.0.0', CURRENT_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM CONFIG.APP_METADATA WHERE KEY = 'version');
INSERT INTO CONFIG.APP_METADATA SELECT 'deployed_at', CURRENT_TIMESTAMP()::VARCHAR, CURRENT_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM CONFIG.APP_METADATA WHERE KEY = 'deployed_at');

-- =============================================================================
-- Deployment Notes:
-- 1. CREATE APPLICATION PACKAGE PRISM_FINOPS_PACKAGE;
-- 2. Upload files to a named stage within the package
-- 3. ALTER APPLICATION PACKAGE PRISM_FINOPS_PACKAGE
--      ADD VERSION v1 USING '@prism_finops_stage';
-- 4. Consumer installs:
--      CREATE APPLICATION prism_finops
--        FROM APPLICATION PACKAGE PRISM_FINOPS_PACKAGE
--        USING VERSION v1;
-- 5. Consumer maps references in Snowsight or via:
--      CALL prism_finops.CONFIG.REGISTER_REFERENCE(
--        'spending_data', 'ADD', 'my_db.my_schema.my_spending_table');
-- =============================================================================
