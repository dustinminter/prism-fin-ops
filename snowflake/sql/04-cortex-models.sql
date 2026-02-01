-- =============================================================================
-- 04-cortex-models.sql
-- Cortex AI Model Configuration: FORECAST + ANOMALY_DETECTION
-- =============================================================================
-- Following the pattern in docs/snowflake-ddl.sql lines 208-227
-- These models train on the staging views (24+ months of CIW spending data)
-- =============================================================================

USE SCHEMA EOTSS_STAGING;

-- =============================================================================
-- FORECAST MODEL
-- Trained on monthly spending data, produces 6-month forward predictions
-- Series: one forecast per agency
-- =============================================================================

-- Prepare training data view (FORECAST requires a simple 3-column input)
CREATE OR REPLACE VIEW EOTSS_STAGING.V_FORECAST_TRAINING AS
SELECT
    AGENCY_CODE,
    FISCAL_PERIOD_DATE,
    SUM(TOTAL_EXPENDITURES) AS TOTAL_EXPENDITURES
FROM EOTSS_STAGING.V_CIW_SPENDING
GROUP BY AGENCY_CODE, FISCAL_PERIOD_DATE
ORDER BY AGENCY_CODE, FISCAL_PERIOD_DATE;

-- Create the forecast model
-- Note: Requires 24+ data points per series for reliable forecasts.
-- The sample data provides 24 months per agency across 4 fund codes,
-- aggregated to ~24 monthly data points per agency.
CREATE OR REPLACE SNOWFLAKE.ML.FORECAST EOTSS_STAGING.EOTSS_SPENDING_FORECAST(
    INPUT_DATA => SYSTEM$REFERENCE('VIEW', 'EOTSS_STAGING.V_FORECAST_TRAINING'),
    SERIES_COLNAME => 'AGENCY_CODE',
    TIMESTAMP_COLNAME => 'FISCAL_PERIOD_DATE',
    TARGET_COLNAME => 'TOTAL_EXPENDITURES',
    CONFIG_OBJECT => {'ON_ERROR': 'SKIP'}
);

-- Generate 6-month forecast
-- Usage: Call the model to get predictions
/*
CALL EOTSS_STAGING.EOTSS_SPENDING_FORECAST!FORECAST(
    FORECASTING_PERIODS => 6,
    CONFIG_OBJECT => {'prediction_interval': 0.95}
);
*/

-- =============================================================================
-- ANOMALY DETECTION MODEL
-- Trained on the same monthly spending data
-- Flags statistical outliers in spending patterns
-- =============================================================================

-- Create the anomaly detection model
CREATE OR REPLACE SNOWFLAKE.ML.ANOMALY_DETECTION EOTSS_STAGING.EOTSS_SPENDING_ANOMALY(
    INPUT_DATA => SYSTEM$REFERENCE('VIEW', 'EOTSS_STAGING.V_FORECAST_TRAINING'),
    SERIES_COLNAME => 'AGENCY_CODE',
    TIMESTAMP_COLNAME => 'FISCAL_PERIOD_DATE',
    TARGET_COLNAME => 'TOTAL_EXPENDITURES',
    LABEL_COLNAME => '',
    CONFIG_OBJECT => {'ON_ERROR': 'SKIP'}
);

-- Detect anomalies in historical data
-- Usage: Call the model with new data to check for anomalies
/*
CALL EOTSS_STAGING.EOTSS_SPENDING_ANOMALY!DETECT_ANOMALIES(
    INPUT_DATA => SYSTEM$REFERENCE('VIEW', 'EOTSS_STAGING.V_FORECAST_TRAINING'),
    SERIES_COLNAME => 'AGENCY_CODE',
    TIMESTAMP_COLNAME => 'FISCAL_PERIOD_DATE',
    TARGET_COLNAME => 'TOTAL_EXPENDITURES',
    CONFIG_OBJECT => {'prediction_interval': 0.95}
);
*/

-- =============================================================================
-- Verification: Check that models were created
-- =============================================================================
SHOW SNOWFLAKE.ML.FORECAST IN SCHEMA EOTSS_STAGING;
SHOW SNOWFLAKE.ML.ANOMALY_DETECTION IN SCHEMA EOTSS_STAGING;
