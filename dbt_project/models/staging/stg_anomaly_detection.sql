-- Detection subset for anomaly detection (last 7 months)
-- These are the periods where anomalies are evaluated
SELECT
    AGENCY_CODE,
    FISCAL_PERIOD_DATE,
    TOTAL_EXPENDITURES
FROM {{ source('eotss_staging', 'V_FORECAST_TRAINING') }}
WHERE FISCAL_PERIOD_DATE >= '2025-12-01'
