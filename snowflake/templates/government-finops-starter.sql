-- =============================================================================
-- Government FinOps Starter Template
-- Extracted from: PRISM FinOps Intelligence (Commonwealth of Massachusetts)
-- =============================================================================
-- Quick start for state/local government financial operations intelligence.
-- Replace placeholder values marked with {{PLACEHOLDER}} before deployment.
-- =============================================================================
--
-- What's included:
--   1. 4-view staging pattern (spending, investments, procurement, workforce)
--   2. Anomaly detection (Cortex ML + pure SQL)
--   3. Budget risk assessment (fiscal year aware)
--   4. Semantic model YAML scaffold
--   5. Governance framework (DULA + secretariat hierarchy)
--   6. Sample data generator
--
-- Prerequisites:
--   - Snowflake account with Cortex ML enabled
--   - ACCOUNTADMIN or equivalent role
--   - A warehouse (default: COMPUTE_WH)
-- =============================================================================

-- =============================================
-- STEP 1: Database & Schema Setup
-- =============================================
CREATE DATABASE IF NOT EXISTS {{DATABASE_NAME}};
USE DATABASE {{DATABASE_NAME}};

CREATE SCHEMA IF NOT EXISTS SAMPLE_DATA;
CREATE SCHEMA IF NOT EXISTS STAGING;
CREATE SCHEMA IF NOT EXISTS GOVERNANCE;

-- =============================================
-- STEP 2: Governance — Agency Hierarchy
-- =============================================
-- Adapt secretariat/agency structure to your state
CREATE TABLE IF NOT EXISTS GOVERNANCE.SECRETARIAT_AGENCIES (
    SECRETARIAT_ID VARCHAR(10),
    SECRETARIAT_NAME VARCHAR(200),
    AGENCY_CODE VARCHAR(20),
    AGENCY_NAME VARCHAR(200),
    IS_ACTIVE BOOLEAN DEFAULT TRUE,
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Example: Replace with your state's organizational structure
INSERT INTO GOVERNANCE.SECRETARIAT_AGENCIES
SELECT 'TECH', 'Technology & Security', 'ITD', 'IT Division', TRUE, CURRENT_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM GOVERNANCE.SECRETARIAT_AGENCIES WHERE AGENCY_CODE = 'ITD');

INSERT INTO GOVERNANCE.SECRETARIAT_AGENCIES
SELECT 'FIN', 'Administration & Finance', 'BUDGET', 'Budget Office', TRUE, CURRENT_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM GOVERNANCE.SECRETARIAT_AGENCIES WHERE AGENCY_CODE = 'BUDGET');

INSERT INTO GOVERNANCE.SECRETARIAT_AGENCIES
SELECT 'HHS', 'Health & Human Services', 'DPH', 'Public Health', TRUE, CURRENT_TIMESTAMP()
WHERE NOT EXISTS (SELECT 1 FROM GOVERNANCE.SECRETARIAT_AGENCIES WHERE AGENCY_CODE = 'DPH');

-- =============================================
-- STEP 3: Governance — Data Use Agreement
-- =============================================
CREATE TABLE IF NOT EXISTS GOVERNANCE.AGREEMENTS (
    AGREEMENT_ID VARCHAR(50),
    AGREEMENT_NAME VARCHAR(500),
    AGREEMENT_TYPE VARCHAR(50),
    STATUS VARCHAR(20) DEFAULT 'ACTIVE',
    EFFECTIVE_DATE DATE,
    EXPIRATION_DATE DATE,
    DATA_CLASSIFICATION VARCHAR(50),
    AI_PROCESSING_ALLOWED BOOLEAN DEFAULT FALSE,
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE TABLE IF NOT EXISTS GOVERNANCE.AGREEMENT_CLAUSES (
    CLAUSE_ID VARCHAR(50),
    AGREEMENT_ID VARCHAR(50),
    CLAUSE_TYPE VARCHAR(50),
    CLAUSE_TEXT VARCHAR,
    CREATED_AT TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- =============================================
-- STEP 4: Sample Data Tables
-- =============================================
-- Replace with your actual source tables or ETL targets

CREATE TABLE IF NOT EXISTS SAMPLE_DATA.SPENDING (
    AGENCY_CODE VARCHAR(20),
    AGENCY_NAME VARCHAR(200),
    SECRETARIAT_ID VARCHAR(10),
    FUND_CODE VARCHAR(20),
    FUND_NAME VARCHAR(200),
    FISCAL_PERIOD_DATE DATE,
    FISCAL_YEAR_LABEL VARCHAR(10),
    TOTAL_OBLIGATIONS NUMBER(18,2),
    TOTAL_EXPENDITURES NUMBER(18,2),
    BUDGET_AUTHORITY NUMBER(18,2)
);

CREATE TABLE IF NOT EXISTS SAMPLE_DATA.INVESTMENTS (
    PROJECT_ID VARCHAR(20),
    PROJECT_NAME VARCHAR(500),
    AGENCY_CODE VARCHAR(20),
    SECRETARIAT VARCHAR(10),
    POLICY_AREA VARCHAR(100),
    PROJECT_STATUS VARCHAR(50),
    FISCAL_YEAR_START NUMBER,
    PLANNED_BUDGET NUMBER(18,2),
    ACTUAL_SPEND NUMBER(18,2),
    PERCENT_COMPLETE NUMBER(5,2)
);

CREATE TABLE IF NOT EXISTS SAMPLE_DATA.PROCUREMENT (
    AWARD_ID VARCHAR(20),
    CONTRACT_NUMBER VARCHAR(50),
    VENDOR_NAME VARCHAR(500),
    AGENCY_CODE VARCHAR(20),
    CATEGORY VARCHAR(100),
    SET_ASIDE VARCHAR(100),
    AWARD_DATE DATE,
    AWARD_AMOUNT NUMBER(18,2)
);

CREATE TABLE IF NOT EXISTS SAMPLE_DATA.WORKFORCE (
    AGENCY_CODE VARCHAR(20),
    AGENCY_NAME VARCHAR(200),
    SECRETARIAT_ID VARCHAR(10),
    JOB_CLASSIFICATION VARCHAR(100),
    REPORTING_PERIOD_DATE DATE,
    POSITION_COUNT NUMBER,
    FILLED_POSITIONS NUMBER,
    SALARY_OBLIGATIONS NUMBER(18,2),
    VACANCY_RATE NUMBER(5,2)
);

-- =============================================
-- STEP 5: Staging Views (Swap Layer)
-- =============================================
-- Point FROM clause at your real source when ready

CREATE OR REPLACE VIEW STAGING.V_SPENDING AS
SELECT
    AGENCY_CODE,
    AGENCY_NAME,
    SECRETARIAT_ID,
    FUND_CODE,
    FUND_NAME,
    FISCAL_PERIOD_DATE,
    FISCAL_YEAR_LABEL,
    TOTAL_OBLIGATIONS,
    TOTAL_EXPENDITURES,
    BUDGET_AUTHORITY,
    TOTAL_OBLIGATIONS - TOTAL_EXPENDITURES AS UNLIQUIDATED_OBLIGATIONS,
    ROUND(TOTAL_EXPENDITURES / NULLIF(BUDGET_AUTHORITY, 0) * 100, 2) AS BURN_RATE_PCT
FROM SAMPLE_DATA.SPENDING;  -- SWAP: Change to your real source table

CREATE OR REPLACE VIEW STAGING.V_INVESTMENTS AS
SELECT
    PROJECT_ID,
    PROJECT_NAME,
    AGENCY_CODE,
    SECRETARIAT,
    POLICY_AREA,
    PROJECT_STATUS,
    FISCAL_YEAR_START,
    PLANNED_BUDGET,
    ACTUAL_SPEND,
    ACTUAL_SPEND - PLANNED_BUDGET AS VARIANCE_AMOUNT,
    ROUND((ACTUAL_SPEND - PLANNED_BUDGET) / NULLIF(PLANNED_BUDGET, 0) * 100, 2) AS VARIANCE_PCT,
    PERCENT_COMPLETE
FROM SAMPLE_DATA.INVESTMENTS;  -- SWAP: Change to your real source table

CREATE OR REPLACE VIEW STAGING.V_PROCUREMENT AS
SELECT * FROM SAMPLE_DATA.PROCUREMENT;  -- SWAP: Change to your real source table

CREATE OR REPLACE VIEW STAGING.V_WORKFORCE AS
SELECT * FROM SAMPLE_DATA.WORKFORCE;  -- SWAP: Change to your real source table

-- =============================================
-- STEP 6: Anomaly Detection Views
-- =============================================

-- Training data for Cortex ML (adjust date range to your data)
CREATE OR REPLACE VIEW STAGING.V_FORECAST_TRAINING AS
SELECT
    AGENCY_CODE,
    FISCAL_PERIOD_DATE,
    SUM(TOTAL_EXPENDITURES) AS TOTAL_EXPENDITURES
FROM STAGING.V_SPENDING
GROUP BY AGENCY_CODE, FISCAL_PERIOD_DATE;

-- Spend anomalies (statistical z-score approach, no Cortex ML dependency)
CREATE OR REPLACE VIEW STAGING.V_SPEND_ANOMALIES AS
SELECT
    s.AGENCY_CODE,
    s.AGENCY_NAME,
    s.SECRETARIAT_ID,
    s.FISCAL_PERIOD_DATE,
    s.TOTAL_EXPENDITURES,
    s.BUDGET_AUTHORITY,
    s.BURN_RATE_PCT,
    s.TOTAL_EXPENDITURES - AVG(s.TOTAL_EXPENDITURES) OVER (PARTITION BY s.AGENCY_CODE) AS SPEND_DEVIATION,
    ROUND(
        (s.TOTAL_EXPENDITURES - AVG(s.TOTAL_EXPENDITURES) OVER (PARTITION BY s.AGENCY_CODE))
        / NULLIF(STDDEV(s.TOTAL_EXPENDITURES) OVER (PARTITION BY s.AGENCY_CODE), 0),
    2) AS SPEND_DEVIATION_PCT,
    CASE
        WHEN ABS((s.TOTAL_EXPENDITURES - AVG(s.TOTAL_EXPENDITURES) OVER (PARTITION BY s.AGENCY_CODE))
            / NULLIF(STDDEV(s.TOTAL_EXPENDITURES) OVER (PARTITION BY s.AGENCY_CODE), 0)) > 3 THEN TRUE
        ELSE FALSE
    END AS IS_ANOMALY,
    CASE
        WHEN ABS((s.TOTAL_EXPENDITURES - AVG(s.TOTAL_EXPENDITURES) OVER (PARTITION BY s.AGENCY_CODE))
            / NULLIF(STDDEV(s.TOTAL_EXPENDITURES) OVER (PARTITION BY s.AGENCY_CODE), 0)) > 3 THEN 'Critical'
        WHEN ABS((s.TOTAL_EXPENDITURES - AVG(s.TOTAL_EXPENDITURES) OVER (PARTITION BY s.AGENCY_CODE))
            / NULLIF(STDDEV(s.TOTAL_EXPENDITURES) OVER (PARTITION BY s.AGENCY_CODE), 0)) > 2 THEN 'Warning'
        WHEN ABS((s.TOTAL_EXPENDITURES - AVG(s.TOTAL_EXPENDITURES) OVER (PARTITION BY s.AGENCY_CODE))
            / NULLIF(STDDEV(s.TOTAL_EXPENDITURES) OVER (PARTITION BY s.AGENCY_CODE), 0)) > 1 THEN 'Minor'
        ELSE NULL
    END AS ANOMALY_SEVERITY
FROM STAGING.V_SPENDING s;

-- Budget risk assessment (fiscal year aware)
-- Adjust fiscal year start month for your jurisdiction (July=7 for most US states)
CREATE OR REPLACE VIEW STAGING.V_BUDGET_RISK AS
WITH current_fy AS (
    SELECT
        CASE WHEN MONTH(CURRENT_DATE()) >= 7 THEN YEAR(CURRENT_DATE()) + 1
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
    CASE
        WHEN YTD_SPEND > BUDGET_AUTHORITY THEN 'Over Budget'
        WHEN (YTD_SPEND / NULLIF(PCT_FY_ELAPSED, 0)) > BUDGET_AUTHORITY * 1.1 THEN 'At Risk'
        WHEN (YTD_SPEND / NULLIF(PCT_FY_ELAPSED, 0)) < BUDGET_AUTHORITY * 0.7 THEN 'Under-Utilized'
        ELSE 'On Track'
    END AS BUDGET_RISK_LEVEL
FROM agency_ytd;

-- Procurement outliers (z-score + vendor concentration)
CREATE OR REPLACE VIEW STAGING.V_PROCUREMENT_OUTLIERS AS
WITH category_stats AS (
    SELECT
        CATEGORY,
        AVG(AWARD_AMOUNT) AS CATEGORY_AVG,
        STDDEV(AWARD_AMOUNT) AS CATEGORY_STDDEV
    FROM STAGING.V_PROCUREMENT
    GROUP BY CATEGORY
),
agency_hhi AS (
    SELECT
        p.AGENCY_CODE,
        ROUND(SUM(POWER(p.AWARD_AMOUNT / NULLIF(t.AGENCY_TOTAL, 0) * 100, 2)), 0) AS AGENCY_HHI
    FROM STAGING.V_PROCUREMENT p
    JOIN (
        SELECT AGENCY_CODE, SUM(AWARD_AMOUNT) AS AGENCY_TOTAL
        FROM STAGING.V_PROCUREMENT
        GROUP BY AGENCY_CODE
    ) t ON p.AGENCY_CODE = t.AGENCY_CODE
    GROUP BY p.AGENCY_CODE
)
SELECT
    p.*,
    cs.CATEGORY_AVG,
    cs.CATEGORY_STDDEV,
    ROUND((p.AWARD_AMOUNT - cs.CATEGORY_AVG) / NULLIF(cs.CATEGORY_STDDEV, 0), 2) AS Z_SCORE,
    CASE
        WHEN ABS((p.AWARD_AMOUNT - cs.CATEGORY_AVG) / NULLIF(cs.CATEGORY_STDDEV, 0)) > 2.0 THEN TRUE
        ELSE FALSE
    END AS IS_OUTLIER,
    h.AGENCY_HHI,
    CASE
        WHEN h.AGENCY_HHI > 2500 THEN 'High'
        WHEN h.AGENCY_HHI > 1500 THEN 'Moderate'
        ELSE 'Competitive'
    END AS CONCENTRATION_LEVEL
FROM STAGING.V_PROCUREMENT p
LEFT JOIN category_stats cs ON p.CATEGORY = cs.CATEGORY
LEFT JOIN agency_hhi h ON p.AGENCY_CODE = h.AGENCY_CODE;

-- =============================================
-- STEP 7: Semantic Model YAML Scaffold
-- =============================================
-- Save the following as semantic-model.yaml and deploy via:
--   PUT file://semantic-model.yaml @STAGING.SEMANTIC_STAGE AUTO_COMPRESS=FALSE OVERWRITE=TRUE;
--
-- name: {{ORG_NAME}}_FinOps
-- tables:
--   - name: SPENDING_BY_AGENCY
--     base_table:
--       database: {{DATABASE_NAME}}
--       schema: STAGING
--       table: V_SPENDING
--     dimensions:
--       - name: AGENCY_CODE
--       - name: AGENCY_NAME
--       - name: SECRETARIAT_ID
--       - name: FISCAL_YEAR_LABEL
--       - name: FISCAL_PERIOD_DATE
--     measures:
--       - name: TOTAL_OBLIGATIONS
--         expr: TOTAL_OBLIGATIONS
--         agg: sum
--       - name: TOTAL_EXPENDITURES
--         expr: TOTAL_EXPENDITURES
--         agg: sum
--       - name: BUDGET_AUTHORITY
--         expr: BUDGET_AUTHORITY
--         agg: sum
--       - name: BURN_RATE_PCT
--         expr: BURN_RATE_PCT
--         agg: avg
--
--   - name: CIP_INVESTMENTS
--     base_table:
--       database: {{DATABASE_NAME}}
--       schema: STAGING
--       table: V_INVESTMENTS
--     dimensions:
--       - name: PROJECT_ID
--       - name: PROJECT_NAME
--       - name: AGENCY_CODE
--       - name: PROJECT_STATUS
--     measures:
--       - name: PLANNED_BUDGET
--         expr: PLANNED_BUDGET
--         agg: sum
--       - name: ACTUAL_SPEND
--         expr: ACTUAL_SPEND
--         agg: sum
--
--   - name: PROCUREMENT_AWARDS
--     base_table:
--       database: {{DATABASE_NAME}}
--       schema: STAGING
--       table: V_PROCUREMENT
--     dimensions:
--       - name: VENDOR_NAME
--       - name: CATEGORY
--       - name: SET_ASIDE
--     measures:
--       - name: AWARD_AMOUNT
--         expr: AWARD_AMOUNT
--         agg: sum

-- =============================================
-- STEP 8: Cortex ML Models (run in Snowsight)
-- =============================================
-- Uncomment and run after loading data:
--
-- CREATE OR REPLACE SNOWFLAKE.ML.FORECAST STAGING.SPENDING_FORECAST(
--     INPUT_DATA => SYSTEM$REFERENCE('VIEW', 'STAGING.V_FORECAST_TRAINING'),
--     SERIES_COLNAME => 'AGENCY_CODE',
--     TIMESTAMP_COLNAME => 'FISCAL_PERIOD_DATE',
--     TARGET_COLNAME => 'TOTAL_EXPENDITURES',
--     CONFIG_OBJECT => {'ON_ERROR': 'SKIP'}
-- );
--
-- CREATE OR REPLACE SNOWFLAKE.ML.ANOMALY_DETECTION STAGING.SPENDING_ANOMALY(
--     INPUT_DATA => SYSTEM$REFERENCE('VIEW', 'STAGING.V_FORECAST_TRAINING'),
--     SERIES_COLNAME => 'AGENCY_CODE',
--     TIMESTAMP_COLNAME => 'FISCAL_PERIOD_DATE',
--     TARGET_COLNAME => 'TOTAL_EXPENDITURES',
--     LABEL_COLNAME => '',
--     CONFIG_OBJECT => {'ON_ERROR': 'SKIP'}
-- );

-- =============================================
-- Deployment Checklist
-- =============================================
-- [ ] Replace {{DATABASE_NAME}} with your database name
-- [ ] Replace {{ORG_NAME}} with your organization abbreviation
-- [ ] Update GOVERNANCE.SECRETARIAT_AGENCIES with your agency hierarchy
-- [ ] Load data into SAMPLE_DATA tables (or point staging views at real sources)
-- [ ] Create semantic-model.yaml from the scaffold above
-- [ ] Run Cortex ML model creation in Snowsight
-- [ ] Set up DULA agreement in GOVERNANCE.AGREEMENTS
-- [ ] Configure Data Sharing if needed (internal/external)
