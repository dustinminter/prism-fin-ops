-- =============================================================================
-- 03-eotss-staging-views.sql
-- EOTSS_STAGING schema + 4 staging views (the swap layer)
-- =============================================================================
-- These views are the ONLY thing the semantic model references.
-- When real CIW/CIP/Commbuys/CTHR data arrives, change the FROM clause
-- in each view to point to the real source tables. The semantic model
-- YAML stays the same.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS EOTSS_STAGING;

-- =============================================================================
-- VIEW 1: V_CIW_SPENDING
-- Source: EOTSS_STAGING.CTHRU_SPENDING (real Massachusetts CTHRU data)
-- Cutover from EOTSS_POC.CIW_SPENDING completed 2026-02-19
-- Adds: UNLIQUIDATED_OBLIGATIONS, BURN_RATE_PCT
-- =============================================================================
CREATE OR REPLACE VIEW EOTSS_STAGING.V_CIW_SPENDING AS
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
    -- Budget authority: real from CTHRU Budgets, prorated to period
    -- Falls back to estimate only if no budget data exists for this dept/fund
    COALESCE(BUDGET_AUTHORITY, ROUND(TOTAL_EXPENDITURES * 1.15, 2)) AS BUDGET_AUTHORITY,
    -- Computed: Unliquidated obligations
    ROUND(TOTAL_OBLIGATIONS - TOTAL_EXPENDITURES, 2)            AS UNLIQUIDATED_OBLIGATIONS,
    -- Computed: Burn rate (uses YTD expenditures against annual budget for accuracy)
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
    END                                                          AS BURN_RATE_PCT
FROM EOTSS_STAGING.CTHRU_SPENDING;

-- =============================================================================
-- VIEW 2: V_CIP_INVESTMENTS
-- Source (current): EOTSS_POC.CIP_INVESTMENTS
-- Swap target:      [CIP_SCHEMA].[CIP_TABLE]
-- Adds: VARIANCE_AMOUNT, VARIANCE_PCT
-- =============================================================================
CREATE OR REPLACE VIEW EOTSS_STAGING.V_CIP_INVESTMENTS AS
SELECT
    PROJECT_ID,
    PROJECT_NAME,
    AGENCY_CODE,
    AGENCY_NAME,
    SECRETARIAT,
    POLICY_AREA,
    PROJECT_STATUS,
    FISCAL_YEAR_START,
    FISCAL_YEAR_START_DATE,
    FISCAL_YEAR_END,
    PLANNED_BUDGET,
    ACTUAL_SPEND,
    PERCENT_COMPLETE,
    PROJECT_MANAGER,
    -- Computed: Variance = actual - planned (positive = over budget)
    ROUND(ACTUAL_SPEND - PLANNED_BUDGET, 2) AS VARIANCE_AMOUNT,
    -- Computed: Variance % = (actual - planned) / planned
    CASE
        WHEN PLANNED_BUDGET > 0
        THEN ROUND((ACTUAL_SPEND - PLANNED_BUDGET) / PLANNED_BUDGET * 100, 2)
        ELSE 0
    END AS VARIANCE_PCT
FROM EOTSS_POC.CIP_INVESTMENTS;
-- SWAP: Change FROM to [CIP_SCHEMA].[CIP_TABLE] and adjust column names.
--   Match to FACT_CIP_LINE_ITEM structure when available.

-- =============================================================================
-- VIEW 3: V_COMMBUYS_AWARDS
-- Source (current): EOTSS_POC.COMMBUYS_AWARDS
-- Swap target:      [COMMBUYS_SCHEMA].[COMMBUYS_TABLE]
-- Passthrough (clean shape)
-- =============================================================================
CREATE OR REPLACE VIEW EOTSS_STAGING.V_COMMBUYS_AWARDS AS
SELECT
    AWARD_ID,
    CONTRACT_NUMBER,
    VENDOR_NAME,
    AGENCY_CODE,
    AGENCY_NAME,
    CATEGORY,
    SET_ASIDE,
    AWARD_DATE,
    AWARD_AMOUNT,
    CONTRACT_START_DATE,
    CONTRACT_END_DATE,
    DESCRIPTION
FROM EOTSS_POC.COMMBUYS_AWARDS;
-- SWAP: Change FROM to [COMMBUYS_SCHEMA].[COMMBUYS_TABLE].
--   Commbuys data will need column mapping for:
--     VENDOR_NAME → vendor name field
--     CATEGORY    → commodity/service category
--     SET_ASIDE   → small business / diversity designation

-- =============================================================================
-- VIEW 4: V_CTHR_WORKFORCE
-- Source (current): EOTSS_POC.CTHR_WORKFORCE
-- Swap target:      [CTHR_SCHEMA].[CTHR_TABLE]
-- Passthrough (clean shape)
-- =============================================================================
CREATE OR REPLACE VIEW EOTSS_STAGING.V_CTHR_WORKFORCE AS
SELECT
    RECORD_ID,
    AGENCY_CODE,
    AGENCY_NAME,
    SECRETARIAT_ID,
    JOB_CLASSIFICATION,
    REPORTING_PERIOD_DATE,
    POSITION_COUNT,
    FILLED_POSITIONS,
    SALARY_OBLIGATIONS,
    VACANCY_RATE
FROM EOTSS_POC.CTHR_WORKFORCE;
-- SWAP: Change FROM to [CTHR_SCHEMA].[CTHR_TABLE].
--   CTHR data will need column mapping for:
--     POSITION_COUNT    → authorized positions
--     FILLED_POSITIONS  → filled headcount
--     SALARY_OBLIGATIONS→ salary budget/spend
--     VACANCY_RATE      → may need to compute from positions

-- =============================================================================
-- Verification
-- =============================================================================
SELECT 'V_CIW_SPENDING' AS view_name, COUNT(*) AS row_count FROM EOTSS_STAGING.V_CIW_SPENDING
UNION ALL
SELECT 'V_CIP_INVESTMENTS', COUNT(*) FROM EOTSS_STAGING.V_CIP_INVESTMENTS
UNION ALL
SELECT 'V_COMMBUYS_AWARDS', COUNT(*) FROM EOTSS_STAGING.V_COMMBUYS_AWARDS
UNION ALL
SELECT 'V_CTHR_WORKFORCE', COUNT(*) FROM EOTSS_STAGING.V_CTHR_WORKFORCE;

-- Spot-check computed columns
SELECT AGENCY_CODE, FISCAL_PERIOD_DATE, TOTAL_OBLIGATIONS, TOTAL_EXPENDITURES,
       BUDGET_AUTHORITY, UNLIQUIDATED_OBLIGATIONS, BURN_RATE_PCT
FROM EOTSS_STAGING.V_CIW_SPENDING
WHERE BURN_RATE_PCT > 90
ORDER BY BURN_RATE_PCT DESC
LIMIT 10;

SELECT PROJECT_NAME, PLANNED_BUDGET, ACTUAL_SPEND, VARIANCE_AMOUNT, VARIANCE_PCT
FROM EOTSS_STAGING.V_CIP_INVESTMENTS
WHERE VARIANCE_PCT > 0
ORDER BY VARIANCE_PCT DESC;
