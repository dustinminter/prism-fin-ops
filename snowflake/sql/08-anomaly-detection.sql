-- =============================================================================
-- 08-anomaly-detection.sql
-- PRISM Anomaly Detection Layer: 3 modules for Intelligence agent
-- =============================================================================
-- Module 1: Spend Anomalies (Cortex ANOMALY_DETECTION)
-- Module 2: Budget Risk / Burn Rate Forecasting (Cortex FORECAST)
-- Module 3: Procurement Outliers (pure SQL z-score + HHI)
-- =============================================================================
-- NOTE: CALL statements are blocked by Snowflake MCP. Run via deploy_anomaly.py
-- or directly in the Snowflake console. DDL for result tables and views is here.
-- =============================================================================

USE DATABASE FEDERAL_FINANCIAL_DATA;
USE SCHEMA EOTSS_STAGING;

-- =============================================================================
-- MODULE 1: Spend Anomalies
-- Source: EOTSS_SPENDING_ANOMALY model (trained in 04-cortex-models.sql)
-- =============================================================================

-- Result table for anomaly detection output
CREATE TABLE IF NOT EXISTS EOTSS_STAGING.SPEND_ANOMALY_RESULTS (
    AGENCY_CODE         VARCHAR(20),
    FISCAL_PERIOD_DATE  TIMESTAMP_NTZ,
    TOTAL_EXPENDITURES  NUMBER(38,2),
    FORECAST            NUMBER(38,6),
    LOWER_BOUND         NUMBER(38,6),
    UPPER_BOUND         NUMBER(38,6),
    IS_ANOMALY          BOOLEAN,
    PERCENTILE          NUMBER(10,6),
    DISTANCE            NUMBER(10,6)
);

-- Populate via: (run in deploy_anomaly.py)
-- TRUNCATE TABLE EOTSS_STAGING.SPEND_ANOMALY_RESULTS;
-- INSERT INTO EOTSS_STAGING.SPEND_ANOMALY_RESULTS
-- SELECT * FROM TABLE(EOTSS_STAGING.EOTSS_SPENDING_ANOMALY!DETECT_ANOMALIES(
--     INPUT_DATA => SYSTEM$REFERENCE('VIEW', 'EOTSS_STAGING.V_FORECAST_TRAINING'),
--     SERIES_COLNAME => 'AGENCY_CODE',
--     TIMESTAMP_COLNAME => 'FISCAL_PERIOD_DATE',
--     TARGET_COLNAME => 'TOTAL_EXPENDITURES',
--     CONFIG_OBJECT => {'prediction_interval': 0.95}
-- ));

-- Staging view joining anomaly results with agency metadata
CREATE OR REPLACE VIEW EOTSS_STAGING.V_SPEND_ANOMALIES AS
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
    -- Severity classification based on distance (standard deviations)
    CASE
        WHEN ABS(r.DISTANCE) > 3.0 THEN 'Critical'
        WHEN ABS(r.DISTANCE) > 2.0 THEN 'Warning'
        WHEN ABS(r.DISTANCE) > 1.0 THEN 'Minor'
        ELSE 'Normal'
    END AS ANOMALY_SEVERITY,
    -- Deviation percentage: how far actual is from expected
    CASE
        WHEN r.FORECAST > 0 THEN ROUND((r.TOTAL_EXPENDITURES - r.FORECAST) / r.FORECAST * 100, 2)
        ELSE 0
    END AS SPEND_DEVIATION_PCT
FROM EOTSS_STAGING.SPEND_ANOMALY_RESULTS r
LEFT JOIN (
    SELECT DISTINCT AGENCY_CODE, AGENCY_NAME, SECRETARIAT_ID
    FROM EOTSS_STAGING.V_CIW_SPENDING
) a ON r.AGENCY_CODE = a.AGENCY_CODE;


-- =============================================================================
-- MODULE 2: Budget Risk / Burn Rate Forecasting
-- Source: EOTSS_SPENDING_FORECAST model (trained in 04-cortex-models.sql)
-- =============================================================================

-- Result table for forecast output
CREATE TABLE IF NOT EXISTS EOTSS_STAGING.BUDGET_FORECAST_RESULTS (
    AGENCY_CODE         VARCHAR(20),
    FISCAL_PERIOD_DATE  TIMESTAMP_NTZ,
    FORECAST            NUMBER(38,6),
    LOWER_BOUND         NUMBER(38,6),
    UPPER_BOUND         NUMBER(38,6)
);

-- Populate via: (run in deploy_anomaly.py)
-- TRUNCATE TABLE EOTSS_STAGING.BUDGET_FORECAST_RESULTS;
-- INSERT INTO EOTSS_STAGING.BUDGET_FORECAST_RESULTS
-- SELECT * FROM TABLE(EOTSS_STAGING.EOTSS_SPENDING_FORECAST!FORECAST(
--     FORECASTING_PERIODS => 6,
--     CONFIG_OBJECT => {'prediction_interval': 0.95}
-- ));

-- Budget risk view: YTD actual + forecasted remaining vs budget authority
CREATE OR REPLACE VIEW EOTSS_STAGING.V_BUDGET_RISK AS
WITH
-- Determine the current fiscal year boundary
-- MA fiscal year: Jul 1 - Jun 30
fiscal_params AS (
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

-- YTD actual spend per agency in current fiscal year
ytd_actual AS (
    SELECT
        s.AGENCY_CODE,
        s.AGENCY_NAME,
        s.SECRETARIAT_ID,
        fp.fiscal_year_label AS FISCAL_YEAR,
        SUM(s.TOTAL_EXPENDITURES) AS YTD_SPEND
    FROM EOTSS_STAGING.V_CIW_SPENDING s
    CROSS JOIN fiscal_params fp
    WHERE s.FISCAL_YEAR_LABEL = fp.fiscal_year_label
    GROUP BY s.AGENCY_CODE, s.AGENCY_NAME, s.SECRETARIAT_ID, fp.fiscal_year_label
),

-- Forecasted remaining spend from ML model (months beyond latest actual)
forecasted_remaining AS (
    SELECT
        f.AGENCY_CODE,
        fp.fiscal_year_label AS FISCAL_YEAR,
        SUM(f.FORECAST) AS FORECASTED_REMAINING
    FROM EOTSS_STAGING.BUDGET_FORECAST_RESULTS f
    CROSS JOIN fiscal_params fp
    -- Only include forecast months within the current fiscal year
    WHERE f.FISCAL_PERIOD_DATE >= (
            SELECT DATEADD('month', 1, MAX(FISCAL_PERIOD_DATE))
            FROM EOTSS_STAGING.V_FORECAST_TRAINING
            WHERE AGENCY_CODE = f.AGENCY_CODE
          )
      AND f.FISCAL_PERIOD_DATE < DATE_FROM_PARTS(fp.fy_start_year + 1, 7, 1)
    GROUP BY f.AGENCY_CODE, fp.fiscal_year_label
),

-- Annual budget authority per agency (sum monthly budget authority for the FY)
annual_budget AS (
    SELECT
        s.AGENCY_CODE,
        fp.fiscal_year_label AS FISCAL_YEAR,
        SUM(s.BUDGET_AUTHORITY) AS BUDGET_AUTHORITY
    FROM EOTSS_STAGING.V_CIW_SPENDING s
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
-- MODULE 3: Procurement Outliers (pure SQL — no ML model)
-- Source: V_COMMBUYS_AWARDS
-- Uses z-score for amount outliers + HHI for vendor concentration
-- =============================================================================

CREATE OR REPLACE VIEW EOTSS_STAGING.V_PROCUREMENT_OUTLIERS AS
WITH
-- Per-category statistics
category_stats AS (
    SELECT
        CATEGORY,
        AVG(AWARD_AMOUNT) AS CATEGORY_AVG,
        STDDEV(AWARD_AMOUNT) AS CATEGORY_STDDEV
    FROM EOTSS_STAGING.V_COMMBUYS_AWARDS
    GROUP BY CATEGORY
    HAVING COUNT(*) >= 2  -- need at least 2 awards for meaningful stats
),

-- Per award: z-score
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
    FROM EOTSS_STAGING.V_COMMBUYS_AWARDS a
    LEFT JOIN category_stats cs ON a.CATEGORY = cs.CATEGORY
),

-- Per agency: vendor share and HHI (Herfindahl-Hirschman Index)
agency_vendor_share AS (
    SELECT
        AGENCY_CODE,
        VENDOR_NAME,
        SUM(AWARD_AMOUNT) AS VENDOR_TOTAL,
        SUM(SUM(AWARD_AMOUNT)) OVER (PARTITION BY AGENCY_CODE) AS AGENCY_TOTAL,
        ROUND(SUM(AWARD_AMOUNT) / NULLIF(SUM(SUM(AWARD_AMOUNT)) OVER (PARTITION BY AGENCY_CODE), 0) * 100, 2) AS VENDOR_SHARE_PCT
    FROM EOTSS_STAGING.V_COMMBUYS_AWARDS
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
-- Verification queries (run after deploy_anomaly.py populates result tables)
-- =============================================================================

-- Module 1: Check for flagged anomalies
-- SELECT * FROM EOTSS_STAGING.V_SPEND_ANOMALIES WHERE IS_ANOMALY = TRUE ORDER BY DISTANCE DESC;

-- Module 2: Check budget risk levels
-- SELECT * FROM EOTSS_STAGING.V_BUDGET_RISK ORDER BY PROJECTED_BURN_RATE_PCT DESC;

-- Module 3: Check procurement outliers and concentration
-- SELECT * FROM EOTSS_STAGING.V_PROCUREMENT_OUTLIERS WHERE IS_OUTLIER = TRUE ORDER BY Z_SCORE DESC;
-- SELECT AGENCY_CODE, AGENCY_HHI, CONCENTRATION_LEVEL FROM EOTSS_STAGING.V_PROCUREMENT_OUTLIERS GROUP BY 1,2,3 ORDER BY AGENCY_HHI DESC;
