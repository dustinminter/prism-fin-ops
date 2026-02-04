-- =============================================================================
-- 20-cthru-real-data.sql
-- CTHRU real data integration: raw staging tables, mapping tables,
-- aggregated spending with budget authority, V_CTHRU_SPENDING parallel view
-- =============================================================================
-- Sources:
--   1. Comptroller Spending (pegc-naaa) - 47.5M transactions, updated daily
--      https://cthru.data.socrata.com/dataset/pegc-naaa
--   2. CTHRU Budgets (kv7m-35wn) - 44K budget lines, FY2005-2026
--      https://cthru.data.socrata.com/dataset/kv7m-35wn
--
-- Strategy:
--   1. Create raw staging tables (CTHRU_RAW, CTHRU_BUDGETS_RAW)
--   2. Create mapping tables (secretariat, fund code)
--   3. Build CTHRU_BUDGET_AUTHORITY aggregation
--   4. Build CTHRU_SPENDING with budget authority join
--   5. Create V_CTHRU_SPENDING (parallel view — does NOT touch V_CIW_SPENDING)
--
-- Safety:
--   Does NOT modify or replace existing views (V_CIW_SPENDING, etc.).
--   Creates V_CTHRU_SPENDING and supporting objects only.
--   Cutover to replace the POC view (V_CIW_SPENDING) is explicitly deferred.
--
-- Tenant note:
--   All objects are created in EOTSS_STAGING (the tenant data schema).
--   For multi-tenant deployments, run this per tenant schema.
-- =============================================================================

USE DATABASE FEDERAL_FINANCIAL_DATA;
USE SCHEMA EOTSS_STAGING;

-- =============================================================================
-- STEP 1: Raw staging tables
-- =============================================================================

-- 1a: CTHRU transaction data (25 columns from Socrata CSV)
CREATE TABLE IF NOT EXISTS EOTSS_STAGING.CTHRU_RAW (
    BASE_ID               VARCHAR(30),
    BUDGET_FISCAL_YEAR    NUMBER(4),
    FISCAL_PERIOD         NUMBER(2),
    TXN_DATE              DATE,
    CABINET_SECRETARIAT   VARCHAR(200),
    DEPARTMENT            VARCHAR(200),
    APPROPRIATION_TYPE    VARCHAR(200),
    APPROPRIATION_NAME    VARCHAR(200),
    OBJECT_CLASS          VARCHAR(200),
    OBJECT_CODE           VARCHAR(200),
    ENCUMBRANCE_ID        VARCHAR(50),
    ZIP_CODE              VARCHAR(20),
    AMOUNT                NUMBER(15,2),
    FUND                  VARCHAR(200),
    FUND_CODE             VARCHAR(10),
    APPROPRIATION_CODE    VARCHAR(20),
    OBJECT                VARCHAR(10),
    DEPARTMENT_CODE       VARCHAR(10),
    VENDOR                VARCHAR(200),
    VENDOR_ID             VARCHAR(50),
    PAYMENT_ID            VARCHAR(50),
    PAYMENT_METHOD        VARCHAR(50),
    STATE                 VARCHAR(50),
    CITY                  VARCHAR(100),
    CREATE_DATE           TIMESTAMP_NTZ
);

-- 1b: CTHRU budget authority data (appropriation-level)
CREATE TABLE IF NOT EXISTS EOTSS_STAGING.CTHRU_BUDGETS_RAW (
    FISCAL_YEAR                    NUMBER(4),
    FUND_NUMBER                    VARCHAR(10),
    FUND_NAME                      VARCHAR(200),
    CABINET_SECRETARIAT_NAME       VARCHAR(200),
    DEPARTMENT_NAME                VARCHAR(200),
    DEPARTMENT_CODE                VARCHAR(10),
    APPROPRIATION_ACCOUNT_NUMBER   VARCHAR(20),
    APPROPRIATION_ACCOUNT_NAME     VARCHAR(200),
    BEGINNING_BALANCE              NUMBER(15,2),
    ORIGINAL_ENACTED_BUDGET        NUMBER(15,2),
    SUPPLEMENTAL_BUDGET            NUMBER(15,2),
    TRANSFER_IN                    NUMBER(15,2),
    TRANSFER_OUT                   NUMBER(15,2),
    AUTH_RETAINED_REVENUE_FLOOR    NUMBER(15,2),
    AUTH_RETAINED_REVENUE_CEILING  NUMBER(15,2),
    RETAINED_REVENUE_ESTIMATE      NUMBER(15,2),
    RETAINED_REVENUE_COLLECTED     NUMBER(15,2),
    PLANNED_SAVING_9C_CUTS         NUMBER(15,2),
    TOTAL_ENACTED_BUDGET           NUMBER(15,2),
    OTHER_STATUTORY_SPENDING       NUMBER(15,2),
    TOTAL_AVAILABLE_FOR_SPENDING   NUMBER(15,2),
    TOTAL_EXPENSES                 NUMBER(15,2),
    BALANCE_FORWARD                NUMBER(15,2),
    UNEXPENDED_REVERTED            NUMBER(15,2),
    APPROPRIATION_CLASS            VARCHAR(10),
    APPROPRIATION_CLASS_NAME       VARCHAR(200),
    APPROPRIATION_CLASS_DESC       VARCHAR(500)
);

-- =============================================================================
-- STEP 2: Mapping tables
-- =============================================================================

-- 2a: Secretariat code mapping (CTHRU full names -> PRISM short codes)
CREATE TABLE IF NOT EXISTS EOTSS_STAGING.CTHRU_SECRETARIAT_MAP (
    CTHRU_CABINET_NAME    VARCHAR(200) NOT NULL,
    PRISM_SECRETARIAT_ID  VARCHAR(10)  NOT NULL,
    CONSTRAINT PK_CTHRU_SEC_MAP PRIMARY KEY (CTHRU_CABINET_NAME)
);

-- Idempotent: MERGE instead of INSERT
MERGE INTO EOTSS_STAGING.CTHRU_SECRETARIAT_MAP tgt
USING (
    SELECT * FROM VALUES
        ('EXECUTIVE OFFICE FOR ADMINSTRATION & FINANCE',              'ANF'),
        ('EXECUTIVE OFFICE OF EDUCATION',                              'EOE'),
        ('EXECUTIVE OFFICE OF TECHNOLOGY SERVICES AND SECURITY',       'EOTSS'),
        ('EXECUTIVE OFFICE OF HEALTH & HUMAN SERVICES',                'HHS'),
        ('EXECUTIVE OFFICE OF PUBLIC SAFETY & HOMELAND SECURITY',      'EOPSS'),
        ('ENVIRONMENTAL AFFAIRS',                                      'EEA'),
        ('EXECUTIVE OFFICE OF HOUSING AND LIVABLE COMMUNITIES',        'DHCD'),
        ('MASSACHUSETTS DEPARTMENT OF TRANSPORTATION',                 'DOT'),
        ('EXECUTIVE OFFICE OF ECONOMIC DEVELOPMENT',                   'EED'),
        ('JUDICIARY',                                                  'JUD'),
        ('SHERIFF DEPARTMENTS',                                        'SHRF'),
        ('EXECUTIVE OFFICE OF LABOR AND WORKFORCE DEVELOPMENT',        'EOLWD'),
        ('EXECUTIVE OFFICE OF VETERANS'' SERVICES',                    'VET'),
        ('TREASURER & RECEIVER GENERAL',                               'TRE'),
        ('ATTORNEY GENERAL',                                           'AGO'),
        ('DISTRICT ATTORNEY',                                          'DA'),
        ('SECRETARY OF STATE',                                         'SOS'),
        ('GOVERNOR',                                                   'GOV'),
        ('LEGISLATURE',                                                'LEG'),
        ('INSPECTOR GENERAL',                                          'IGO'),
        ('STATE AUDITOR',                                              'SAO'),
        ('MA GAMING COMMISSION',                                       'MGC'),
        ('CTR/FAD ACCOUNTING ENTITIES',                                'CTR'),
        ('OFFICE OF COMPTROLLER',                                      'OSC'),
        ('BOARD OF LIBRARY COMMISSIONERS',                             'BLC'),
        ('THE CENTER FOR HEALTH INFORMATION & ANALYSIS',               'CHIA'),
        ('COMMISSION AGAINST DISCRIMINATION',                          'CAD'),
        ('DISABLED PERSONS PROTECTION COMMISSION',                     'DPPC'),
        ('CANNABIS CONTROL COMMISSION',                                'CNB'),
        ('ETHICS COMMISSION',                                          'ETH'),
        ('DEVELOPMENTAL DISABILITIES COUNCIL',                         'DDC'),
        ('CAMPAIGN & POLITICAL FINANCE',                               'CPF'),
        ('COMMISSION ON STATUS OF WOMEN',                              'CSW'),
        ('COMMISSION ON THE STATUS OF PERSONS WITH DISABILITIES',      'SPD'),
        ('OFFICE OF THE CHILD ADVOCATE',                               'OCA'),
        ('OFFICE OF THE VETERAN ADVOCATE',                             'OVA'),
        ('MASSACHUSETTS  PEACE OFFICER STANDARDS AND TRAINING',        'POST'),
        ('THE HEALTH CARE SECURITY TRUST',                             'HST'),
        ('GOVERNOR`S COUNCIL',                                         'GCN')
    AS src (CTHRU_CABINET_NAME, PRISM_SECRETARIAT_ID)
) src
ON tgt.CTHRU_CABINET_NAME = src.CTHRU_CABINET_NAME
WHEN NOT MATCHED THEN INSERT (CTHRU_CABINET_NAME, PRISM_SECRETARIAT_ID)
    VALUES (src.CTHRU_CABINET_NAME, src.PRISM_SECRETARIAT_ID);

-- 2b: Fund code simplification mapping
CREATE TABLE IF NOT EXISTS EOTSS_STAGING.CTHRU_FUND_MAP (
    CTHRU_FUND_CODE       VARCHAR(10)  NOT NULL,
    PRISM_FUND_CODE       VARCHAR(10)  NOT NULL,
    PRISM_FUND_NAME       VARCHAR(100) NOT NULL,
    CONSTRAINT PK_CTHRU_FUND_MAP PRIMARY KEY (CTHRU_FUND_CODE)
);

MERGE INTO EOTSS_STAGING.CTHRU_FUND_MAP tgt
USING (
    SELECT * FROM VALUES
        ('0010', '0100', 'General Fund'),
        ('0015', '0100', 'General Fund'),
        ('0999', '0100', 'General Fund'),
        ('0100', '0200', 'Federal Grants'),
        ('0200', '0300', 'Capital Projects'),
        ('0210', '0300', 'Capital Projects'),
        ('0290', '0300', 'Capital Projects'),
        ('0050', '0300', 'Capital Projects'),
        ('0300', '0400', 'Trust & Special Revenue'),
        ('0350', '0400', 'Trust & Special Revenue'),
        ('0600', '0400', 'Trust & Special Revenue'),
        ('0900', '0400', 'Trust & Special Revenue'),
        ('0901', '0400', 'Trust & Special Revenue'),
        ('0690', '0400', 'Trust & Special Revenue'),
        ('0044', '0400', 'Trust & Special Revenue'),
        ('0644', '0400', 'Trust & Special Revenue'),
        ('0142', '0400', 'Trust & Special Revenue'),
        ('0056', '0400', 'Trust & Special Revenue'),
        ('0113', '0400', 'Trust & Special Revenue'),
        ('0114', '0400', 'Trust & Special Revenue'),
        ('0086', '0400', 'Trust & Special Revenue')
    AS src (CTHRU_FUND_CODE, PRISM_FUND_CODE, PRISM_FUND_NAME)
) src
ON tgt.CTHRU_FUND_CODE = src.CTHRU_FUND_CODE
WHEN NOT MATCHED THEN INSERT (CTHRU_FUND_CODE, PRISM_FUND_CODE, PRISM_FUND_NAME)
    VALUES (src.CTHRU_FUND_CODE, src.PRISM_FUND_CODE, src.PRISM_FUND_NAME);

-- =============================================================================
-- STEP 3: Aggregated budget authority (dept + fund grain)
-- Run AFTER loading CTHRU_BUDGETS_RAW via etl/load_cthru.py
-- =============================================================================
CREATE OR REPLACE TABLE EOTSS_STAGING.CTHRU_BUDGET_AUTHORITY AS
SELECT
    FISCAL_YEAR                       AS BUDGET_FISCAL_YEAR,
    DEPARTMENT_CODE,
    FUND_NUMBER                       AS FUND_CODE,
    SUM(TOTAL_ENACTED_BUDGET)         AS BUDGET_AUTHORITY,
    SUM(TOTAL_AVAILABLE_FOR_SPENDING) AS TOTAL_AVAILABLE,
    SUM(TOTAL_EXPENSES)               AS BUDGET_EXPENSES,
    SUM(BEGINNING_BALANCE)            AS BEGINNING_BALANCE,
    SUM(ORIGINAL_ENACTED_BUDGET)      AS ORIGINAL_BUDGET,
    SUM(SUPPLEMENTAL_BUDGET)          AS SUPPLEMENTAL_BUDGET,
    SUM(TRANSFER_IN)                  AS TRANSFER_IN,
    SUM(TRANSFER_OUT)                 AS TRANSFER_OUT,
    SUM(UNEXPENDED_REVERTED)          AS UNEXPENDED,
    COUNT(*)                          AS APPROPRIATION_COUNT
FROM EOTSS_STAGING.CTHRU_BUDGETS_RAW
GROUP BY FISCAL_YEAR, DEPARTMENT_CODE, FUND_NUMBER;

-- =============================================================================
-- STEP 4: Aggregated spending table (monthly dept/fund grain + budget join)
-- Run AFTER loading CTHRU_RAW and building CTHRU_BUDGET_AUTHORITY
-- =============================================================================
CREATE OR REPLACE TABLE EOTSS_STAGING.CTHRU_SPENDING AS
WITH monthly_spend AS (
    SELECT
        r.BUDGET_FISCAL_YEAR,
        r.FISCAL_PERIOD,
        r.DEPARTMENT_CODE,
        r.DEPARTMENT,
        r.CABINET_SECRETARIAT,
        r.FUND_CODE AS RAW_FUND_CODE,
        r.FUND      AS RAW_FUND_NAME,
        SUM(r.AMOUNT) AS PERIOD_EXPENDITURES,
        COUNT(*)      AS TXN_COUNT
    FROM EOTSS_STAGING.CTHRU_RAW r
    WHERE r.BUDGET_FISCAL_YEAR >= 2024
    GROUP BY r.BUDGET_FISCAL_YEAR, r.FISCAL_PERIOD, r.DEPARTMENT_CODE,
             r.DEPARTMENT, r.CABINET_SECRETARIAT, r.FUND_CODE, r.FUND
),
period_counts AS (
    SELECT BUDGET_FISCAL_YEAR, DEPARTMENT_CODE, RAW_FUND_CODE,
           COUNT(DISTINCT FISCAL_PERIOD) AS PERIOD_COUNT
    FROM monthly_spend
    GROUP BY BUDGET_FISCAL_YEAR, DEPARTMENT_CODE, RAW_FUND_CODE
),
ytd_spend AS (
    SELECT
        ms.BUDGET_FISCAL_YEAR,
        ms.FISCAL_PERIOD,
        ms.DEPARTMENT_CODE,
        ms.RAW_FUND_CODE,
        SUM(ms2.PERIOD_EXPENDITURES) AS YTD_EXPENDITURES
    FROM monthly_spend ms
    JOIN monthly_spend ms2
        ON ms2.BUDGET_FISCAL_YEAR = ms.BUDGET_FISCAL_YEAR
       AND ms2.DEPARTMENT_CODE = ms.DEPARTMENT_CODE
       AND ms2.RAW_FUND_CODE = ms.RAW_FUND_CODE
       AND ms2.FISCAL_PERIOD <= ms.FISCAL_PERIOD
    GROUP BY ms.BUDGET_FISCAL_YEAR, ms.FISCAL_PERIOD, ms.DEPARTMENT_CODE, ms.RAW_FUND_CODE
)
SELECT
    ROW_NUMBER() OVER (ORDER BY ms.BUDGET_FISCAL_YEAR, ms.FISCAL_PERIOD, ms.DEPARTMENT_CODE,
        COALESCE(fm.PRISM_FUND_CODE, ms.RAW_FUND_CODE))        AS RECORD_ID,
    ms.DEPARTMENT_CODE                                          AS AGENCY_CODE,
    INITCAP(REGEXP_REPLACE(ms.DEPARTMENT, '\\s*\\([A-Z0-9]+\\)\\s*$', ''))
                                                                AS AGENCY_NAME,
    COALESCE(sm.PRISM_SECRETARIAT_ID, 'OTHER')                 AS SECRETARIAT_ID,
    COALESCE(fm.PRISM_FUND_CODE, ms.RAW_FUND_CODE)             AS FUND_CODE,
    COALESCE(fm.PRISM_FUND_NAME, ms.RAW_FUND_NAME)             AS FUND_NAME,
    CASE
        WHEN ms.FISCAL_PERIOD <= 6
        THEN DATE_FROM_PARTS(ms.BUDGET_FISCAL_YEAR - 1, ms.FISCAL_PERIOD + 6, 1)
        WHEN ms.FISCAL_PERIOD <= 12
        THEN DATE_FROM_PARTS(ms.BUDGET_FISCAL_YEAR, ms.FISCAL_PERIOD - 6, 1)
        ELSE DATE_FROM_PARTS(ms.BUDGET_FISCAL_YEAR, 6, 30)
    END                                                         AS FISCAL_PERIOD_DATE,
    'FY' || ms.BUDGET_FISCAL_YEAR::VARCHAR                      AS FISCAL_YEAR_LABEL,
    ms.PERIOD_EXPENDITURES                                      AS TOTAL_EXPENDITURES,
    CASE
        WHEN ba.BUDGET_AUTHORITY IS NOT NULL AND ba.BUDGET_AUTHORITY > 0
        THEN ROUND(
            ms.PERIOD_EXPENDITURES +
            (ba.BUDGET_AUTHORITY - ba.BUDGET_EXPENSES) / NULLIF(pc.PERIOD_COUNT, 0),
            2)
        ELSE ROUND(ms.PERIOD_EXPENDITURES * 1.08, 2)
    END                                                         AS TOTAL_OBLIGATIONS,
    CASE
        WHEN ba.BUDGET_AUTHORITY IS NOT NULL
        THEN ROUND(ba.BUDGET_AUTHORITY / NULLIF(pc.PERIOD_COUNT, 0), 2)
        ELSE NULL
    END                                                         AS BUDGET_AUTHORITY,
    ba.BUDGET_AUTHORITY                                         AS ANNUAL_BUDGET_AUTHORITY,
    ba.TOTAL_AVAILABLE                                          AS ANNUAL_TOTAL_AVAILABLE,
    ytd.YTD_EXPENDITURES,
    ms.TXN_COUNT
FROM monthly_spend ms
LEFT JOIN EOTSS_STAGING.CTHRU_SECRETARIAT_MAP sm
    ON ms.CABINET_SECRETARIAT = sm.CTHRU_CABINET_NAME
LEFT JOIN EOTSS_STAGING.CTHRU_FUND_MAP fm
    ON ms.RAW_FUND_CODE = fm.CTHRU_FUND_CODE
LEFT JOIN EOTSS_STAGING.CTHRU_BUDGET_AUTHORITY ba
    ON ba.BUDGET_FISCAL_YEAR = ms.BUDGET_FISCAL_YEAR
   AND ba.DEPARTMENT_CODE = ms.DEPARTMENT_CODE
   AND ba.FUND_CODE = ms.RAW_FUND_CODE
LEFT JOIN period_counts pc
    ON pc.BUDGET_FISCAL_YEAR = ms.BUDGET_FISCAL_YEAR
   AND pc.DEPARTMENT_CODE = ms.DEPARTMENT_CODE
   AND pc.RAW_FUND_CODE = ms.RAW_FUND_CODE
LEFT JOIN ytd_spend ytd
    ON ytd.BUDGET_FISCAL_YEAR = ms.BUDGET_FISCAL_YEAR
   AND ytd.FISCAL_PERIOD = ms.FISCAL_PERIOD
   AND ytd.DEPARTMENT_CODE = ms.DEPARTMENT_CODE
   AND ytd.RAW_FUND_CODE = ms.RAW_FUND_CODE;

-- =============================================================================
-- STEP 5: Create V_CTHRU_SPENDING as a PARALLEL view (does NOT touch V_CIW_SPENDING)
-- V_CIW_SPENDING continues to read from EOTSS_POC.CIW_SPENDING (03-eotss-staging-views.sql).
-- The CTHRU endpoint queries V_CTHRU_SPENDING directly; existing endpoints are unaffected.
-- When ready to cut over, a future migration can swap V_CIW_SPENDING's FROM clause.
-- =============================================================================
CREATE OR REPLACE VIEW EOTSS_STAGING.V_CTHRU_SPENDING AS
SELECT
    RECORD_ID,
    AGENCY_CODE,
    AGENCY_NAME,
    SECRETARIAT_ID,
    FUND_CODE,
    FUND_NAME,
    FISCAL_PERIOD_DATE,
    FISCAL_YEAR_LABEL,
    TOTAL_OBLIGATIONS,
    TOTAL_EXPENDITURES,
    BUDGET_AUTHORITY,
    ANNUAL_BUDGET_AUTHORITY,
    YTD_EXPENDITURES,
    ROUND(TOTAL_OBLIGATIONS - TOTAL_EXPENDITURES, 2)                AS UNLIQUIDATED_OBLIGATIONS,
    CASE
        WHEN COALESCE(ANNUAL_BUDGET_AUTHORITY, 0) > 0
        THEN ROUND(LEAST(
            YTD_EXPENDITURES / ANNUAL_BUDGET_AUTHORITY * 100,
            999.99
        ), 2)
        WHEN COALESCE(BUDGET_AUTHORITY, 0) > 0
        THEN ROUND(LEAST(
            TOTAL_EXPENDITURES / BUDGET_AUTHORITY * 100,
            999.99
        ), 2)
        ELSE 0
    END                                                              AS BURN_RATE_PCT,
    TXN_COUNT
FROM EOTSS_STAGING.CTHRU_SPENDING;

-- =============================================================================
-- STEP 6: Add CTHRU departments to GOVERNANCE.SECRETARIAT_AGENCIES
-- Idempotent: only inserts rows that don't already exist
-- =============================================================================
INSERT INTO GOVERNANCE.SECRETARIAT_AGENCIES
    (SECRETARIAT_ID, SECRETARIAT_NAME, AGENCY_CODE, AGENCY_NAME)
SELECT
    sm.PRISM_SECRETARIAT_ID,
    r.CABINET_SECRETARIAT,
    r.DEPARTMENT_CODE,
    INITCAP(REGEXP_REPLACE(r.DEPARTMENT, '\\s*\\([A-Z0-9]+\\)\\s*$', ''))
FROM (
    SELECT DISTINCT CABINET_SECRETARIAT, DEPARTMENT_CODE, DEPARTMENT
    FROM EOTSS_STAGING.CTHRU_RAW
    WHERE BUDGET_FISCAL_YEAR = 2026
) r
JOIN EOTSS_STAGING.CTHRU_SECRETARIAT_MAP sm
    ON r.CABINET_SECRETARIAT = sm.CTHRU_CABINET_NAME
WHERE NOT EXISTS (
    SELECT 1 FROM GOVERNANCE.SECRETARIAT_AGENCIES sa
    WHERE sa.AGENCY_CODE = r.DEPARTMENT_CODE
      AND sa.SECRETARIAT_ID = sm.PRISM_SECRETARIAT_ID
);

-- =============================================================================
-- Verification queries
-- =============================================================================
SELECT 'CTHRU_RAW' AS source, COUNT(*) AS rows FROM EOTSS_STAGING.CTHRU_RAW
UNION ALL
SELECT 'CTHRU_SPENDING', COUNT(*) FROM EOTSS_STAGING.CTHRU_SPENDING
UNION ALL
SELECT 'V_CTHRU_SPENDING', COUNT(*) FROM EOTSS_STAGING.V_CTHRU_SPENDING;
