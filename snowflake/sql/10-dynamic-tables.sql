-- =============================================================================
-- 10-dynamic-tables.sql
-- PRISM Dynamic Tables
-- =============================================================================
-- Replaces staging views with auto-refreshing dynamic tables
-- Deploy via Snowflake console or keypair script (MCP blocks CREATE DYNAMIC TABLE)
-- =============================================================================

USE DATABASE FEDERAL_FINANCIAL_DATA;
USE SCHEMA EOTSS_STAGING;

-- =============================================================================
-- DT_CIW_SPENDING: Materialized CIW spending with computed columns
-- Replaces V_CIW_SPENDING view
-- TARGET_LAG: 1 hour (source data updates infrequently)
-- =============================================================================
CREATE OR REPLACE DYNAMIC TABLE EOTSS_STAGING.DT_CIW_SPENDING
    TARGET_LAG = '1 hour'
    WAREHOUSE = PRISM_APP_WH
AS
    SELECT
        RECORD_ID,
        AGENCY_CODE,
        AGENCY_NAME,
        SECRETARIAT_ID,
        FUND_CODE,
        FUND_NAME,
        FISCAL_PERIOD_DATE,
        FISCAL_YEAR_LABEL,
        TOTAL_OBLIGATIONS,
        TOTAL_EXPENDITURES,
        COALESCE(BUDGET_AUTHORITY, ROUND(TOTAL_EXPENDITURES * 1.15, 2)) AS BUDGET_AUTHORITY,
        ROUND(TOTAL_OBLIGATIONS - TOTAL_EXPENDITURES, 2) AS UNLIQUIDATED_OBLIGATIONS,
        CASE
            WHEN COALESCE(ANNUAL_BUDGET_AUTHORITY, 0) > 0
            THEN ROUND(LEAST(YTD_EXPENDITURES / ANNUAL_BUDGET_AUTHORITY * 100, 999.99), 2)
            WHEN COALESCE(BUDGET_AUTHORITY, 0) > 0
            THEN ROUND(LEAST(TOTAL_EXPENDITURES / BUDGET_AUTHORITY * 100, 999.99), 2)
            ELSE 0
        END AS BURN_RATE_PCT
    FROM EOTSS_STAGING.CTHRU_SPENDING;

-- =============================================================================
-- DT_CIP_INVESTMENTS: Materialized CIP investments with variance
-- Replaces V_CIP_INVESTMENTS view
-- TARGET_LAG: 1 hour
-- =============================================================================
CREATE OR REPLACE DYNAMIC TABLE EOTSS_STAGING.DT_CIP_INVESTMENTS
    TARGET_LAG = '1 hour'
    WAREHOUSE = PRISM_APP_WH
AS
    SELECT
        PROJECT_ID,
        PROJECT_NAME,
        AGENCY_CODE,
        AGENCY_NAME,
        SECRETARIAT,
        POLICY_AREA,
        PROJECT_STATUS,
        FISCAL_YEAR_START,
        FISCAL_YEAR_START_DATE,
        FISCAL_YEAR_END,
        PLANNED_BUDGET,
        ACTUAL_SPEND,
        PERCENT_COMPLETE,
        PROJECT_MANAGER,
        ROUND(ACTUAL_SPEND - PLANNED_BUDGET, 2) AS VARIANCE_AMOUNT,
        CASE
            WHEN PLANNED_BUDGET > 0
            THEN ROUND((ACTUAL_SPEND - PLANNED_BUDGET) / PLANNED_BUDGET * 100, 2)
            ELSE 0
        END AS VARIANCE_PCT
    FROM EOTSS_POC.CIP_INVESTMENTS;

-- =============================================================================
-- DT_SPEND_ANOMALIES: Materialized spend anomaly classifications
-- Replaces V_SPEND_ANOMALIES view
-- TARGET_LAG: DOWNSTREAM (refreshes when SPEND_ANOMALY_RESULTS changes)
-- =============================================================================
CREATE OR REPLACE DYNAMIC TABLE EOTSS_STAGING.DT_SPEND_ANOMALIES
    TARGET_LAG = DOWNSTREAM
    WAREHOUSE = PRISM_APP_WH
AS
    WITH agency_meta AS (
        SELECT DISTINCT
            AGENCY_CODE,
            AGENCY_NAME,
            SECRETARIAT_ID
        FROM EOTSS_STAGING.DT_CIW_SPENDING
    )
    SELECT
        r.AGENCY_CODE,
        a.AGENCY_NAME,
        a.SECRETARIAT_ID,
        r.FISCAL_PERIOD_DATE::DATE AS FISCAL_PERIOD_DATE,
        r.TOTAL_EXPENDITURES AS ACTUAL_SPEND,
        ROUND(r.FORECAST, 2) AS EXPECTED_SPEND,
        ROUND(r.LOWER_BOUND, 2) AS LOWER_BOUND,
        ROUND(r.UPPER_BOUND, 2) AS UPPER_BOUND,
        r.IS_ANOMALY,
        ROUND(r.DISTANCE, 4) AS DISTANCE,
        ROUND(r.PERCENTILE, 4) AS PERCENTILE,
        CASE
            WHEN ABS(r.DISTANCE) > 3.0 THEN 'Critical'
            WHEN ABS(r.DISTANCE) > 2.0 THEN 'Warning'
            WHEN ABS(r.DISTANCE) > 1.0 THEN 'Minor'
            ELSE 'Normal'
        END AS ANOMALY_SEVERITY,
        CASE
            WHEN r.FORECAST > 0 THEN ROUND((r.TOTAL_EXPENDITURES - r.FORECAST) / r.FORECAST * 100, 2)
            ELSE 0
        END AS SPEND_DEVIATION_PCT
    FROM EOTSS_STAGING.SPEND_ANOMALY_RESULTS r
    LEFT JOIN agency_meta a ON r.AGENCY_CODE = a.AGENCY_CODE;

-- =============================================================================
-- DT_BUDGET_RISK: Materialized budget risk assessment
-- Replaces V_BUDGET_RISK view
-- TARGET_LAG: DOWNSTREAM (refreshes when BUDGET_FORECAST_RESULTS changes)
-- =============================================================================
CREATE OR REPLACE DYNAMIC TABLE EOTSS_STAGING.DT_BUDGET_RISK
    TARGET_LAG = DOWNSTREAM
    WAREHOUSE = PRISM_APP_WH
AS
    WITH fiscal_params AS (
        SELECT
            CASE
                WHEN MONTH(CURRENT_DATE()) >= 7 THEN YEAR(CURRENT_DATE())
                ELSE YEAR(CURRENT_DATE()) - 1
            END AS fy_start_year,
            'FY' || (
                CASE
                    WHEN MONTH(CURRENT_DATE()) >= 7 THEN YEAR(CURRENT_DATE()) + 1
                    ELSE YEAR(CURRENT_DATE())
                END
            )::VARCHAR AS fiscal_year_label
    ),
    ytd_actual AS (
        SELECT
            s.AGENCY_CODE,
            s.AGENCY_NAME,
            s.SECRETARIAT_ID,
            fp.fiscal_year_label AS FISCAL_YEAR,
            SUM(s.TOTAL_EXPENDITURES) AS YTD_SPEND
        FROM EOTSS_STAGING.DT_CIW_SPENDING s
        CROSS JOIN fiscal_params fp
        WHERE s.FISCAL_YEAR_LABEL = fp.fiscal_year_label
        GROUP BY s.AGENCY_CODE, s.AGENCY_NAME, s.SECRETARIAT_ID, fp.fiscal_year_label
    ),
    forecasted_remaining AS (
        SELECT
            f.AGENCY_CODE,
            fp.fiscal_year_label AS FISCAL_YEAR,
            SUM(f.FORECAST) AS FORECASTED_REMAINING
        FROM EOTSS_STAGING.BUDGET_FORECAST_RESULTS f
        CROSS JOIN fiscal_params fp
        WHERE f.FISCAL_PERIOD_DATE >= (
                SELECT DATEADD('month', 1, MAX(FISCAL_PERIOD_DATE))
                FROM EOTSS_STAGING.V_FORECAST_TRAINING
                WHERE AGENCY_CODE = f.AGENCY_CODE
              )
          AND f.FISCAL_PERIOD_DATE < DATE_FROM_PARTS(fp.fy_start_year + 1, 7, 1)
        GROUP BY f.AGENCY_CODE, fp.fiscal_year_label
    ),
    annual_budget AS (
        SELECT
            s.AGENCY_CODE,
            fp.fiscal_year_label AS FISCAL_YEAR,
            SUM(s.BUDGET_AUTHORITY) AS BUDGET_AUTHORITY
        FROM EOTSS_STAGING.DT_CIW_SPENDING s
        CROSS JOIN fiscal_params fp
        WHERE s.FISCAL_YEAR_LABEL = fp.fiscal_year_label
        GROUP BY s.AGENCY_CODE, fp.fiscal_year_label
    )
    SELECT
        y.AGENCY_CODE,
        y.AGENCY_NAME,
        y.SECRETARIAT_ID,
        y.FISCAL_YEAR,
        ROUND(y.YTD_SPEND, 2) AS YTD_SPEND,
        ROUND(COALESCE(fr.FORECASTED_REMAINING, 0), 2) AS FORECASTED_REMAINING,
        ROUND(y.YTD_SPEND + COALESCE(fr.FORECASTED_REMAINING, 0), 2) AS PROJECTED_YEAR_END,
        ROUND(ab.BUDGET_AUTHORITY, 2) AS BUDGET_AUTHORITY,
        ROUND(y.YTD_SPEND + COALESCE(fr.FORECASTED_REMAINING, 0) - ab.BUDGET_AUTHORITY, 2) AS PROJECTED_SURPLUS_DEFICIT,
        CASE
            WHEN ab.BUDGET_AUTHORITY > 0
            THEN ROUND((y.YTD_SPEND + COALESCE(fr.FORECASTED_REMAINING, 0)) / ab.BUDGET_AUTHORITY * 100, 2)
            ELSE 0
        END AS PROJECTED_BURN_RATE_PCT,
        CASE
            WHEN ab.BUDGET_AUTHORITY > 0 AND
                 (y.YTD_SPEND + COALESCE(fr.FORECASTED_REMAINING, 0)) / ab.BUDGET_AUTHORITY > 1.0
            THEN 'Over Budget'
            WHEN ab.BUDGET_AUTHORITY > 0 AND
                 (y.YTD_SPEND + COALESCE(fr.FORECASTED_REMAINING, 0)) / ab.BUDGET_AUTHORITY > 0.9
            THEN 'At Risk'
            WHEN ab.BUDGET_AUTHORITY > 0 AND
                 (y.YTD_SPEND + COALESCE(fr.FORECASTED_REMAINING, 0)) / ab.BUDGET_AUTHORITY > 0.5
            THEN 'On Track'
            ELSE 'Under-Utilized'
        END AS BUDGET_RISK_LEVEL
    FROM ytd_actual y
    LEFT JOIN forecasted_remaining fr
        ON y.AGENCY_CODE = fr.AGENCY_CODE AND y.FISCAL_YEAR = fr.FISCAL_YEAR
    LEFT JOIN annual_budget ab
        ON y.AGENCY_CODE = ab.AGENCY_CODE AND y.FISCAL_YEAR = ab.FISCAL_YEAR;

-- =============================================================================
-- DT_PROCUREMENT_OUTLIERS: Materialized procurement outlier analysis
-- Replaces V_PROCUREMENT_OUTLIERS view
-- TARGET_LAG: DOWNSTREAM (refreshes when source awards change)
-- =============================================================================
CREATE OR REPLACE DYNAMIC TABLE EOTSS_STAGING.DT_PROCUREMENT_OUTLIERS
    TARGET_LAG = DOWNSTREAM
    WAREHOUSE = PRISM_APP_WH
AS
    WITH category_stats AS (
        SELECT
            CATEGORY,
            AVG(AWARD_AMOUNT) AS CATEGORY_AVG,
            STDDEV(AWARD_AMOUNT) AS CATEGORY_STDDEV
        FROM EOTSS_POC.COMMBUYS_AWARDS
        GROUP BY CATEGORY
        HAVING COUNT(*) >= 2
    ),
    award_scores AS (
        SELECT
            a.AWARD_ID,
            a.VENDOR_NAME,
            a.AGENCY_CODE,
            a.CATEGORY,
            a.AWARD_DATE,
            a.AWARD_AMOUNT,
            ROUND(cs.CATEGORY_AVG, 2) AS CATEGORY_AVG,
            ROUND(cs.CATEGORY_STDDEV, 2) AS CATEGORY_STDDEV,
            CASE
                WHEN cs.CATEGORY_STDDEV > 0
                THEN ROUND((a.AWARD_AMOUNT - cs.CATEGORY_AVG) / cs.CATEGORY_STDDEV, 4)
                ELSE 0
            END AS Z_SCORE,
            CASE
                WHEN cs.CATEGORY_STDDEV > 0 AND
                     ABS((a.AWARD_AMOUNT - cs.CATEGORY_AVG) / cs.CATEGORY_STDDEV) > 2.0
                THEN TRUE
                ELSE FALSE
            END AS IS_OUTLIER
        FROM EOTSS_POC.COMMBUYS_AWARDS a
        LEFT JOIN category_stats cs ON a.CATEGORY = cs.CATEGORY
    ),
    agency_vendor_share AS (
        SELECT
            AGENCY_CODE,
            VENDOR_NAME,
            SUM(AWARD_AMOUNT) AS VENDOR_TOTAL,
            SUM(SUM(AWARD_AMOUNT)) OVER (PARTITION BY AGENCY_CODE) AS AGENCY_TOTAL,
            ROUND(SUM(AWARD_AMOUNT) / NULLIF(SUM(SUM(AWARD_AMOUNT)) OVER (PARTITION BY AGENCY_CODE), 0) * 100, 2) AS VENDOR_SHARE_PCT
        FROM EOTSS_POC.COMMBUYS_AWARDS
        GROUP BY AGENCY_CODE, VENDOR_NAME
    ),
    agency_hhi AS (
        SELECT
            AGENCY_CODE,
            ROUND(SUM(POWER(VENDOR_SHARE_PCT, 2)), 2) AS AGENCY_HHI,
            CASE
                WHEN SUM(POWER(VENDOR_SHARE_PCT, 2)) > 2500 THEN 'High'
                WHEN SUM(POWER(VENDOR_SHARE_PCT, 2)) > 1500 THEN 'Moderate'
                ELSE 'Competitive'
            END AS CONCENTRATION_LEVEL
        FROM agency_vendor_share
        GROUP BY AGENCY_CODE
    )
    SELECT
        aw.AWARD_ID,
        aw.VENDOR_NAME,
        aw.AGENCY_CODE,
        aw.CATEGORY,
        aw.AWARD_DATE,
        aw.AWARD_AMOUNT,
        aw.CATEGORY_AVG,
        aw.CATEGORY_STDDEV,
        aw.Z_SCORE,
        aw.IS_OUTLIER,
        hhi.AGENCY_HHI,
        hhi.CONCENTRATION_LEVEL
    FROM award_scores aw
    LEFT JOIN agency_hhi hhi ON aw.AGENCY_CODE = hhi.AGENCY_CODE;

-- =============================================================================
-- Verification
-- =============================================================================
-- SELECT * FROM TABLE(INFORMATION_SCHEMA.DYNAMIC_TABLE_REFRESH_HISTORY())
--   WHERE NAME IN ('DT_CIW_SPENDING', 'DT_CIP_INVESTMENTS', 'DT_SPEND_ANOMALIES', 'DT_BUDGET_RISK', 'DT_PROCUREMENT_OUTLIERS')
--   ORDER BY REFRESH_START_TIME DESC LIMIT 20;
--
-- SELECT 'DT_CIW_SPENDING' AS dt, COUNT(*) FROM EOTSS_STAGING.DT_CIW_SPENDING
-- UNION ALL SELECT 'DT_CIP_INVESTMENTS', COUNT(*) FROM EOTSS_STAGING.DT_CIP_INVESTMENTS
-- UNION ALL SELECT 'DT_SPEND_ANOMALIES', COUNT(*) FROM EOTSS_STAGING.DT_SPEND_ANOMALIES
-- UNION ALL SELECT 'DT_BUDGET_RISK', COUNT(*) FROM EOTSS_STAGING.DT_BUDGET_RISK
-- UNION ALL SELECT 'DT_PROCUREMENT_OUTLIERS', COUNT(*) FROM EOTSS_STAGING.DT_PROCUREMENT_OUTLIERS;
