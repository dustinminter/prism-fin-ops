-- =============================================================================
-- 02a-real-data-load.sql
-- PRISM FinOps — Load Real Massachusetts Data
-- =============================================================================
-- Replaces 02-eotss-sample-data.sql (synthetic data) with real CTHRU/CIP/COMMBUYS
-- Prerequisite: Stage @EOTSS_STAGING.DATA_LOAD must exist (created by Terraform)
-- =============================================================================

USE DATABASE FEDERAL_FINANCIAL_DATA;
USE SCHEMA EOTSS_STAGING;

-- =============================================================================
-- 1. Create internal stage for data loading
-- =============================================================================
CREATE STAGE IF NOT EXISTS EOTSS_STAGING.DATA_LOAD
    DIRECTORY = (ENABLE = TRUE)
    COMMENT = 'Internal stage for loading real Massachusetts data';

-- =============================================================================
-- 2. File formats
-- =============================================================================
CREATE FILE FORMAT IF NOT EXISTS EOTSS_STAGING.JSON_FORMAT
    TYPE = JSON
    STRIP_OUTER_ARRAY = TRUE
    STRIP_NULL_VALUES = TRUE;

CREATE FILE FORMAT IF NOT EXISTS EOTSS_STAGING.CSV_FORMAT
    TYPE = CSV
    SKIP_HEADER = 1
    FIELD_OPTIONALLY_ENCLOSED_BY = '"'
    NULL_IF = ('', 'NULL', 'null');

-- =============================================================================
-- 3. Raw tables for real data
-- =============================================================================

-- CTHRU Expenditures (raw from data.mass.gov / Socrata API)
CREATE TABLE IF NOT EXISTS EOTSS_POC.CTHRU_RAW (
    record_id           VARCHAR(100),
    fiscal_year         NUMBER,
    department          VARCHAR(200),
    appropriation_name  VARCHAR(500),
    vendor_name         VARCHAR(500),
    amount              NUMBER(18,2),
    object_class        VARCHAR(200),
    budget_fund         VARCHAR(200),
    check_date          TIMESTAMP_NTZ,
    raw_json            VARIANT,
    loaded_at           TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- CIP Investments (from Capital Investment Plan)
CREATE TABLE IF NOT EXISTS EOTSS_POC.CIP_RAW (
    agency_name         VARCHAR(200),
    project_name        VARCHAR(500),
    planned_amount      NUMBER(18,2),
    consumed_amount     NUMBER(18,2),
    fiscal_year         NUMBER,
    category            VARCHAR(200),
    raw_json            VARIANT,
    loaded_at           TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- COMMBUYS Bids (from COMMBUYS portal scraping)
CREATE TABLE IF NOT EXISTS EOTSS_POC.COMMBUYS_RAW (
    bid_number          VARCHAR(100),
    bid_title           VARCHAR(1000),
    buyer_name          VARCHAR(200),
    bid_type            VARCHAR(100),
    open_date           TIMESTAMP_NTZ,
    close_date          TIMESTAMP_NTZ,
    status              VARCHAR(100),
    raw_json            VARIANT,
    loaded_at           TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- =============================================================================
-- 4. Load from stage (run after PUT commands)
-- =============================================================================

-- PUT commands (run from SnowSQL or Snowflake CLI):
--   PUT file://data/cthru/transactions.json @EOTSS_STAGING.DATA_LOAD/cthru/
--   PUT file://data/cip/agencies.json @EOTSS_STAGING.DATA_LOAD/cip/
--   PUT file://data/cip/cip-line-items.json @EOTSS_STAGING.DATA_LOAD/cip/
--   PUT file://data/commbuys/*/bid_details.json @EOTSS_STAGING.DATA_LOAD/commbuys/

-- Load CTHRU transactions
COPY INTO EOTSS_POC.CTHRU_RAW (raw_json, loaded_at)
FROM (
    SELECT
        $1,
        CURRENT_TIMESTAMP()
    FROM @EOTSS_STAGING.DATA_LOAD/cthru/transactions.json
    (FILE_FORMAT => 'EOTSS_STAGING.JSON_FORMAT')
);

-- Parse CTHRU raw JSON into typed columns
UPDATE EOTSS_POC.CTHRU_RAW
SET
    record_id          = raw_json:id::VARCHAR,
    fiscal_year        = raw_json:fiscal_year::NUMBER,
    department         = raw_json:department_name::VARCHAR,
    appropriation_name = raw_json:appropriation_name::VARCHAR,
    vendor_name        = raw_json:vendor_name::VARCHAR,
    amount             = raw_json:amount::NUMBER(18,2),
    object_class       = raw_json:object_class::VARCHAR,
    budget_fund        = raw_json:budget_fund_name::VARCHAR,
    check_date         = TRY_TO_TIMESTAMP_NTZ(raw_json:check_date::VARCHAR)
WHERE record_id IS NULL;

-- =============================================================================
-- 5. Populate CIW_SPENDING from real CTHRU data
-- =============================================================================

-- Map CTHRU data into the CIW schema the app expects
INSERT INTO EOTSS_POC.CIW_SPENDING (
    AGENCY_CODE,
    AGENCY_NAME,
    APPROPRIATION_NAME,
    VENDOR_NAME,
    OBJECT_CLASS,
    AMOUNT,
    FISCAL_YEAR,
    FISCAL_MONTH,
    BUDGET_FUND
)
SELECT
    SUBSTR(department, 1, 10) AS AGENCY_CODE,
    department AS AGENCY_NAME,
    appropriation_name,
    vendor_name,
    object_class,
    amount,
    fiscal_year,
    MONTH(COALESCE(check_date, CURRENT_TIMESTAMP())) AS FISCAL_MONTH,
    budget_fund
FROM EOTSS_POC.CTHRU_RAW
WHERE amount IS NOT NULL;

-- =============================================================================
-- 6. Populate CIP_INVESTMENTS from real CIP data
-- =============================================================================

-- Load CIP agencies JSON
COPY INTO EOTSS_POC.CIP_RAW (raw_json, loaded_at)
FROM (
    SELECT
        $1,
        CURRENT_TIMESTAMP()
    FROM @EOTSS_STAGING.DATA_LOAD/cip/agencies.json
    (FILE_FORMAT => 'EOTSS_STAGING.JSON_FORMAT')
);

-- Parse CIP data
INSERT INTO EOTSS_POC.CIP_INVESTMENTS (
    AGENCY_CODE,
    AGENCY_NAME,
    PROJECT_NAME,
    PLANNED_AMOUNT,
    CONSUMED_AMOUNT,
    FISCAL_YEAR
)
SELECT
    SUBSTR(raw_json:code::VARCHAR, 1, 10),
    raw_json:name::VARCHAR,
    raw_json:name::VARCHAR,
    raw_json:planned::NUMBER(18,2),
    raw_json:consumed::NUMBER(18,2),
    2026
FROM EOTSS_POC.CIP_RAW
WHERE raw_json:planned IS NOT NULL;

-- =============================================================================
-- 7. Populate COMMBUYS_AWARDS from real bid data
-- =============================================================================

-- Load COMMBUYS bid_details JSONs
COPY INTO EOTSS_POC.COMMBUYS_RAW (raw_json, loaded_at)
FROM (
    SELECT
        $1,
        CURRENT_TIMESTAMP()
    FROM @EOTSS_STAGING.DATA_LOAD/commbuys/
    (FILE_FORMAT => 'EOTSS_STAGING.JSON_FORMAT')
    PATTERN => '.*bid_details.json'
);

-- Parse COMMBUYS data
INSERT INTO EOTSS_POC.COMMBUYS_AWARDS (
    SOLICITATION_NUMBER,
    TITLE,
    BUYER_NAME,
    BID_TYPE,
    OPEN_DATE,
    CLOSE_DATE,
    STATUS
)
SELECT
    raw_json:bid_number::VARCHAR,
    raw_json:title::VARCHAR,
    raw_json:buyer::VARCHAR,
    raw_json:bid_type::VARCHAR,
    TRY_TO_TIMESTAMP_NTZ(raw_json:open_date::VARCHAR),
    TRY_TO_TIMESTAMP_NTZ(raw_json:close_date::VARCHAR),
    raw_json:status::VARCHAR
FROM EOTSS_POC.COMMBUYS_RAW;

-- =============================================================================
-- 8. Verification
-- =============================================================================
SELECT 'CTHRU_RAW' AS source, COUNT(*) AS rows FROM EOTSS_POC.CTHRU_RAW
UNION ALL
SELECT 'CIW_SPENDING', COUNT(*) FROM EOTSS_POC.CIW_SPENDING
UNION ALL
SELECT 'CIP_RAW', COUNT(*) FROM EOTSS_POC.CIP_RAW
UNION ALL
SELECT 'CIP_INVESTMENTS', COUNT(*) FROM EOTSS_POC.CIP_INVESTMENTS
UNION ALL
SELECT 'COMMBUYS_RAW', COUNT(*) FROM EOTSS_POC.COMMBUYS_RAW
UNION ALL
SELECT 'COMMBUYS_AWARDS', COUNT(*) FROM EOTSS_POC.COMMBUYS_AWARDS;
