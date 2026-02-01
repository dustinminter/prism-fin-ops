-- ============================================================================
-- PRISM FinOps Intelligence - Analytics Tables DDL
-- Federal Financial Data Warehouse Extension
-- ============================================================================
-- Purpose: Materialize analytics layer for Cortex model training, audit
--          traceability, and longitudinal performance baselines
-- Schema:  FEDERAL_FINANCIAL_DATA.ANALYTICS
-- Version: 1.0.0
-- ============================================================================

USE DATABASE FEDERAL_FINANCIAL_DATA;

-- Create dedicated analytics schema if not exists
CREATE SCHEMA IF NOT EXISTS ANALYTICS
    WITH MANAGED ACCESS
    COMMENT = 'PRISM FinOps Intelligence analytics layer - governed AI outputs';

USE SCHEMA ANALYTICS;

-- ============================================================================
-- 1. MONTHLY_SPENDING - Aggregated spending time series for forecasting
-- ============================================================================
-- Purpose: Pre-aggregated monthly spending data optimized for Cortex FORECAST
-- Retention: 7 years (federal record retention requirement)
-- ============================================================================

CREATE TABLE IF NOT EXISTS MONTHLY_SPENDING (
    -- Primary Key
    SPENDING_ID             VARCHAR(64)     NOT NULL PRIMARY KEY,

    -- Dimensional Keys
    AGENCY_CODE             VARCHAR(16)     NOT NULL,
    AGENCY_NAME             VARCHAR(256)    NOT NULL,
    FISCAL_YEAR             NUMBER(4)       NOT NULL,
    FISCAL_MONTH            NUMBER(2)       NOT NULL,
    CALENDAR_MONTH          DATE            NOT NULL,

    -- Spending Metrics
    TOTAL_OBLIGATIONS       NUMBER(18,2)    NOT NULL DEFAULT 0,
    AWARD_COUNT             NUMBER(12)      NOT NULL DEFAULT 0,
    AVG_AWARD_SIZE          NUMBER(18,2)    NOT NULL DEFAULT 0,
    MEDIAN_AWARD_SIZE       NUMBER(18,2),
    MAX_AWARD_SIZE          NUMBER(18,2),
    MIN_AWARD_SIZE          NUMBER(18,2),

    -- Derived Metrics
    MOM_CHANGE_PCT          NUMBER(8,4),    -- Month-over-month change
    YOY_CHANGE_PCT          NUMBER(8,4),    -- Year-over-year change
    ROLLING_3M_AVG          NUMBER(18,2),   -- 3-month rolling average
    ROLLING_6M_AVG          NUMBER(18,2),   -- 6-month rolling average
    ROLLING_12M_AVG         NUMBER(18,2),   -- 12-month rolling average

    -- Concentration Metrics
    UNIQUE_RECIPIENTS       NUMBER(12),
    TOP_RECIPIENT_PCT       NUMBER(8,4),    -- % of spend to top recipient
    HHI_INDEX               NUMBER(8,4),    -- Herfindahl-Hirschman Index

    -- Audit & Governance
    DATA_SOURCE             VARCHAR(64)     DEFAULT 'USASPENDING.AWARDS',
    AGGREGATION_TIMESTAMP   TIMESTAMP_NTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    RECORD_VERSION          NUMBER(4)       NOT NULL DEFAULT 1,
    IS_RESTATED             BOOLEAN         NOT NULL DEFAULT FALSE,
    RESTATEMENT_REASON      VARCHAR(512),

    -- Metadata
    CREATED_AT              TIMESTAMP_NTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    UPDATED_AT              TIMESTAMP_NTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
CLUSTER BY (AGENCY_CODE, CALENDAR_MONTH)
DATA_RETENTION_TIME_IN_DAYS = 2555  -- 7 years
COMMENT = 'Monthly aggregated federal spending by agency for Cortex FORECAST training';

-- Indexes for common query patterns
CREATE OR REPLACE INDEX IDX_MONTHLY_SPENDING_AGENCY
    ON MONTHLY_SPENDING (AGENCY_CODE, CALENDAR_MONTH);

CREATE OR REPLACE INDEX IDX_MONTHLY_SPENDING_FISCAL
    ON MONTHLY_SPENDING (FISCAL_YEAR, FISCAL_MONTH);

-- ============================================================================
-- 2. ANOMALIES - Detected spending anomalies with full audit trail
-- ============================================================================
-- Purpose: Persist Cortex ANOMALY_DETECTION outputs with governance workflow
-- Retention: 7 years (federal audit requirement)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ANOMALIES (
    -- Primary Key
    ANOMALY_ID              VARCHAR(64)     NOT NULL PRIMARY KEY,

    -- Detection Context
    AGENCY_CODE             VARCHAR(16)     NOT NULL,
    AGENCY_NAME             VARCHAR(256)    NOT NULL,
    DETECTION_MODEL         VARCHAR(64)     NOT NULL DEFAULT 'CORTEX_ANOMALY_DETECTION',
    MODEL_VERSION           VARCHAR(32),

    -- Anomaly Classification
    ANOMALY_TYPE            VARCHAR(64)     NOT NULL,
    -- Types: SPENDING_SPIKE, SPENDING_DROP, PATTERN_BREAK, RECIPIENT_CONCENTRATION,
    --        TIMING_ANOMALY, THRESHOLD_BREACH, FORECAST_DEVIATION

    SEVERITY                VARCHAR(16)     NOT NULL,
    -- Levels: INFO, WARNING, CRITICAL

    CONFIDENCE_SCORE        NUMBER(5,4),    -- 0.0000 to 1.0000

    -- Anomaly Metrics
    EXPECTED_VALUE          NUMBER(18,2)    NOT NULL,
    ACTUAL_VALUE            NUMBER(18,2)    NOT NULL,
    DEVIATION_PERCENT       NUMBER(8,2)     NOT NULL,
    DEVIATION_SIGMA         NUMBER(6,2),    -- Standard deviations from mean

    -- Temporal Context
    ANOMALY_PERIOD          DATE            NOT NULL,
    BASELINE_START          DATE,
    BASELINE_END            DATE,

    -- Description & Evidence
    DESCRIPTION             VARCHAR(2048)   NOT NULL,
    EVIDENCE_JSON           VARIANT,        -- Structured evidence bundle
    RELATED_AWARDS          ARRAY,          -- Array of AWARD_IDs

    -- Workflow State
    TRUST_STATE             VARCHAR(32)     NOT NULL DEFAULT 'DRAFT',
    -- States: DRAFT, INTERNAL, CLIENT, EXECUTIVE

    IS_ACKNOWLEDGED         BOOLEAN         NOT NULL DEFAULT FALSE,
    ACKNOWLEDGED_BY         VARCHAR(128),
    ACKNOWLEDGED_AT         TIMESTAMP_NTZ,
    ACKNOWLEDGMENT_REASON   VARCHAR(1024),

    IS_FALSE_POSITIVE       BOOLEAN         NOT NULL DEFAULT FALSE,
    FALSE_POSITIVE_REASON   VARCHAR(1024),

    -- Investigation Tracking
    INVESTIGATION_STATUS    VARCHAR(32)     DEFAULT 'PENDING',
    -- Statuses: PENDING, IN_REVIEW, RESOLVED, ESCALATED, DISMISSED

    ASSIGNED_TO             VARCHAR(128),
    RESOLUTION_NOTES        VARCHAR(4096),
    RESOLVED_AT             TIMESTAMP_NTZ,

    -- Audit Trail
    DETECTED_AT             TIMESTAMP_NTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    CREATED_AT              TIMESTAMP_NTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    UPDATED_AT              TIMESTAMP_NTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    CREATED_BY              VARCHAR(128)    DEFAULT 'SYSTEM',
    UPDATED_BY              VARCHAR(128)    DEFAULT 'SYSTEM'
)
CLUSTER BY (AGENCY_CODE, DETECTED_AT)
DATA_RETENTION_TIME_IN_DAYS = 2555  -- 7 years
COMMENT = 'Detected spending anomalies with full governance workflow and audit trail';

-- Indexes for operational queries
CREATE OR REPLACE INDEX IDX_ANOMALIES_UNACKNOWLEDGED
    ON ANOMALIES (IS_ACKNOWLEDGED, SEVERITY, DETECTED_AT)
    WHERE IS_ACKNOWLEDGED = FALSE;

CREATE OR REPLACE INDEX IDX_ANOMALIES_TRUST_STATE
    ON ANOMALIES (TRUST_STATE, AGENCY_CODE);

-- ============================================================================
-- 3. EXECUTIVE_NARRATIVES - AI-generated reports with Trust State governance
-- ============================================================================
-- Purpose: Persist Cortex COMPLETE outputs with evidence bundles and promotion workflow
-- Retention: 7 years (federal record retention)
-- ============================================================================

CREATE TABLE IF NOT EXISTS EXECUTIVE_NARRATIVES (
    -- Primary Key
    NARRATIVE_ID            VARCHAR(64)     NOT NULL PRIMARY KEY,

    -- Scope Definition
    SCOPE_TYPE              VARCHAR(32)     NOT NULL,
    -- Types: AGENCY, PORTFOLIO, GOVERNMENT_WIDE, AD_HOC

    SCOPE_ID                VARCHAR(64),    -- Agency code or portfolio ID
    SCOPE_NAME              VARCHAR(256),

    -- Temporal Coverage
    REPORTING_PERIOD_START  DATE            NOT NULL,
    REPORTING_PERIOD_END    DATE            NOT NULL,
    FISCAL_YEAR             NUMBER(4),
    FISCAL_QUARTER          NUMBER(1),

    -- Narrative Content
    NARRATIVE_TEXT          VARCHAR(16777216) NOT NULL,  -- Up to 16MB
    NARRATIVE_FORMAT        VARCHAR(16)     DEFAULT 'MARKDOWN',
    EXECUTIVE_SUMMARY       VARCHAR(4096),
    KEY_FINDINGS            ARRAY,          -- Array of finding strings
    RECOMMENDATIONS         ARRAY,          -- Array of recommendation strings

    -- Evidence & Provenance
    EVIDENCE_BUNDLE         VARIANT         NOT NULL,
    -- Structure: {metrics: [{metric, value, source, timestamp}], anomalies: [...], forecasts: [...]}

    SOURCE_QUERIES          ARRAY,          -- SQL queries used to generate evidence
    DATA_FRESHNESS          TIMESTAMP_NTZ,  -- Most recent data point used

    -- AI Generation Metadata
    MODEL_USED              VARCHAR(64)     NOT NULL DEFAULT 'mistral-large',
    MODEL_VERSION           VARCHAR(32),
    PROMPT_TEMPLATE         VARCHAR(64),
    GENERATION_PARAMS       VARIANT,        -- Temperature, tokens, etc.
    GENERATION_DURATION_MS  NUMBER(12),

    -- Trust State Governance
    TRUST_STATE             VARCHAR(32)     NOT NULL DEFAULT 'DRAFT',
    -- States: DRAFT, INTERNAL, CLIENT, EXECUTIVE

    -- Promotion Audit Trail
    PROMOTED_TO_INTERNAL_BY VARCHAR(128),
    PROMOTED_TO_INTERNAL_AT TIMESTAMP_NTZ,
    INTERNAL_REVIEW_NOTES   VARCHAR(4096),

    PROMOTED_TO_CLIENT_BY   VARCHAR(128),
    PROMOTED_TO_CLIENT_AT   TIMESTAMP_NTZ,
    CLIENT_REVIEW_NOTES     VARCHAR(4096),

    PROMOTED_TO_EXECUTIVE_BY VARCHAR(128),
    PROMOTED_TO_EXECUTIVE_AT TIMESTAMP_NTZ,
    EXECUTIVE_APPROVAL_NOTES VARCHAR(4096),

    -- Version Control
    VERSION_NUMBER          NUMBER(4)       NOT NULL DEFAULT 1,
    PARENT_NARRATIVE_ID     VARCHAR(64),    -- For revisions
    IS_CURRENT_VERSION      BOOLEAN         NOT NULL DEFAULT TRUE,
    SUPERSEDED_BY           VARCHAR(64),

    -- Distribution Tracking
    IS_DISTRIBUTED          BOOLEAN         NOT NULL DEFAULT FALSE,
    DISTRIBUTION_FORMAT     VARCHAR(16),    -- PDF, EMAIL, PORTAL
    DISTRIBUTED_AT          TIMESTAMP_NTZ,
    DISTRIBUTION_LIST       ARRAY,

    -- Audit Trail
    GENERATED_AT            TIMESTAMP_NTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    CREATED_AT              TIMESTAMP_NTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    UPDATED_AT              TIMESTAMP_NTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    CREATED_BY              VARCHAR(128)    DEFAULT 'SYSTEM',
    UPDATED_BY              VARCHAR(128)    DEFAULT 'SYSTEM'
)
CLUSTER BY (SCOPE_TYPE, SCOPE_ID, GENERATED_AT)
DATA_RETENTION_TIME_IN_DAYS = 2555  -- 7 years
COMMENT = 'AI-generated executive narratives with full Trust State governance workflow';

-- Index for current versions
CREATE OR REPLACE INDEX IDX_NARRATIVES_CURRENT
    ON EXECUTIVE_NARRATIVES (SCOPE_TYPE, SCOPE_ID, IS_CURRENT_VERSION)
    WHERE IS_CURRENT_VERSION = TRUE;

-- Index for Trust State workflow
CREATE OR REPLACE INDEX IDX_NARRATIVES_TRUST_STATE
    ON EXECUTIVE_NARRATIVES (TRUST_STATE, GENERATED_AT);

-- ============================================================================
-- 4. FORECAST_RESULTS - Persisted Cortex FORECAST outputs
-- ============================================================================
-- Purpose: Store forecast results for comparison, validation, and audit
-- ============================================================================

CREATE TABLE IF NOT EXISTS FORECAST_RESULTS (
    -- Primary Key
    FORECAST_ID             VARCHAR(64)     NOT NULL PRIMARY KEY,

    -- Forecast Scope
    AGENCY_CODE             VARCHAR(16),    -- NULL for government-wide
    AGENCY_NAME             VARCHAR(256),
    FORECAST_SCOPE          VARCHAR(32)     NOT NULL DEFAULT 'AGENCY',
    -- Scopes: AGENCY, PORTFOLIO, GOVERNMENT_WIDE

    -- Forecast Parameters
    FORECAST_HORIZON_MONTHS NUMBER(3)       NOT NULL DEFAULT 6,
    CONFIDENCE_INTERVAL     NUMBER(4,2)     NOT NULL DEFAULT 0.95,
    MODEL_USED              VARCHAR(64)     DEFAULT 'CORTEX_FORECAST',
    MODEL_VERSION           VARCHAR(32),
    TRAINING_DATA_START     DATE,
    TRAINING_DATA_END       DATE,

    -- Forecast Results (stored as array of monthly predictions)
    FORECAST_DATA           VARIANT         NOT NULL,
    -- Structure: [{date, predicted, lower_bound, upper_bound, confidence}]

    -- Validation Metrics (populated after actuals are available)
    MAPE                    NUMBER(8,4),    -- Mean Absolute Percentage Error
    RMSE                    NUMBER(18,2),   -- Root Mean Square Error
    ACCURACY_SCORE          NUMBER(5,4),    -- Custom accuracy metric

    -- Audit Trail
    GENERATED_AT            TIMESTAMP_NTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    CREATED_AT              TIMESTAMP_NTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    VALIDATED_AT            TIMESTAMP_NTZ,
    CREATED_BY              VARCHAR(128)    DEFAULT 'SYSTEM'
)
CLUSTER BY (AGENCY_CODE, GENERATED_AT)
DATA_RETENTION_TIME_IN_DAYS = 2555
COMMENT = 'Persisted Cortex FORECAST results for validation and audit';

-- ============================================================================
-- 5. NOTIFICATION_LOG - Audit trail for all system notifications
-- ============================================================================
-- Purpose: Track all anomaly alerts and notifications for compliance
-- ============================================================================

CREATE TABLE IF NOT EXISTS NOTIFICATION_LOG (
    -- Primary Key
    NOTIFICATION_ID         VARCHAR(64)     NOT NULL PRIMARY KEY,

    -- Notification Context
    NOTIFICATION_TYPE       VARCHAR(32)     NOT NULL,
    -- Types: ANOMALY_ALERT, FORECAST_DEVIATION, TRUST_STATE_CHANGE,
    --        NARRATIVE_READY, SYSTEM_ALERT

    SEVERITY                VARCHAR(16)     NOT NULL,
    -- Levels: INFO, WARNING, CRITICAL

    -- Source Reference
    SOURCE_TABLE            VARCHAR(64),
    SOURCE_ID               VARCHAR(64),

    -- Notification Content
    SUBJECT                 VARCHAR(512)    NOT NULL,
    BODY                    VARCHAR(16384)  NOT NULL,
    BODY_FORMAT             VARCHAR(16)     DEFAULT 'TEXT',

    -- Routing
    TRUST_STATE_REQUIRED    VARCHAR(32),    -- Minimum trust state to receive
    RECIPIENT_TYPE          VARCHAR(32)     NOT NULL,
    -- Types: USER, ROLE, CHANNEL, DISTRIBUTION_LIST

    RECIPIENT_ID            VARCHAR(128)    NOT NULL,
    CHANNEL                 VARCHAR(32)     NOT NULL,
    -- Channels: EMAIL, SLACK, TEAMS, PORTAL, SMS

    -- Delivery Status
    STATUS                  VARCHAR(32)     NOT NULL DEFAULT 'PENDING',
    -- Statuses: PENDING, SENT, DELIVERED, FAILED, BOUNCED

    SENT_AT                 TIMESTAMP_NTZ,
    DELIVERED_AT            TIMESTAMP_NTZ,
    FAILED_AT               TIMESTAMP_NTZ,
    FAILURE_REASON          VARCHAR(1024),
    RETRY_COUNT             NUMBER(3)       DEFAULT 0,

    -- Audit Trail
    CREATED_AT              TIMESTAMP_NTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP(),
    UPDATED_AT              TIMESTAMP_NTZ   NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
CLUSTER BY (NOTIFICATION_TYPE, CREATED_AT)
DATA_RETENTION_TIME_IN_DAYS = 2555
COMMENT = 'Audit trail for all PRISM notifications and alerts';

-- ============================================================================
-- STORED PROCEDURES - Data Population & Maintenance
-- ============================================================================

-- Procedure to aggregate monthly spending from AWARDS table
CREATE OR REPLACE PROCEDURE AGGREGATE_MONTHLY_SPENDING()
RETURNS VARCHAR
LANGUAGE SQL
AS
$$
DECLARE
    rows_inserted NUMBER;
BEGIN
    MERGE INTO ANALYTICS.MONTHLY_SPENDING tgt
    USING (
        SELECT
            CONCAT(AWARDING_AGENCY_CODE, '-', TO_CHAR(DATE_TRUNC('month', AWARD_DATE), 'YYYYMM')) AS SPENDING_ID,
            AWARDING_AGENCY_CODE AS AGENCY_CODE,
            AWARDING_AGENCY_NAME AS AGENCY_NAME,
            YEAR(AWARD_DATE) + CASE WHEN MONTH(AWARD_DATE) >= 10 THEN 1 ELSE 0 END AS FISCAL_YEAR,
            CASE
                WHEN MONTH(AWARD_DATE) >= 10 THEN MONTH(AWARD_DATE) - 9
                ELSE MONTH(AWARD_DATE) + 3
            END AS FISCAL_MONTH,
            DATE_TRUNC('month', AWARD_DATE) AS CALENDAR_MONTH,
            SUM(AWARD_AMOUNT) AS TOTAL_OBLIGATIONS,
            COUNT(*) AS AWARD_COUNT,
            AVG(AWARD_AMOUNT) AS AVG_AWARD_SIZE,
            MEDIAN(AWARD_AMOUNT) AS MEDIAN_AWARD_SIZE,
            MAX(AWARD_AMOUNT) AS MAX_AWARD_SIZE,
            MIN(AWARD_AMOUNT) AS MIN_AWARD_SIZE,
            COUNT(DISTINCT RECIPIENT_NAME) AS UNIQUE_RECIPIENTS
        FROM USASPENDING.AWARDS
        WHERE AWARD_DATE IS NOT NULL AND AWARDING_AGENCY_CODE IS NOT NULL
        GROUP BY AWARDING_AGENCY_CODE, AWARDING_AGENCY_NAME, DATE_TRUNC('month', AWARD_DATE)
    ) src
    ON tgt.SPENDING_ID = src.SPENDING_ID
    WHEN MATCHED THEN UPDATE SET
        TOTAL_OBLIGATIONS = src.TOTAL_OBLIGATIONS,
        AWARD_COUNT = src.AWARD_COUNT,
        AVG_AWARD_SIZE = src.AVG_AWARD_SIZE,
        MEDIAN_AWARD_SIZE = src.MEDIAN_AWARD_SIZE,
        MAX_AWARD_SIZE = src.MAX_AWARD_SIZE,
        MIN_AWARD_SIZE = src.MIN_AWARD_SIZE,
        UNIQUE_RECIPIENTS = src.UNIQUE_RECIPIENTS,
        AGGREGATION_TIMESTAMP = CURRENT_TIMESTAMP(),
        UPDATED_AT = CURRENT_TIMESTAMP()
    WHEN NOT MATCHED THEN INSERT (
        SPENDING_ID, AGENCY_CODE, AGENCY_NAME, FISCAL_YEAR, FISCAL_MONTH,
        CALENDAR_MONTH, TOTAL_OBLIGATIONS, AWARD_COUNT, AVG_AWARD_SIZE,
        MEDIAN_AWARD_SIZE, MAX_AWARD_SIZE, MIN_AWARD_SIZE, UNIQUE_RECIPIENTS
    ) VALUES (
        src.SPENDING_ID, src.AGENCY_CODE, src.AGENCY_NAME, src.FISCAL_YEAR, src.FISCAL_MONTH,
        src.CALENDAR_MONTH, src.TOTAL_OBLIGATIONS, src.AWARD_COUNT, src.AVG_AWARD_SIZE,
        src.MEDIAN_AWARD_SIZE, src.MAX_AWARD_SIZE, src.MIN_AWARD_SIZE, src.UNIQUE_RECIPIENTS
    );

    RETURN 'Monthly spending aggregation complete';
END;
$$;

-- ============================================================================
-- GRANTS - Role-Based Access Control
-- ============================================================================

-- Create analytics reader role
CREATE ROLE IF NOT EXISTS PRISM_ANALYTICS_READER;
GRANT USAGE ON DATABASE FEDERAL_FINANCIAL_DATA TO ROLE PRISM_ANALYTICS_READER;
GRANT USAGE ON SCHEMA ANALYTICS TO ROLE PRISM_ANALYTICS_READER;
GRANT SELECT ON ALL TABLES IN SCHEMA ANALYTICS TO ROLE PRISM_ANALYTICS_READER;

-- Create analytics writer role (for system processes)
CREATE ROLE IF NOT EXISTS PRISM_ANALYTICS_WRITER;
GRANT USAGE ON DATABASE FEDERAL_FINANCIAL_DATA TO ROLE PRISM_ANALYTICS_WRITER;
GRANT USAGE ON SCHEMA ANALYTICS TO ROLE PRISM_ANALYTICS_WRITER;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA ANALYTICS TO ROLE PRISM_ANALYTICS_WRITER;
GRANT USAGE ON ALL PROCEDURES IN SCHEMA ANALYTICS TO ROLE PRISM_ANALYTICS_WRITER;

-- Create governance admin role (for Trust State promotions)
CREATE ROLE IF NOT EXISTS PRISM_GOVERNANCE_ADMIN;
GRANT USAGE ON DATABASE FEDERAL_FINANCIAL_DATA TO ROLE PRISM_GOVERNANCE_ADMIN;
GRANT USAGE ON SCHEMA ANALYTICS TO ROLE PRISM_GOVERNANCE_ADMIN;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ANALYTICS TO ROLE PRISM_GOVERNANCE_ADMIN;

-- ============================================================================
-- COMMENTS - Schema Documentation
-- ============================================================================

COMMENT ON TABLE ANALYTICS.MONTHLY_SPENDING IS
'Pre-aggregated monthly federal spending by agency. Primary data source for Cortex FORECAST model training. Includes concentration metrics (HHI, top recipient %) for risk analysis. 7-year retention per federal requirements.';

COMMENT ON TABLE ANALYTICS.ANOMALIES IS
'Detected spending anomalies from Cortex ANOMALY_DETECTION and rule-based monitoring. Supports full investigation workflow (PENDING → IN_REVIEW → RESOLVED/ESCALATED/DISMISSED) with Trust State governance for visibility control.';

COMMENT ON TABLE ANALYTICS.EXECUTIVE_NARRATIVES IS
'AI-generated executive reports from Cortex COMPLETE. Each narrative includes full evidence bundle for auditability. Trust State workflow (DRAFT → INTERNAL → CLIENT → EXECUTIVE) controls distribution eligibility.';

COMMENT ON TABLE ANALYTICS.FORECAST_RESULTS IS
'Persisted Cortex FORECAST outputs. Enables forecast validation against actuals (MAPE, RMSE metrics) and longitudinal accuracy tracking. Critical for model governance and continuous improvement.';

COMMENT ON TABLE ANALYTICS.NOTIFICATION_LOG IS
'Complete audit trail of all system notifications and alerts. Required for federal compliance - demonstrates timely communication of material findings to appropriate stakeholders.';
