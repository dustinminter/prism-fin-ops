-- Monthly aggregated training data for Cortex ML models
SELECT
    AGENCY_CODE,
    FISCAL_PERIOD_DATE,
    TOTAL_EXPENDITURES
FROM {{ source('eotss_staging', 'V_FORECAST_TRAINING') }}
