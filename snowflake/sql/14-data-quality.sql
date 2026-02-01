-- =============================================================================
-- 14-data-quality.sql
-- PRISM Data Metric Functions
-- =============================================================================
-- Snowflake-native data quality monitoring for EOTSS POC data
-- =============================================================================

USE DATABASE FEDERAL_FINANCIAL_DATA;
USE SCHEMA EOTSS_STAGING;

-- =============================================================================
-- DMF 1: Agency code validity
-- All AGENCY_CODE values must exist in GOVERNANCE.SECRETARIAT_AGENCIES
-- =============================================================================
CREATE OR REPLACE DATA METRIC FUNCTION EOTSS_STAGING.DMF_AGENCY_CODE_VALID(
    ARG_T TABLE(ARG_C1 VARCHAR)
)
RETURNS NUMBER
AS
$$
    SELECT COUNT(*)
    FROM ARG_T
    WHERE ARG_C1 IS NOT NULL
      AND ARG_C1 NOT IN (
          SELECT AGENCY_CODE FROM GOVERNANCE.SECRETARIAT_AGENCIES WHERE IS_ACTIVE = TRUE
      )
$$;

-- =============================================================================
-- DMF 2: Burn rate range
-- BURN_RATE_PCT should be between 0 and 999.99
-- =============================================================================
CREATE OR REPLACE DATA METRIC FUNCTION EOTSS_STAGING.DMF_BURN_RATE_RANGE(
    ARG_T TABLE(ARG_C1 NUMBER)
)
RETURNS NUMBER
AS
$$
    SELECT COUNT(*)
    FROM ARG_T
    WHERE ARG_C1 IS NOT NULL
      AND (ARG_C1 < 0 OR ARG_C1 > 999.99)
$$;

-- =============================================================================
-- DMF 3: Budget authority positive
-- BUDGET_AUTHORITY should be > 0 for all agencies
-- =============================================================================
CREATE OR REPLACE DATA METRIC FUNCTION EOTSS_STAGING.DMF_BUDGET_POSITIVE(
    ARG_T TABLE(ARG_C1 NUMBER)
)
RETURNS NUMBER
AS
$$
    SELECT COUNT(*)
    FROM ARG_T
    WHERE ARG_C1 IS NOT NULL AND ARG_C1 <= 0
$$;

-- =============================================================================
-- Attach DMFs to EOTSS_POC.CIW_SPENDING
-- (Primary data quality target for the POC)
-- =============================================================================
-- ALTER TABLE EOTSS_POC.CIW_SPENDING SET DATA_METRIC_SCHEDULE = 'TRIGGER_ON_CHANGES';

-- ALTER TABLE EOTSS_POC.CIW_SPENDING ADD DATA METRIC FUNCTION
--     EOTSS_STAGING.DMF_AGENCY_CODE_VALID ON (AGENCY_CODE);

-- ALTER TABLE EOTSS_POC.CIW_SPENDING ADD DATA METRIC FUNCTION
--     EOTSS_STAGING.DMF_BUDGET_POSITIVE ON (BUDGET_AUTHORITY);

-- NOTE: BURN_RATE_PCT is a computed column in the view, not in the base table.
-- DMF_BURN_RATE_RANGE would need to be applied to a materialized version
-- or via the dynamic table DT_CIW_SPENDING.

-- =============================================================================
-- Verification
-- =============================================================================
-- SELECT * FROM TABLE(INFORMATION_SCHEMA.DATA_METRIC_FUNCTION_REFERENCES(
--     REF_ENTITY_NAME => 'EOTSS_POC.CIW_SPENDING',
--     REF_ENTITY_DOMAIN => 'TABLE'
-- ));
