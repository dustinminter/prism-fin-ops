-- ============================================================================
-- PRISM FinOps - Deploy Services to SPCS
-- Run after images are pushed to the repository
-- ============================================================================

USE ROLE PRISM_APP_ROLE;
USE DATABASE PRISM_SPCS;
USE SCHEMA APP;
USE WAREHOUSE PRISM_APP_WH;

-- ============================================================================
-- 1. DEPLOY BACKEND SERVICE
-- ============================================================================

CREATE SERVICE IF NOT EXISTS PRISM_BACKEND
  IN COMPUTE POOL PRISM_COMPUTE_POOL
  FROM SPECIFICATION $$
spec:
  containers:
    - name: backend
      image: /prism_spcs/app/images/backend:v2
      env:
        NODE_ENV: production
        PORT: "3000"
        # Note: SNOWFLAKE_HOST and SNOWFLAKE_ACCOUNT are auto-injected by Snowflake
        SNOWFLAKE_DATABASE: FEDERAL_FINANCIAL_DATA
        SNOWFLAKE_SCHEMA: USASPENDING
        SNOWFLAKE_WAREHOUSE: PRISM_APP_WH
        SNOWFLAKE_GOVERNANCE_SCHEMA: GOVERNANCE
        SNOWFLAKE_ANALYTICS_SCHEMA: ANALYTICS
      resources:
        requests:
          cpu: 0.5
          memory: 512Mi
        limits:
          cpu: 2
          memory: 2Gi
      readinessProbe:
        port: 3000
        path: /api/health
  endpoints:
    - name: api
      port: 3000
      protocol: HTTP
$$
  MIN_INSTANCES = 1
  MAX_INSTANCES = 3
  AUTO_RESUME = TRUE
  COMMENT = 'PRISM FinOps Backend API';

-- ============================================================================
-- 2. DEPLOY FRONTEND SERVICE
-- ============================================================================

CREATE SERVICE IF NOT EXISTS PRISM_FRONTEND
  IN COMPUTE POOL PRISM_COMPUTE_POOL
  FROM SPECIFICATION $$
spec:
  containers:
    - name: frontend
      image: /prism_spcs/app/images/frontend:v2
      resources:
        requests:
          cpu: 0.25
          memory: 128Mi
        limits:
          cpu: 1
          memory: 512Mi
      readinessProbe:
        port: 80
        path: /health
  endpoints:
    - name: web
      port: 80
      protocol: HTTP
$$
  MIN_INSTANCES = 1
  MAX_INSTANCES = 2
  AUTO_RESUME = TRUE
  COMMENT = 'PRISM FinOps Frontend';

-- ============================================================================
-- 3. DEPLOY ROUTER SERVICE (PUBLIC)
-- ============================================================================

CREATE SERVICE IF NOT EXISTS PRISM_ROUTER
  IN COMPUTE POOL PRISM_COMPUTE_POOL
  FROM SPECIFICATION $$
spec:
  containers:
    - name: router
      image: /prism_spcs/app/images/router:v2
      env:
        # DNS domain from SELECT SYSTEM$GET_SERVICE_DNS_DOMAIN('PRISM_SPCS.APP')
        BACKEND_HOST: prism-backend.pfka.svc.spcs.internal
        FRONTEND_HOST: prism-frontend.pfka.svc.spcs.internal
      resources:
        requests:
          cpu: 0.25
          memory: 128Mi
        limits:
          cpu: 1
          memory: 256Mi
      readinessProbe:
        port: 8080
        path: /health
  endpoints:
    - name: ingress
      port: 8080
      protocol: HTTP
      public: true
$$
  MIN_INSTANCES = 1
  MAX_INSTANCES = 2
  AUTO_RESUME = TRUE
  COMMENT = 'PRISM FinOps Router (Public Ingress)';

-- ============================================================================
-- 4. GRANT ACCESS TO USERS
-- ============================================================================

-- Grant usage on the router service endpoint
GRANT USAGE ON SERVICE PRISM_ROUTER TO ROLE PRISM_USER_ROLE;

-- Grant user role to specific users/roles as needed
-- GRANT ROLE PRISM_USER_ROLE TO USER your_user;
-- GRANT ROLE PRISM_USER_ROLE TO ROLE your_existing_role;

-- ============================================================================
-- 5. VERIFICATION
-- ============================================================================

-- Check service status
SHOW SERVICES IN SCHEMA PRISM_SPCS.APP;

-- Check service containers
SELECT SYSTEM$GET_SERVICE_STATUS('PRISM_BACKEND');
SELECT SYSTEM$GET_SERVICE_STATUS('PRISM_FRONTEND');
SELECT SYSTEM$GET_SERVICE_STATUS('PRISM_ROUTER');

-- Get public endpoint URL
SHOW ENDPOINTS IN SERVICE PRISM_ROUTER;

-- Check logs if needed
-- SELECT * FROM TABLE(PRISM_BACKEND!GET_SERVICE_LOGS());
