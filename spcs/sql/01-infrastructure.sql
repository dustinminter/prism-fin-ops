-- ============================================================================
-- PRISM FinOps - SPCS Infrastructure Setup
-- Run this script in Snowflake to set up the container services infrastructure
-- ============================================================================

-- Use ACCOUNTADMIN for initial setup
USE ROLE ACCOUNTADMIN;

-- ============================================================================
-- 1. DATABASE & SCHEMA
-- ============================================================================

CREATE DATABASE IF NOT EXISTS PRISM_SPCS;
CREATE SCHEMA IF NOT EXISTS PRISM_SPCS.APP;

USE DATABASE PRISM_SPCS;
USE SCHEMA APP;

-- ============================================================================
-- 2. WAREHOUSE FOR APP QUERIES
-- ============================================================================

CREATE WAREHOUSE IF NOT EXISTS PRISM_APP_WH
  WAREHOUSE_SIZE = 'X-SMALL'
  AUTO_SUSPEND = 60
  AUTO_RESUME = TRUE
  INITIALLY_SUSPENDED = TRUE
  COMMENT = 'Warehouse for PRISM FinOps application queries';

-- ============================================================================
-- 3. COMPUTE POOL
-- ============================================================================

CREATE COMPUTE POOL IF NOT EXISTS PRISM_COMPUTE_POOL
  MIN_NODES = 1
  MAX_NODES = 3
  INSTANCE_FAMILY = CPU_X64_S
  AUTO_RESUME = TRUE
  AUTO_SUSPEND_SECS = 300
  COMMENT = 'Compute pool for PRISM FinOps containers';

-- Wait for compute pool to be ready
-- DESCRIBE COMPUTE POOL PRISM_COMPUTE_POOL;

-- ============================================================================
-- 4. IMAGE REPOSITORY
-- ============================================================================

CREATE IMAGE REPOSITORY IF NOT EXISTS PRISM_SPCS.APP.IMAGES
  COMMENT = 'Container images for PRISM FinOps';

-- Get the repository URL (needed for docker push)
SHOW IMAGE REPOSITORIES IN SCHEMA PRISM_SPCS.APP;

-- ============================================================================
-- 5. ROLES & PERMISSIONS
-- ============================================================================

-- Create application role
CREATE ROLE IF NOT EXISTS PRISM_APP_ROLE
  COMMENT = 'Role for PRISM FinOps application services';

-- Grant compute pool usage
GRANT USAGE ON COMPUTE POOL PRISM_COMPUTE_POOL TO ROLE PRISM_APP_ROLE;

-- Grant warehouse usage
GRANT USAGE ON WAREHOUSE PRISM_APP_WH TO ROLE PRISM_APP_ROLE;

-- Grant database/schema access
GRANT USAGE ON DATABASE PRISM_SPCS TO ROLE PRISM_APP_ROLE;
GRANT USAGE ON SCHEMA PRISM_SPCS.APP TO ROLE PRISM_APP_ROLE;

-- Grant image repository access
GRANT READ, WRITE ON IMAGE REPOSITORY PRISM_SPCS.APP.IMAGES TO ROLE PRISM_APP_ROLE;

-- Data access: Per-tenant roles grant scoped schema access.
-- See snowflake/sql/18-tenant-config.sql for tenant role definitions.
-- PRISM_APP_ROLE retains only GOVERNANCE.TENANTS/TENANT_USERS read access
-- for tenant resolution at connection time.

-- Create user role for app access
CREATE ROLE IF NOT EXISTS PRISM_USER_ROLE
  COMMENT = 'Role for users accessing PRISM FinOps';

-- ============================================================================
-- 6. EXTERNAL ACCESS FOR SNOWFLAKE CONNECTIVITY
-- ============================================================================

-- Network rule to allow access to Snowflake endpoints
CREATE OR REPLACE NETWORK RULE PRISM_SPCS.APP.SNOWFLAKE_EGRESS_RULE
  TYPE = HOST_PORT
  -- Replace <ACCOUNT> with your Snowflake account identifier (e.g., org-account)
  VALUE_LIST = ('jnaqbvy-kxc12813.snowflakecomputing.com:443')
  MODE = EGRESS
  COMMENT = 'Allow SPCS containers to connect to Snowflake';

-- External access integration for the backend service
CREATE OR REPLACE EXTERNAL ACCESS INTEGRATION PRISM_SNOWFLAKE_ACCESS
  ALLOWED_NETWORK_RULES = (PRISM_SPCS.APP.SNOWFLAKE_EGRESS_RULE)
  ENABLED = TRUE
  COMMENT = 'External access for PRISM backend to connect to Snowflake';

-- Grant usage to app role
GRANT USAGE ON INTEGRATION PRISM_SNOWFLAKE_ACCESS TO ROLE PRISM_APP_ROLE;

-- ============================================================================
-- 7. STAGES FOR SPECS (optional - can also inline)
-- ============================================================================

CREATE STAGE IF NOT EXISTS PRISM_SPCS.APP.SPECS
  DIRECTORY = (ENABLE = TRUE)
  COMMENT = 'Service specification files';

-- ============================================================================
-- 8. EVENT TABLE FOR LOGGING
-- ============================================================================

CREATE EVENT TABLE IF NOT EXISTS PRISM_SPCS.APP.PRISM_EVENTS
  COMMENT = 'Event table for PRISM service logs';

ALTER ACCOUNT SET EVENT_TABLE = PRISM_SPCS.APP.PRISM_EVENTS;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check compute pool status
-- SELECT SYSTEM$GET_COMPUTE_POOL_STATUS('PRISM_COMPUTE_POOL');

-- Get image repository URL for docker push
-- SELECT SYSTEM$REGISTRY_LIST_IMAGES('/prism_spcs/app/images');

-- Show all created objects
SHOW COMPUTE POOLS LIKE 'PRISM%';
SHOW IMAGE REPOSITORIES IN SCHEMA PRISM_SPCS.APP;
SHOW WAREHOUSES LIKE 'PRISM%';
