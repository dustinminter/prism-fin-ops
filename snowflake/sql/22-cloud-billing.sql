-- =============================================================================
-- 22-cloud-billing.sql
-- Cloud Billing Integration (AWS, Azure, GCP)
-- =============================================================================
-- Multi-cloud cost data pipeline: raw staging → mapping → aggregated → view.
-- Initial support for AWS Cost Explorer; Azure and GCP follow same pattern.
--
-- Deploy via: python3 ~/Desktop/maios/scripts/snow_deploy.py prism 22
-- =============================================================================

USE DATABASE FEDERAL_FINANCIAL_DATA;
USE SCHEMA EOTSS_STAGING;

-- =============================================================================
-- STEP 1: Raw staging tables — one per cloud provider
-- =============================================================================

-- AWS Cost and Usage Report (CUR) or Cost Explorer API output
CREATE TABLE IF NOT EXISTS EOTSS_STAGING.AWS_BILLING_RAW (
    LINE_ITEM_ID           VARCHAR(200),
    BILLING_PERIOD_START   DATE,
    BILLING_PERIOD_END     DATE,
    ACCOUNT_ID             VARCHAR(20),
    ACCOUNT_NAME           VARCHAR(200),
    SERVICE_CODE           VARCHAR(100),
    SERVICE_NAME           VARCHAR(200),
    USAGE_TYPE             VARCHAR(200),
    OPERATION              VARCHAR(200),
    REGION                 VARCHAR(50),
    AVAILABILITY_ZONE      VARCHAR(50),
    RESOURCE_ID            VARCHAR(500),
    UNBLENDED_COST         NUMBER(18,6),
    BLENDED_COST           NUMBER(18,6),
    USAGE_AMOUNT           NUMBER(18,6),
    USAGE_UNIT             VARCHAR(50),
    PRICING_TERM           VARCHAR(20),     -- OnDemand, Reserved, Spot, SavingsPlan
    LINE_ITEM_TYPE         VARCHAR(50),     -- Usage, Tax, Fee, Refund, Credit
    TAGS                   VARIANT,
    LOADED_AT              TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Azure Cost Management export
CREATE TABLE IF NOT EXISTS EOTSS_STAGING.AZURE_BILLING_RAW (
    BILLING_PERIOD         DATE,
    SUBSCRIPTION_ID        VARCHAR(50),
    SUBSCRIPTION_NAME      VARCHAR(200),
    RESOURCE_GROUP         VARCHAR(200),
    METER_CATEGORY         VARCHAR(200),
    METER_SUBCATEGORY      VARCHAR(200),
    METER_NAME             VARCHAR(200),
    RESOURCE_LOCATION      VARCHAR(50),
    CONSUMED_SERVICE       VARCHAR(200),
    RESOURCE_ID            VARCHAR(500),
    COST_IN_USD            NUMBER(18,6),
    USAGE_QUANTITY         NUMBER(18,6),
    UNIT_OF_MEASURE        VARCHAR(50),
    PRICING_MODEL          VARCHAR(20),     -- OnDemand, Reservation, Spot
    CHARGE_TYPE            VARCHAR(50),
    TAGS                   VARIANT,
    LOADED_AT              TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- GCP BigQuery Billing Export
CREATE TABLE IF NOT EXISTS EOTSS_STAGING.GCP_BILLING_RAW (
    BILLING_ACCOUNT_ID     VARCHAR(50),
    PROJECT_ID             VARCHAR(200),
    PROJECT_NAME           VARCHAR(200),
    SERVICE_ID             VARCHAR(50),
    SERVICE_DESCRIPTION    VARCHAR(200),
    SKU_ID                 VARCHAR(50),
    SKU_DESCRIPTION        VARCHAR(500),
    LOCATION               VARCHAR(50),
    COST                   NUMBER(18,6),
    USAGE_AMOUNT           NUMBER(18,6),
    USAGE_UNIT             VARCHAR(50),
    USAGE_START_TIME       TIMESTAMP_NTZ,
    USAGE_END_TIME         TIMESTAMP_NTZ,
    CREDITS_AMOUNT         NUMBER(18,6),
    CREDITS_TYPE           VARCHAR(50),
    LABELS                 VARIANT,
    LOADED_AT              TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- =============================================================================
-- STEP 2: Mapping tables — normalize cloud accounts to agencies
-- =============================================================================

-- Maps cloud accounts/subscriptions/projects to PRISM agency codes
CREATE TABLE IF NOT EXISTS EOTSS_STAGING.CLOUD_ACCOUNT_MAP (
    CLOUD_PROVIDER         VARCHAR(10) NOT NULL,  -- aws, azure, gcp
    CLOUD_ACCOUNT_ID       VARCHAR(200) NOT NULL,  -- AWS account ID, Azure sub ID, GCP project ID
    CLOUD_ACCOUNT_NAME     VARCHAR(200),
    AGENCY_CODE            VARCHAR(10) NOT NULL,
    AGENCY_NAME            VARCHAR(200),
    SECRETARIAT_ID         VARCHAR(20),
    ENVIRONMENT            VARCHAR(20) DEFAULT 'production',  -- production, staging, dev, sandbox
    COST_CENTER            VARCHAR(50),
    PRIMARY KEY (CLOUD_PROVIDER, CLOUD_ACCOUNT_ID)
);

-- Maps cloud service names to standardized PRISM cost categories
CREATE TABLE IF NOT EXISTS EOTSS_STAGING.CLOUD_SERVICE_MAP (
    CLOUD_PROVIDER         VARCHAR(10) NOT NULL,
    PROVIDER_SERVICE_CODE  VARCHAR(200) NOT NULL,
    PRISM_CATEGORY         VARCHAR(100) NOT NULL,  -- Compute, Storage, Database, Network, AI/ML, Security, Other
    PRISM_SUBCATEGORY      VARCHAR(100),
    PRIMARY KEY (CLOUD_PROVIDER, PROVIDER_SERVICE_CODE)
);

-- =============================================================================
-- STEP 3: Unified aggregated cloud spending table (monthly grain)
-- =============================================================================

-- Rebuilt by REBUILD_CLOUD_SPENDING() procedure after raw data loads
CREATE TABLE IF NOT EXISTS EOTSS_STAGING.CLOUD_SPENDING (
    RECORD_ID              NUMBER,
    CLOUD_PROVIDER         VARCHAR(10),
    AGENCY_CODE            VARCHAR(10),
    AGENCY_NAME            VARCHAR(200),
    SECRETARIAT_ID         VARCHAR(20),
    COST_CATEGORY          VARCHAR(100),
    FISCAL_PERIOD_DATE     DATE,
    FISCAL_YEAR_LABEL      VARCHAR(10),
    TOTAL_COST             NUMBER(18,2),
    BLENDED_COST           NUMBER(18,2),
    USAGE_HOURS            NUMBER(18,2),
    ONDEMAND_COST          NUMBER(18,2),
    RESERVED_COST          NUMBER(18,2),
    SPOT_COST              NUMBER(18,2),
    SERVICE_COUNT          NUMBER,
    RESOURCE_COUNT         NUMBER,
    ENVIRONMENT            VARCHAR(20),
    MONTHLY_BUDGET         NUMBER(18,2),
    ANNUAL_BUDGET          NUMBER(18,2)
);

-- =============================================================================
-- STEP 4: Semantic view for Intelligence UI
-- =============================================================================

CREATE OR REPLACE VIEW EOTSS_STAGING.V_CLOUD_SPENDING AS
SELECT
    cs.RECORD_ID,
    cs.CLOUD_PROVIDER,
    cs.AGENCY_CODE,
    cs.AGENCY_NAME,
    cs.SECRETARIAT_ID,
    cs.COST_CATEGORY,
    cs.FISCAL_PERIOD_DATE,
    cs.FISCAL_YEAR_LABEL,
    cs.TOTAL_COST,
    cs.BLENDED_COST,
    cs.USAGE_HOURS,
    cs.ONDEMAND_COST,
    cs.RESERVED_COST,
    cs.SPOT_COST,
    cs.SERVICE_COUNT,
    cs.RESOURCE_COUNT,
    cs.ENVIRONMENT,
    -- Budget metrics
    cs.MONTHLY_BUDGET,
    cs.ANNUAL_BUDGET,
    CASE
        WHEN COALESCE(cs.MONTHLY_BUDGET, 0) > 0
        THEN ROUND(cs.TOTAL_COST / cs.MONTHLY_BUDGET * 100, 2)
        ELSE NULL
    END AS BUDGET_UTILIZATION_PCT,
    -- Cost efficiency metrics
    CASE
        WHEN COALESCE(cs.TOTAL_COST, 0) > 0
        THEN ROUND((cs.RESERVED_COST + cs.SPOT_COST) / cs.TOTAL_COST * 100, 2)
        ELSE 0
    END AS SAVINGS_PLAN_COVERAGE_PCT,
    CASE
        WHEN COALESCE(cs.USAGE_HOURS, 0) > 0
        THEN ROUND(cs.TOTAL_COST / cs.USAGE_HOURS, 4)
        ELSE NULL
    END AS COST_PER_HOUR,
    -- Month-over-month trend
    LAG(cs.TOTAL_COST) OVER (
        PARTITION BY cs.CLOUD_PROVIDER, cs.AGENCY_CODE, cs.COST_CATEGORY
        ORDER BY cs.FISCAL_PERIOD_DATE
    ) AS PRIOR_MONTH_COST,
    CASE
        WHEN LAG(cs.TOTAL_COST) OVER (
            PARTITION BY cs.CLOUD_PROVIDER, cs.AGENCY_CODE, cs.COST_CATEGORY
            ORDER BY cs.FISCAL_PERIOD_DATE
        ) > 0
        THEN ROUND(
            (cs.TOTAL_COST - LAG(cs.TOTAL_COST) OVER (
                PARTITION BY cs.CLOUD_PROVIDER, cs.AGENCY_CODE, cs.COST_CATEGORY
                ORDER BY cs.FISCAL_PERIOD_DATE
            )) / LAG(cs.TOTAL_COST) OVER (
                PARTITION BY cs.CLOUD_PROVIDER, cs.AGENCY_CODE, cs.COST_CATEGORY
                ORDER BY cs.FISCAL_PERIOD_DATE
            ) * 100, 2
        )
        ELSE NULL
    END AS MOM_CHANGE_PCT
FROM EOTSS_STAGING.CLOUD_SPENDING cs;

-- =============================================================================
-- STEP 5: Rebuild procedure (called after raw data loads)
-- =============================================================================

CREATE OR REPLACE PROCEDURE EOTSS_STAGING.REBUILD_CLOUD_SPENDING()
RETURNS VARCHAR
LANGUAGE SQL
AS
BEGIN
    CREATE OR REPLACE TABLE EOTSS_STAGING.CLOUD_SPENDING AS
    WITH aws_monthly AS (
        SELECT
            'aws' AS CLOUD_PROVIDER,
            r.ACCOUNT_ID AS CLOUD_ACCOUNT_ID,
            r.SERVICE_CODE AS PROVIDER_SERVICE_CODE,
            DATE_TRUNC('MONTH', r.BILLING_PERIOD_START) AS PERIOD_DATE,
            SUM(r.UNBLENDED_COST) AS TOTAL_COST,
            SUM(r.BLENDED_COST) AS BLENDED_COST,
            SUM(CASE WHEN r.USAGE_UNIT IN ('Hrs', 'Hours') THEN r.USAGE_AMOUNT ELSE 0 END) AS USAGE_HOURS,
            SUM(CASE WHEN r.PRICING_TERM = 'OnDemand' THEN r.UNBLENDED_COST ELSE 0 END) AS ONDEMAND_COST,
            SUM(CASE WHEN r.PRICING_TERM IN ('Reserved', 'SavingsPlan') THEN r.UNBLENDED_COST ELSE 0 END) AS RESERVED_COST,
            SUM(CASE WHEN r.PRICING_TERM = 'Spot' THEN r.UNBLENDED_COST ELSE 0 END) AS SPOT_COST,
            COUNT(DISTINCT r.SERVICE_CODE) AS SERVICE_COUNT,
            COUNT(DISTINCT r.RESOURCE_ID) AS RESOURCE_COUNT
        FROM EOTSS_STAGING.AWS_BILLING_RAW r
        WHERE r.LINE_ITEM_TYPE = 'Usage'
        GROUP BY r.ACCOUNT_ID, r.SERVICE_CODE, DATE_TRUNC('MONTH', r.BILLING_PERIOD_START)
    ),
    azure_monthly AS (
        SELECT
            'azure' AS CLOUD_PROVIDER,
            r.SUBSCRIPTION_ID AS CLOUD_ACCOUNT_ID,
            r.CONSUMED_SERVICE AS PROVIDER_SERVICE_CODE,
            DATE_TRUNC('MONTH', r.BILLING_PERIOD) AS PERIOD_DATE,
            SUM(r.COST_IN_USD) AS TOTAL_COST,
            SUM(r.COST_IN_USD) AS BLENDED_COST,
            SUM(r.USAGE_QUANTITY) AS USAGE_HOURS,
            SUM(CASE WHEN r.PRICING_MODEL = 'OnDemand' THEN r.COST_IN_USD ELSE 0 END) AS ONDEMAND_COST,
            SUM(CASE WHEN r.PRICING_MODEL = 'Reservation' THEN r.COST_IN_USD ELSE 0 END) AS RESERVED_COST,
            SUM(CASE WHEN r.PRICING_MODEL = 'Spot' THEN r.COST_IN_USD ELSE 0 END) AS SPOT_COST,
            COUNT(DISTINCT r.CONSUMED_SERVICE) AS SERVICE_COUNT,
            COUNT(DISTINCT r.RESOURCE_ID) AS RESOURCE_COUNT
        FROM EOTSS_STAGING.AZURE_BILLING_RAW r
        WHERE r.CHARGE_TYPE = 'Usage'
        GROUP BY r.SUBSCRIPTION_ID, r.CONSUMED_SERVICE, DATE_TRUNC('MONTH', r.BILLING_PERIOD)
    ),
    gcp_monthly AS (
        SELECT
            'gcp' AS CLOUD_PROVIDER,
            r.PROJECT_ID AS CLOUD_ACCOUNT_ID,
            r.SERVICE_ID AS PROVIDER_SERVICE_CODE,
            DATE_TRUNC('MONTH', r.USAGE_START_TIME) AS PERIOD_DATE,
            SUM(r.COST + COALESCE(r.CREDITS_AMOUNT, 0)) AS TOTAL_COST,
            SUM(r.COST) AS BLENDED_COST,
            SUM(r.USAGE_AMOUNT) AS USAGE_HOURS,
            SUM(r.COST) AS ONDEMAND_COST,
            SUM(ABS(COALESCE(r.CREDITS_AMOUNT, 0))) AS RESERVED_COST,
            0 AS SPOT_COST,
            COUNT(DISTINCT r.SERVICE_ID) AS SERVICE_COUNT,
            COUNT(DISTINCT r.SKU_ID) AS RESOURCE_COUNT
        FROM EOTSS_STAGING.GCP_BILLING_RAW r
        GROUP BY r.PROJECT_ID, r.SERVICE_ID, DATE_TRUNC('MONTH', r.USAGE_START_TIME)
    ),
    all_providers AS (
        SELECT * FROM aws_monthly
        UNION ALL
        SELECT * FROM azure_monthly
        UNION ALL
        SELECT * FROM gcp_monthly
    )
    SELECT
        ROW_NUMBER() OVER (ORDER BY a.PERIOD_DATE, a.CLOUD_PROVIDER, COALESCE(m.AGENCY_CODE, 'UNMAPPED')) AS RECORD_ID,
        a.CLOUD_PROVIDER,
        COALESCE(m.AGENCY_CODE, 'UNMAPPED') AS AGENCY_CODE,
        COALESCE(m.AGENCY_NAME, a.CLOUD_ACCOUNT_ID) AS AGENCY_NAME,
        COALESCE(m.SECRETARIAT_ID, 'OTHER') AS SECRETARIAT_ID,
        COALESCE(sm.PRISM_CATEGORY, 'Other') AS COST_CATEGORY,
        a.PERIOD_DATE AS FISCAL_PERIOD_DATE,
        'FY' || CASE
            WHEN MONTH(a.PERIOD_DATE) >= 7 THEN YEAR(a.PERIOD_DATE) + 1
            ELSE YEAR(a.PERIOD_DATE)
        END::VARCHAR AS FISCAL_YEAR_LABEL,
        ROUND(a.TOTAL_COST, 2) AS TOTAL_COST,
        ROUND(a.BLENDED_COST, 2) AS BLENDED_COST,
        ROUND(a.USAGE_HOURS, 2) AS USAGE_HOURS,
        ROUND(a.ONDEMAND_COST, 2) AS ONDEMAND_COST,
        ROUND(a.RESERVED_COST, 2) AS RESERVED_COST,
        ROUND(a.SPOT_COST, 2) AS SPOT_COST,
        a.SERVICE_COUNT,
        a.RESOURCE_COUNT,
        COALESCE(m.ENVIRONMENT, 'production') AS ENVIRONMENT,
        NULL::NUMBER(18,2) AS MONTHLY_BUDGET,
        NULL::NUMBER(18,2) AS ANNUAL_BUDGET
    FROM all_providers a
    LEFT JOIN EOTSS_STAGING.CLOUD_ACCOUNT_MAP m
        ON a.CLOUD_PROVIDER = m.CLOUD_PROVIDER
       AND a.CLOUD_ACCOUNT_ID = m.CLOUD_ACCOUNT_ID
    LEFT JOIN EOTSS_STAGING.CLOUD_SERVICE_MAP sm
        ON a.CLOUD_PROVIDER = sm.CLOUD_PROVIDER
       AND a.PROVIDER_SERVICE_CODE = sm.PROVIDER_SERVICE_CODE;

    LET row_count NUMBER := (SELECT COUNT(*) FROM EOTSS_STAGING.CLOUD_SPENDING);
    RETURN 'Rebuilt CLOUD_SPENDING: ' || :row_count || ' rows';
END;

-- =============================================================================
-- STEP 6: Network rule for AWS Cost Explorer API
-- =============================================================================

CREATE OR REPLACE NETWORK RULE EOTSS_STAGING.AWS_CE_EGRESS_RULE
    MODE = EGRESS
    TYPE = HOST_PORT
    VALUE_LIST = ('ce.us-east-1.amazonaws.com:443');

-- =============================================================================
-- Verification
-- =============================================================================
-- SELECT COUNT(*) FROM EOTSS_STAGING.AWS_BILLING_RAW;
-- SELECT COUNT(*) FROM EOTSS_STAGING.CLOUD_SPENDING;
-- SELECT * FROM EOTSS_STAGING.V_CLOUD_SPENDING LIMIT 10;
-- SELECT CLOUD_PROVIDER, COUNT(*), SUM(TOTAL_COST) FROM EOTSS_STAGING.CLOUD_SPENDING GROUP BY 1;
