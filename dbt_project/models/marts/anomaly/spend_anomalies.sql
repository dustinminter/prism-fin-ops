-- Spend anomaly classification view
-- Replaces EOTSS_STAGING.V_SPEND_ANOMALIES
-- Joins Cortex ML anomaly detection output with agency metadata
WITH agency_meta AS (
    SELECT DISTINCT
        AGENCY_CODE,
        AGENCY_NAME,
        SECRETARIAT_ID
    FROM {{ ref('stg_ciw_spending') }}
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
FROM {{ source('eotss_staging', 'SPEND_ANOMALY_RESULTS') }} r
LEFT JOIN agency_meta a ON r.AGENCY_CODE = a.AGENCY_CODE
