-- =============================================================================
-- 09-create-tasks.sql
-- PRISM Monthly Model Retraining Pipeline
-- =============================================================================
-- Automated monthly retraining of Cortex ML models (FORECAST + ANOMALY_DETECTION)
-- Deploy via Snowflake console or keypair script (MCP blocks CREATE TASK)
-- =============================================================================

USE DATABASE FEDERAL_FINANCIAL_DATA;
USE SCHEMA EOTSS_STAGING;

-- =============================================================================
-- Pipeline Run Log (audit table for task executions)
-- =============================================================================
CREATE TABLE IF NOT EXISTS EOTSS_STAGING.PIPELINE_RUN_LOG (
    run_id          VARCHAR(50) DEFAULT UUID_STRING(),
    task_name       VARCHAR(100),
    status          VARCHAR(20),   -- STARTED, COMPLETED, FAILED
    started_at      TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    completed_at    TIMESTAMP_NTZ,
    error_message   TEXT,
    rows_affected   NUMBER,
    metadata        VARIANT,
    PRIMARY KEY (run_id)
);

-- =============================================================================
-- Task 1: Root task - Monthly retraining trigger
-- Runs 1st of month at 3 AM ET
-- =============================================================================
CREATE OR REPLACE TASK EOTSS_STAGING.PRISM_MONTHLY_RETRAIN
    WAREHOUSE = PRISM_APP_WH
    SCHEDULE = 'USING CRON 0 3 1 * * America/New_York'
AS
    INSERT INTO EOTSS_STAGING.PIPELINE_RUN_LOG (task_name, status, metadata)
    SELECT
        'PRISM_MONTHLY_RETRAIN',
        'STARTED',
        OBJECT_CONSTRUCT(
            'trigger_time', CURRENT_TIMESTAMP(),
            'training_rows', (SELECT COUNT(*) FROM EOTSS_STAGING.V_FORECAST_TRAINING)
        );

-- =============================================================================
-- Task 2: Retrain anomaly detection model
-- Runs after root task
-- =============================================================================
CREATE OR REPLACE TASK EOTSS_STAGING.PRISM_RETRAIN_ANOMALY
    WAREHOUSE = PRISM_APP_WH
    AFTER EOTSS_STAGING.PRISM_MONTHLY_RETRAIN
AS
    BEGIN
        INSERT INTO EOTSS_STAGING.PIPELINE_RUN_LOG (task_name, status)
        SELECT 'PRISM_RETRAIN_ANOMALY', 'STARTED';

        -- Retrain the anomaly detection model (training subset only — detection view has later dates)
        CREATE OR REPLACE SNOWFLAKE.ML.ANOMALY_DETECTION EOTSS_STAGING.EOTSS_SPENDING_ANOMALY(
            INPUT_DATA => SYSTEM$REFERENCE('VIEW', 'EOTSS_STAGING.V_ANOMALY_TRAINING'),
            SERIES_COLNAME => 'AGENCY_CODE',
            TIMESTAMP_COLNAME => 'FISCAL_PERIOD_DATE',
            TARGET_COLNAME => 'TOTAL_EXPENDITURES',
            LABEL_COLNAME => '',
            CONFIG_OBJECT => {'ON_ERROR': 'SKIP'}
        );

        UPDATE EOTSS_STAGING.PIPELINE_RUN_LOG
        SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP()
        WHERE task_name = 'PRISM_RETRAIN_ANOMALY'
          AND status = 'STARTED';
    EXCEPTION
        WHEN OTHER THEN
            INSERT INTO EOTSS_STAGING.PIPELINE_RUN_LOG (task_name, status, error_message)
            SELECT 'PRISM_RETRAIN_ANOMALY', 'FAILED', SQLERRM;
    END;

-- =============================================================================
-- Task 3: Retrain forecast model (parallel with anomaly)
-- Runs after root task
-- =============================================================================
CREATE OR REPLACE TASK EOTSS_STAGING.PRISM_RETRAIN_FORECAST
    WAREHOUSE = PRISM_APP_WH
    AFTER EOTSS_STAGING.PRISM_MONTHLY_RETRAIN
AS
    BEGIN
        INSERT INTO EOTSS_STAGING.PIPELINE_RUN_LOG (task_name, status)
        SELECT 'PRISM_RETRAIN_FORECAST', 'STARTED';

        -- Retrain the forecast model with latest data
        CREATE OR REPLACE SNOWFLAKE.ML.FORECAST EOTSS_STAGING.EOTSS_SPENDING_FORECAST(
            INPUT_DATA => SYSTEM$REFERENCE('VIEW', 'EOTSS_STAGING.V_FORECAST_TRAINING'),
            SERIES_COLNAME => 'AGENCY_CODE',
            TIMESTAMP_COLNAME => 'FISCAL_PERIOD_DATE',
            TARGET_COLNAME => 'TOTAL_EXPENDITURES',
            CONFIG_OBJECT => {'ON_ERROR': 'SKIP'}
        );

        UPDATE EOTSS_STAGING.PIPELINE_RUN_LOG
        SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP()
        WHERE task_name = 'PRISM_RETRAIN_FORECAST'
          AND status = 'STARTED';
    EXCEPTION
        WHEN OTHER THEN
            INSERT INTO EOTSS_STAGING.PIPELINE_RUN_LOG (task_name, status, error_message)
            SELECT 'PRISM_RETRAIN_FORECAST', 'FAILED', SQLERRM;
    END;

-- =============================================================================
-- Task 4: Refresh anomaly detection results
-- Runs after anomaly model retrained
-- =============================================================================
CREATE OR REPLACE TASK EOTSS_STAGING.PRISM_REFRESH_ANOMALY_RESULTS
    WAREHOUSE = PRISM_APP_WH
    AFTER EOTSS_STAGING.PRISM_RETRAIN_ANOMALY
AS
    BEGIN
        INSERT INTO EOTSS_STAGING.PIPELINE_RUN_LOG (task_name, status)
        SELECT 'PRISM_REFRESH_ANOMALY_RESULTS', 'STARTED';

        TRUNCATE TABLE EOTSS_STAGING.SPEND_ANOMALY_RESULTS;

        INSERT INTO EOTSS_STAGING.SPEND_ANOMALY_RESULTS
        SELECT * FROM TABLE(EOTSS_STAGING.EOTSS_SPENDING_ANOMALY!DETECT_ANOMALIES(
            INPUT_DATA => SYSTEM$REFERENCE('VIEW', 'EOTSS_STAGING.V_ANOMALY_DETECTION'),
            SERIES_COLNAME => 'AGENCY_CODE',
            TIMESTAMP_COLNAME => 'FISCAL_PERIOD_DATE',
            TARGET_COLNAME => 'TOTAL_EXPENDITURES',
            CONFIG_OBJECT => {'prediction_interval': 0.99, 'on_error': 'skip'}
        ));

        UPDATE EOTSS_STAGING.PIPELINE_RUN_LOG
        SET status = 'COMPLETED',
            completed_at = CURRENT_TIMESTAMP(),
            rows_affected = (SELECT COUNT(*) FROM EOTSS_STAGING.SPEND_ANOMALY_RESULTS)
        WHERE task_name = 'PRISM_REFRESH_ANOMALY_RESULTS'
          AND status = 'STARTED';
    EXCEPTION
        WHEN OTHER THEN
            INSERT INTO EOTSS_STAGING.PIPELINE_RUN_LOG (task_name, status, error_message)
            SELECT 'PRISM_REFRESH_ANOMALY_RESULTS', 'FAILED', SQLERRM;
    END;

-- =============================================================================
-- Task 5: Refresh forecast results
-- Runs after forecast model retrained
-- =============================================================================
CREATE OR REPLACE TASK EOTSS_STAGING.PRISM_REFRESH_FORECAST_RESULTS
    WAREHOUSE = PRISM_APP_WH
    AFTER EOTSS_STAGING.PRISM_RETRAIN_FORECAST
AS
    BEGIN
        INSERT INTO EOTSS_STAGING.PIPELINE_RUN_LOG (task_name, status)
        SELECT 'PRISM_REFRESH_FORECAST_RESULTS', 'STARTED';

        TRUNCATE TABLE EOTSS_STAGING.BUDGET_FORECAST_RESULTS;

        INSERT INTO EOTSS_STAGING.BUDGET_FORECAST_RESULTS
        SELECT * FROM TABLE(EOTSS_STAGING.EOTSS_SPENDING_FORECAST!FORECAST(
            FORECASTING_PERIODS => 6,
            CONFIG_OBJECT => {'prediction_interval': 0.95}
        ));

        UPDATE EOTSS_STAGING.PIPELINE_RUN_LOG
        SET status = 'COMPLETED',
            completed_at = CURRENT_TIMESTAMP(),
            rows_affected = (SELECT COUNT(*) FROM EOTSS_STAGING.BUDGET_FORECAST_RESULTS)
        WHERE task_name = 'PRISM_REFRESH_FORECAST_RESULTS'
          AND status = 'STARTED';
    EXCEPTION
        WHEN OTHER THEN
            INSERT INTO EOTSS_STAGING.PIPELINE_RUN_LOG (task_name, status, error_message)
            SELECT 'PRISM_REFRESH_FORECAST_RESULTS', 'FAILED', SQLERRM;
    END;

-- =============================================================================
-- Resume tasks (child tasks first, then root)
-- =============================================================================
ALTER TASK EOTSS_STAGING.PRISM_REFRESH_ANOMALY_RESULTS RESUME;
ALTER TASK EOTSS_STAGING.PRISM_REFRESH_FORECAST_RESULTS RESUME;
ALTER TASK EOTSS_STAGING.PRISM_RETRAIN_ANOMALY RESUME;
ALTER TASK EOTSS_STAGING.PRISM_RETRAIN_FORECAST RESUME;
ALTER TASK EOTSS_STAGING.PRISM_MONTHLY_RETRAIN RESUME;

-- =============================================================================
-- Verification
-- =============================================================================
-- SHOW TASKS IN SCHEMA EOTSS_STAGING;
-- SELECT * FROM TABLE(INFORMATION_SCHEMA.TASK_HISTORY()) ORDER BY SCHEDULED_TIME DESC LIMIT 20;
-- SELECT * FROM EOTSS_STAGING.PIPELINE_RUN_LOG ORDER BY STARTED_AT DESC;
