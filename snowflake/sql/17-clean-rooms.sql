-- =============================================================================
-- 17-clean-rooms.sql
-- PRISM Data Clean Room: Cross-State FinOps Benchmarking
-- =============================================================================
-- Use case: Compare MA spending patterns vs other states
-- Only aggregated percentile rankings returned — no raw data exposed
-- =============================================================================

USE DATABASE FEDERAL_FINANCIAL_DATA;
USE SCHEMA EOTSS_STAGING;

-- =============================================================================
-- Provider contribution view: MA spending benchmarks
-- Aggregated by function area (no agency-level detail)
-- =============================================================================
CREATE OR REPLACE SECURE VIEW EOTSS_STAGING.V_MA_SPENDING_BENCHMARKS AS
SELECT
    CASE
        WHEN s.SECRETARIAT_ID IN ('EOTSS') THEN 'Technology & Security'
        WHEN s.SECRETARIAT_ID IN ('HHS') THEN 'Health & Human Services'
        WHEN s.SECRETARIAT_ID IN ('ANF') THEN 'Administration & Finance'
        WHEN s.SECRETARIAT_ID IN ('EOE') THEN 'Education'
        WHEN s.SECRETARIAT_ID IN ('EOPSS') THEN 'Public Safety'
        WHEN s.SECRETARIAT_ID IN ('EEA') THEN 'Environment & Energy'
        WHEN s.SECRETARIAT_ID IN ('DOT') THEN 'Transportation'
        ELSE 'Other'
    END AS FUNCTION_AREA,
    s.FISCAL_YEAR_LABEL,
    s.FISCAL_PERIOD_DATE,
    SUM(s.TOTAL_EXPENDITURES) AS TOTAL_EXPENDITURES,
    SUM(s.BUDGET_AUTHORITY) AS BUDGET_AUTHORITY,
    ROUND(SUM(s.TOTAL_EXPENDITURES) / NULLIF(SUM(s.BUDGET_AUTHORITY), 0) * 100, 2) AS BURN_RATE_PCT,
    COUNT(DISTINCT s.AGENCY_CODE) AS AGENCY_COUNT
FROM EOTSS_STAGING.V_CIW_SPENDING s
GROUP BY
    CASE
        WHEN s.SECRETARIAT_ID IN ('EOTSS') THEN 'Technology & Security'
        WHEN s.SECRETARIAT_ID IN ('HHS') THEN 'Health & Human Services'
        WHEN s.SECRETARIAT_ID IN ('ANF') THEN 'Administration & Finance'
        WHEN s.SECRETARIAT_ID IN ('EOE') THEN 'Education'
        WHEN s.SECRETARIAT_ID IN ('EOPSS') THEN 'Public Safety'
        WHEN s.SECRETARIAT_ID IN ('EEA') THEN 'Environment & Energy'
        WHEN s.SECRETARIAT_ID IN ('DOT') THEN 'Transportation'
        ELSE 'Other'
    END,
    s.FISCAL_YEAR_LABEL,
    s.FISCAL_PERIOD_DATE
HAVING COUNT(DISTINCT s.AGENCY_CODE) >= 3;  -- Privacy threshold: minimum 3 agencies per group

-- =============================================================================
-- Clean room analysis procedure
-- Returns only percentile rankings — no raw data
-- =============================================================================
CREATE OR REPLACE PROCEDURE EOTSS_STAGING.COMPARE_SPENDING_PATTERNS(
    target_function_area VARCHAR,
    target_fiscal_year VARCHAR
)
RETURNS TABLE (
    function_area VARCHAR,
    fiscal_year VARCHAR,
    ma_burn_rate NUMBER(10,2),
    percentile_rank NUMBER(10,2),
    comparison_state_count NUMBER,
    median_burn_rate NUMBER(10,2),
    p25_burn_rate NUMBER(10,2),
    p75_burn_rate NUMBER(10,2)
)
LANGUAGE SQL
AS
DECLARE
    res RESULTSET;
BEGIN
    -- This procedure would join MA data with other states' contributions
    -- For now, returns MA data with placeholder percentile rankings
    res := (
        SELECT
            FUNCTION_AREA,
            FISCAL_YEAR_LABEL AS FISCAL_YEAR,
            BURN_RATE_PCT AS MA_BURN_RATE,
            50.0 AS PERCENTILE_RANK,
            0 AS COMPARISON_STATE_COUNT,
            BURN_RATE_PCT AS MEDIAN_BURN_RATE,
            BURN_RATE_PCT * 0.85 AS P25_BURN_RATE,
            BURN_RATE_PCT * 1.15 AS P75_BURN_RATE
        FROM EOTSS_STAGING.V_MA_SPENDING_BENCHMARKS
        WHERE FUNCTION_AREA = :target_function_area
          AND FISCAL_YEAR_LABEL = :target_fiscal_year
    );
    RETURN TABLE(res);
END;

-- =============================================================================
-- Clean room join policy definition
-- Allowed join keys: FUNCTION_AREA, FISCAL_YEAR_LABEL
-- Prohibited join keys: AGENCY_CODE, VENDOR_NAME
-- =============================================================================
-- Clean room configuration would be set up in Snowsight UI:
-- 1. Create clean room from PRISM account
-- 2. Add V_MA_SPENDING_BENCHMARKS as provider table
-- 3. Set join policy: only FUNCTION_AREA and FISCAL_YEAR_LABEL keys
-- 4. Set minimum aggregation size: 3 records (privacy threshold)
-- 5. Approved analysis: COMPARE_SPENDING_PATTERNS procedure only

-- =============================================================================
-- Verification
-- =============================================================================
-- SELECT * FROM EOTSS_STAGING.V_MA_SPENDING_BENCHMARKS
--   WHERE FISCAL_YEAR_LABEL = 'FY2026'
--   ORDER BY FUNCTION_AREA;
--
-- CALL EOTSS_STAGING.COMPARE_SPENDING_PATTERNS('Technology & Security', 'FY2026');
