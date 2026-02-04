-- =============================================================================
-- 19-demo-tenant.sql
-- Second Tenant Dry-Run: Creates a demo tenant for architecture validation.
-- Safe to run in any environment. Idempotent (WHERE NOT EXISTS guards).
-- Cleanup: see docs/operating-model/05-second-tenant-dry-run.md
-- =============================================================================
-- SAFETY: Do not run in production without explicit approval.
-- CREATES: DEMO_STAGING schema + PRISM_TENANT_DEMO_ROLE role.
-- =============================================================================

USE DATABASE FEDERAL_FINANCIAL_DATA;

-- ---------------------------------------------------------------------------
-- 1. Create demo schema
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS DEMO_STAGING;

-- Sample table so queries have something to hit
CREATE TABLE IF NOT EXISTS DEMO_STAGING.DEMO_SPENDING (
    AGENCY_CODE        VARCHAR(10),
    AGENCY_NAME        VARCHAR(200),
    FISCAL_YEAR        NUMBER,
    FISCAL_MONTH       NUMBER,
    AMOUNT             NUMBER(18,2),
    CREATED_AT         TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Seed minimal data (idempotent: truncate + reload)
TRUNCATE TABLE IF EXISTS DEMO_STAGING.DEMO_SPENDING;

INSERT INTO DEMO_STAGING.DEMO_SPENDING (AGENCY_CODE, AGENCY_NAME, FISCAL_YEAR, FISCAL_MONTH, AMOUNT)
SELECT 'DEMO', 'Demo Agency', 2026, 1, 1000000.00
UNION ALL
SELECT 'DEMO', 'Demo Agency', 2026, 2, 1050000.00
UNION ALL
SELECT 'DEMO', 'Demo Agency', 2026, 3, 980000.00;

-- ---------------------------------------------------------------------------
-- 2. Create per-tenant role
-- ---------------------------------------------------------------------------
CREATE ROLE IF NOT EXISTS PRISM_TENANT_DEMO_ROLE;

-- Grant warehouse usage
GRANT USAGE ON WAREHOUSE COMPUTE_WH TO ROLE PRISM_TENANT_DEMO_ROLE;

-- Grant database usage
GRANT USAGE ON DATABASE FEDERAL_FINANCIAL_DATA TO ROLE PRISM_TENANT_DEMO_ROLE;

-- Grant DEMO_STAGING (full read)
GRANT USAGE ON SCHEMA FEDERAL_FINANCIAL_DATA.DEMO_STAGING TO ROLE PRISM_TENANT_DEMO_ROLE;
GRANT SELECT ON ALL TABLES IN SCHEMA FEDERAL_FINANCIAL_DATA.DEMO_STAGING TO ROLE PRISM_TENANT_DEMO_ROLE;
GRANT SELECT ON ALL VIEWS IN SCHEMA FEDERAL_FINANCIAL_DATA.DEMO_STAGING TO ROLE PRISM_TENANT_DEMO_ROLE;
GRANT SELECT ON FUTURE TABLES IN SCHEMA FEDERAL_FINANCIAL_DATA.DEMO_STAGING TO ROLE PRISM_TENANT_DEMO_ROLE;
GRANT SELECT ON FUTURE VIEWS IN SCHEMA FEDERAL_FINANCIAL_DATA.DEMO_STAGING TO ROLE PRISM_TENANT_DEMO_ROLE;

-- Grant GOVERNANCE (read-only, needed for tenant resolution + agreement queries)
GRANT USAGE ON SCHEMA FEDERAL_FINANCIAL_DATA.GOVERNANCE TO ROLE PRISM_TENANT_DEMO_ROLE;
GRANT SELECT ON ALL TABLES IN SCHEMA FEDERAL_FINANCIAL_DATA.GOVERNANCE TO ROLE PRISM_TENANT_DEMO_ROLE;
GRANT SELECT ON ALL VIEWS IN SCHEMA FEDERAL_FINANCIAL_DATA.GOVERNANCE TO ROLE PRISM_TENANT_DEMO_ROLE;

-- Grant SEMANTIC (read-only, needed for semantic model)
GRANT USAGE ON SCHEMA FEDERAL_FINANCIAL_DATA.SEMANTIC TO ROLE PRISM_TENANT_DEMO_ROLE;
GRANT SELECT ON ALL TABLES IN SCHEMA FEDERAL_FINANCIAL_DATA.SEMANTIC TO ROLE PRISM_TENANT_DEMO_ROLE;
GRANT SELECT ON ALL VIEWS IN SCHEMA FEDERAL_FINANCIAL_DATA.SEMANTIC TO ROLE PRISM_TENANT_DEMO_ROLE;

-- NO grants to EOTSS_STAGING, USASPENDING, or ANALYTICS — this is the isolation boundary

-- Allow SYSADMIN to manage this role
GRANT ROLE PRISM_TENANT_DEMO_ROLE TO ROLE SYSADMIN;

-- ---------------------------------------------------------------------------
-- 3. Register tenant (idempotent)
-- ---------------------------------------------------------------------------
INSERT INTO GOVERNANCE.TENANTS (TENANT_ID, DISPLAY_NAME, DATA_SCHEMA, GOV_SCHEMA, SEM_SCHEMA, SNOWFLAKE_ROLE)
SELECT 'demo', 'Demo Tenant', 'DEMO_STAGING', 'GOVERNANCE', 'SEMANTIC', 'PRISM_TENANT_DEMO_ROLE'
WHERE NOT EXISTS (
    SELECT 1 FROM GOVERNANCE.TENANTS WHERE TENANT_ID = 'demo'
);

-- ---------------------------------------------------------------------------
-- 4. Map a test user to demo tenant (idempotent)
-- ---------------------------------------------------------------------------
INSERT INTO GOVERNANCE.TENANT_USERS (USER_ID, TENANT_ID)
SELECT 'demo-user-001', 'demo'
WHERE NOT EXISTS (
    SELECT 1 FROM GOVERNANCE.TENANT_USERS WHERE USER_ID = 'demo-user-001' AND TENANT_ID = 'demo'
);

-- ---------------------------------------------------------------------------
-- 5. Verification queries (run manually to confirm isolation)
-- ---------------------------------------------------------------------------

-- Should succeed: demo role reads demo data
-- USE ROLE PRISM_TENANT_DEMO_ROLE;
-- SELECT COUNT(*) FROM FEDERAL_FINANCIAL_DATA.DEMO_STAGING.DEMO_SPENDING;
-- Expected: 3

-- Should FAIL: demo role cannot read EOTSS data
-- USE ROLE PRISM_TENANT_DEMO_ROLE;
-- SELECT * FROM FEDERAL_FINANCIAL_DATA.EOTSS_STAGING.V_CIW_SPENDING LIMIT 1;
-- Expected: Object does not exist or not authorized

-- Should FAIL: EOTSS role cannot read demo data
-- USE ROLE PRISM_TENANT_EOTSS_ROLE;
-- SELECT * FROM FEDERAL_FINANCIAL_DATA.DEMO_STAGING.DEMO_SPENDING LIMIT 1;
-- Expected: Object does not exist or not authorized
