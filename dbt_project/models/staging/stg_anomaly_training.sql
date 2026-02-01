-- Training subset for anomaly detection (first 17 months)
-- DETECT_ANOMALIES requires evaluation timestamps AFTER training data
SELECT
    AGENCY_CODE,
    FISCAL_PERIOD_DATE,
    TOTAL_EXPENDITURES
FROM {{ source('eotss_staging', 'V_FORECAST_TRAINING') }}
WHERE FISCAL_PERIOD_DATE < '2025-12-01'
