-- =============================================================================
-- 12-evaluations.sql
-- PRISM Model Evaluation Framework
-- =============================================================================
-- Tracks forecast accuracy (MAPE) and anomaly precision/recall
-- =============================================================================

USE DATABASE FEDERAL_FINANCIAL_DATA;
USE SCHEMA EOTSS_STAGING;

-- =============================================================================
-- Model evaluation log
-- =============================================================================
CREATE TABLE IF NOT EXISTS EOTSS_STAGING.MODEL_EVALUATION_LOG (
    evaluation_id   VARCHAR(50) DEFAULT UUID_STRING(),
    model_id        VARCHAR(100),
    model_version   VARCHAR(50),
    metric_name     VARCHAR(100),
    metric_value    NUMBER(10,6),
    evaluated_at    TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    evaluation_period_start DATE,
    evaluation_period_end   DATE,
    details         VARIANT,
    PRIMARY KEY (evaluation_id)
);

-- =============================================================================
-- Forecast accuracy: MAPE (Mean Absolute Percentage Error) per agency
-- =============================================================================
CREATE OR REPLACE VIEW EOTSS_STAGING.V_FORECAST_MAPE AS
WITH actuals AS (
    SELECT
        AGENCY_CODE,
        FISCAL_PERIOD_DATE,
        SUM(TOTAL_EXPENDITURES) AS ACTUAL_SPEND
    FROM EOTSS_STAGING.V_CIW_SPENDING
    GROUP BY AGENCY_CODE, FISCAL_PERIOD_DATE
),

forecasts AS (
    SELECT
        AGENCY_CODE,
        FISCAL_PERIOD_DATE,
        FORECAST AS FORECASTED_SPEND
    FROM EOTSS_STAGING.BUDGET_FORECAST_RESULTS
),

matched AS (
    SELECT
        a.AGENCY_CODE,
        a.FISCAL_PERIOD_DATE,
        a.ACTUAL_SPEND,
        f.FORECASTED_SPEND,
        CASE
            WHEN a.ACTUAL_SPEND != 0
            THEN ABS(a.ACTUAL_SPEND - f.FORECASTED_SPEND) / ABS(a.ACTUAL_SPEND)
            ELSE NULL
        END AS APE  -- Absolute Percentage Error
    FROM actuals a
    INNER JOIN forecasts f
        ON a.AGENCY_CODE = f.AGENCY_CODE
        AND a.FISCAL_PERIOD_DATE = f.FISCAL_PERIOD_DATE
)

SELECT
    AGENCY_CODE,
    COUNT(*) AS periods_evaluated,
    ROUND(AVG(APE) * 100, 2) AS MAPE_PCT,
    ROUND(MIN(APE) * 100, 2) AS MIN_APE_PCT,
    ROUND(MAX(APE) * 100, 2) AS MAX_APE_PCT,
    ROUND(MEDIAN(APE) * 100, 2) AS MEDIAN_APE_PCT,
    SUM(ACTUAL_SPEND) AS TOTAL_ACTUAL,
    SUM(FORECASTED_SPEND) AS TOTAL_FORECASTED
FROM matched
WHERE APE IS NOT NULL
GROUP BY AGENCY_CODE
ORDER BY MAPE_PCT DESC;

-- =============================================================================
-- Anomaly precision/recall
-- How many flagged anomalies were true positives?
-- True positive = flagged anomaly that was investigated and confirmed
-- =============================================================================
CREATE OR REPLACE VIEW EOTSS_STAGING.V_ANOMALY_PRECISION AS
WITH anomaly_flags AS (
    SELECT
        AGENCY_CODE,
        FISCAL_PERIOD_DATE,
        IS_ANOMALY,
        ANOMALY_SEVERITY,
        ACTUAL_SPEND,
        EXPECTED_SPEND,
        SPEND_DEVIATION_PCT
    FROM EOTSS_STAGING.V_SPEND_ANOMALIES
)

SELECT
    -- Overall counts
    COUNT(*) AS total_periods,
    SUM(CASE WHEN IS_ANOMALY THEN 1 ELSE 0 END) AS flagged_anomalies,
    SUM(CASE WHEN NOT IS_ANOMALY THEN 1 ELSE 0 END) AS normal_periods,

    -- By severity
    SUM(CASE WHEN ANOMALY_SEVERITY = 'Critical' THEN 1 ELSE 0 END) AS critical_count,
    SUM(CASE WHEN ANOMALY_SEVERITY = 'Warning' THEN 1 ELSE 0 END) AS warning_count,
    SUM(CASE WHEN ANOMALY_SEVERITY = 'Minor' THEN 1 ELSE 0 END) AS minor_count,

    -- Flag rate
    ROUND(SUM(CASE WHEN IS_ANOMALY THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0) * 100, 2) AS flag_rate_pct,

    -- Average deviation for flagged vs non-flagged
    AVG(CASE WHEN IS_ANOMALY THEN ABS(SPEND_DEVIATION_PCT) END) AS avg_deviation_flagged,
    AVG(CASE WHEN NOT IS_ANOMALY THEN ABS(SPEND_DEVIATION_PCT) END) AS avg_deviation_normal
FROM anomaly_flags;

-- =============================================================================
-- Populate initial evaluation log
-- =============================================================================
-- INSERT INTO EOTSS_STAGING.MODEL_EVALUATION_LOG (model_id, model_version, metric_name, metric_value, details)
-- SELECT
--     'EOTSS_SPENDING_FORECAST',
--     'v1.0',
--     'MAPE_' || AGENCY_CODE,
--     MAPE_PCT,
--     OBJECT_CONSTRUCT('periods', periods_evaluated, 'total_actual', TOTAL_ACTUAL, 'total_forecasted', TOTAL_FORECASTED)
-- FROM EOTSS_STAGING.V_FORECAST_MAPE;
