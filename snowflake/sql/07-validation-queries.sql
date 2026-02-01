-- =============================================================================
-- 07-validation-queries.sql
-- Test queries for all 5 demo scenarios
-- =============================================================================
-- Run after scripts 01-05 to validate end-to-end data flow.
-- Each scenario should return non-empty results.
-- =============================================================================

-- =============================================================================
-- SCENARIO 1: Agency Spending Q&A
-- "What is total spending by secretariat for FY2026?"
-- Expected: 9 secretariats with dollar amounts
-- =============================================================================

-- 1a. Total spending by secretariat
SELECT
    SECRETARIAT_ID,
    COUNT(DISTINCT AGENCY_CODE) AS agency_count,
    SUM(TOTAL_OBLIGATIONS) AS total_obligations,
    SUM(TOTAL_EXPENDITURES) AS total_expenditures,
    SUM(BUDGET_AUTHORITY) AS total_budget,
    ROUND(SUM(TOTAL_EXPENDITURES) / NULLIF(SUM(BUDGET_AUTHORITY), 0) * 100, 2) AS overall_burn_rate
FROM EOTSS_STAGING.V_CIW_SPENDING
WHERE FISCAL_YEAR_LABEL = 'FY2026'
GROUP BY SECRETARIAT_ID
ORDER BY total_expenditures DESC;
-- PASS if: 7+ secretariats returned (not all 9 have spending data, only the 10 seeded agencies)

-- 1b. Monthly spending trend for a specific agency
SELECT
    AGENCY_CODE,
    FISCAL_PERIOD_DATE,
    FISCAL_YEAR_LABEL,
    SUM(TOTAL_EXPENDITURES) AS monthly_spending
FROM EOTSS_STAGING.V_CIW_SPENDING
WHERE AGENCY_CODE = 'MASSIT'
ORDER BY FISCAL_PERIOD_DATE;
-- PASS if: 24 rows (24 months x aggregated across fund codes shown as monthly totals)

-- 1c. Fund breakdown
SELECT
    FUND_NAME,
    SUM(TOTAL_EXPENDITURES) AS total_spending,
    SUM(BUDGET_AUTHORITY) AS total_budget
FROM EOTSS_STAGING.V_CIW_SPENDING
WHERE FISCAL_YEAR_LABEL = 'FY2026'
GROUP BY FUND_NAME
ORDER BY total_spending DESC;
-- PASS if: 4 fund types returned

-- =============================================================================
-- SCENARIO 2: Anomaly Investigation
-- "Which agencies have burn rate above 90%?"
-- Expected: At least 1 agency flagged (ITD and CYBER have injected anomalies)
-- =============================================================================

-- 2a. High burn rate records
SELECT
    AGENCY_CODE,
    AGENCY_NAME,
    FUND_NAME,
    FISCAL_PERIOD_DATE,
    BURN_RATE_PCT,
    TOTAL_EXPENDITURES,
    BUDGET_AUTHORITY,
    UNLIQUIDATED_OBLIGATIONS
FROM EOTSS_STAGING.V_CIW_SPENDING
WHERE BURN_RATE_PCT > 90
ORDER BY BURN_RATE_PCT DESC
LIMIT 20;
-- PASS if: At least 2 rows (ITD Dec 2025 ~135%, CYBER Jan 2026 ~125%)

-- 2b. Over-budget agencies (burn rate > 100%)
SELECT
    AGENCY_CODE,
    AGENCY_NAME,
    FISCAL_PERIOD_DATE,
    BURN_RATE_PCT,
    TOTAL_EXPENDITURES - BUDGET_AUTHORITY AS overspend_amount
FROM EOTSS_STAGING.V_CIW_SPENDING
WHERE BURN_RATE_PCT > 100
ORDER BY BURN_RATE_PCT DESC;
-- PASS if: At least 1 row (injected anomalies)

-- 2c. ULO risk — high unliquidated obligations
SELECT
    AGENCY_CODE,
    AGENCY_NAME,
    SUM(UNLIQUIDATED_OBLIGATIONS) AS total_ulo,
    SUM(TOTAL_OBLIGATIONS) AS total_obligations,
    ROUND(SUM(UNLIQUIDATED_OBLIGATIONS) / NULLIF(SUM(TOTAL_OBLIGATIONS), 0) * 100, 2) AS ulo_pct
FROM EOTSS_STAGING.V_CIW_SPENDING
WHERE FISCAL_YEAR_LABEL = 'FY2026'
GROUP BY AGENCY_CODE, AGENCY_NAME
HAVING SUM(UNLIQUIDATED_OBLIGATIONS) > 0
ORDER BY total_ulo DESC
LIMIT 10;
-- PASS if: Multiple agencies returned with positive ULO

-- =============================================================================
-- SCENARIO 3: Executive Narrative
-- Verify data is available for Cortex COMPLETE prompt context
-- =============================================================================

-- 3a. Context bundle: top-level KPIs for narrative generation
SELECT
    COUNT(DISTINCT AGENCY_CODE) AS total_agencies,
    COUNT(DISTINCT SECRETARIAT_ID) AS total_secretariats,
    SUM(TOTAL_EXPENDITURES) AS total_spending_fy2026,
    SUM(BUDGET_AUTHORITY) AS total_budget_fy2026,
    ROUND(SUM(TOTAL_EXPENDITURES) / NULLIF(SUM(BUDGET_AUTHORITY), 0) * 100, 2) AS overall_burn_rate,
    SUM(UNLIQUIDATED_OBLIGATIONS) AS total_ulo,
    COUNT(CASE WHEN BURN_RATE_PCT > 100 THEN 1 END) AS over_budget_records,
    COUNT(CASE WHEN BURN_RATE_PCT > 90 THEN 1 END) AS high_burn_records
FROM EOTSS_STAGING.V_CIW_SPENDING
WHERE FISCAL_YEAR_LABEL = 'FY2026';
-- PASS if: Returns 1 row with non-null values for all columns

-- 3b. CIP project status summary (for narrative context)
SELECT
    PROJECT_STATUS,
    COUNT(*) AS project_count,
    SUM(PLANNED_BUDGET) AS total_planned,
    SUM(ACTUAL_SPEND) AS total_spent,
    SUM(VARIANCE_AMOUNT) AS total_variance
FROM EOTSS_STAGING.V_CIP_INVESTMENTS
GROUP BY PROJECT_STATUS;
-- PASS if: At least 2 statuses (In Progress, Planning)

-- =============================================================================
-- SCENARIO 4: Forecasting
-- Verify FORECAST model input data is sufficient
-- =============================================================================

-- 4a. Verify time series depth per agency (need 24+ points for FORECAST)
SELECT
    AGENCY_CODE,
    COUNT(DISTINCT FISCAL_PERIOD_DATE) AS month_count,
    MIN(FISCAL_PERIOD_DATE) AS earliest_month,
    MAX(FISCAL_PERIOD_DATE) AS latest_month
FROM EOTSS_STAGING.V_CIW_SPENDING
GROUP BY AGENCY_CODE
ORDER BY AGENCY_CODE;
-- PASS if: All agencies show 24 months (or close)

-- 4b. Aggregated monthly totals (what FORECAST model trains on)
SELECT
    AGENCY_CODE,
    FISCAL_PERIOD_DATE,
    SUM(TOTAL_EXPENDITURES) AS total_expenditures
FROM EOTSS_STAGING.V_CIW_SPENDING
GROUP BY AGENCY_CODE, FISCAL_PERIOD_DATE
ORDER BY AGENCY_CODE, FISCAL_PERIOD_DATE
LIMIT 30;
-- PASS if: Ordered time series data with non-null amounts

-- 4c. After model creation, run forecast (uncomment after 04-cortex-models.sql)
/*
CALL EOTSS_STAGING.EOTSS_SPENDING_FORECAST!FORECAST(
    FORECASTING_PERIODS => 6,
    CONFIG_OBJECT => {'prediction_interval': 0.95}
);
-- PASS if: Returns 6 rows per agency with forecast, lower, upper bounds
*/

-- =============================================================================
-- SCENARIO 5: Cross-Source Analysis
-- "What is the total cost per agency including salaries?"
-- =============================================================================

-- 5a. Spending + workforce join
SELECT
    s.AGENCY_CODE,
    s.AGENCY_NAME,
    SUM(s.TOTAL_EXPENDITURES) AS operational_spending,
    w.total_salary,
    SUM(s.TOTAL_EXPENDITURES) + COALESCE(w.total_salary, 0) AS total_cost,
    w.total_positions,
    w.total_filled,
    w.avg_vacancy_rate
FROM EOTSS_STAGING.V_CIW_SPENDING s
LEFT JOIN (
    SELECT
        AGENCY_CODE,
        SUM(SALARY_OBLIGATIONS) AS total_salary,
        SUM(POSITION_COUNT) AS total_positions,
        SUM(FILLED_POSITIONS) AS total_filled,
        AVG(VACANCY_RATE) AS avg_vacancy_rate
    FROM EOTSS_STAGING.V_CTHR_WORKFORCE
    GROUP BY AGENCY_CODE
) w ON s.AGENCY_CODE = w.AGENCY_CODE
WHERE s.FISCAL_YEAR_LABEL = 'FY2026'
GROUP BY s.AGENCY_CODE, s.AGENCY_NAME, w.total_salary, w.total_positions, w.total_filled, w.avg_vacancy_rate
ORDER BY total_cost DESC;
-- PASS if: Multiple agencies with both operational spending and salary data

-- 5b. CIP projects + procurement awards join
SELECT
    c.PROJECT_NAME,
    c.AGENCY_CODE,
    c.PLANNED_BUDGET,
    c.ACTUAL_SPEND,
    c.VARIANCE_PCT,
    COUNT(p.AWARD_ID) AS related_awards,
    SUM(p.AWARD_AMOUNT) AS total_award_value
FROM EOTSS_STAGING.V_CIP_INVESTMENTS c
LEFT JOIN EOTSS_STAGING.V_COMMBUYS_AWARDS p
    ON c.AGENCY_CODE = p.AGENCY_CODE
GROUP BY c.PROJECT_NAME, c.AGENCY_CODE, c.PLANNED_BUDGET, c.ACTUAL_SPEND, c.VARIANCE_PCT
ORDER BY c.PLANNED_BUDGET DESC
LIMIT 10;
-- PASS if: Projects show related procurement awards

-- 5c. Cybersecurity posture: spending + workforce + procurement
SELECT
    'Cybersecurity' AS domain,
    (SELECT SUM(TOTAL_EXPENDITURES)
     FROM EOTSS_STAGING.V_CIW_SPENDING
     WHERE AGENCY_CODE = 'CYBER' AND FISCAL_YEAR_LABEL = 'FY2026') AS operational_spending,
    (SELECT SUM(SALARY_OBLIGATIONS)
     FROM EOTSS_STAGING.V_CTHR_WORKFORCE
     WHERE AGENCY_CODE = 'CYBER') AS salary_costs,
    (SELECT SUM(AWARD_AMOUNT)
     FROM EOTSS_STAGING.V_COMMBUYS_AWARDS
     WHERE AGENCY_CODE = 'CYBER') AS procurement_awards,
    (SELECT AVG(VACANCY_RATE)
     FROM EOTSS_STAGING.V_CTHR_WORKFORCE
     WHERE AGENCY_CODE = 'CYBER') AS avg_vacancy_rate,
    (SELECT COUNT(*)
     FROM EOTSS_STAGING.V_CIP_INVESTMENTS
     WHERE AGENCY_CODE = 'CYBER') AS active_projects;
-- PASS if: Returns 1 row with non-null values across all columns

-- =============================================================================
-- SUMMARY: Validation Checklist
-- =============================================================================
-- Run this final query to get a quick pass/fail summary:
SELECT
    'Scenario 1: Agency Spending' AS scenario,
    (SELECT COUNT(DISTINCT SECRETARIAT_ID) FROM EOTSS_STAGING.V_CIW_SPENDING WHERE FISCAL_YEAR_LABEL = 'FY2026') AS result,
    '7+ secretariats' AS expected
UNION ALL
SELECT
    'Scenario 2: Anomaly Detection',
    (SELECT COUNT(*) FROM EOTSS_STAGING.V_CIW_SPENDING WHERE BURN_RATE_PCT > 100),
    '1+ over-budget records'
UNION ALL
SELECT
    'Scenario 3: Narrative Context',
    (SELECT COUNT(*) FROM EOTSS_STAGING.V_CIP_INVESTMENTS),
    '25 CIP projects'
UNION ALL
SELECT
    'Scenario 4: Forecast Data Depth',
    (SELECT MIN(cnt) FROM (SELECT COUNT(DISTINCT FISCAL_PERIOD_DATE) AS cnt FROM EOTSS_STAGING.V_CIW_SPENDING GROUP BY AGENCY_CODE)),
    '24 months per agency'
UNION ALL
SELECT
    'Scenario 5: Cross-Source Join',
    (SELECT COUNT(*) FROM EOTSS_STAGING.V_CIW_SPENDING s JOIN EOTSS_STAGING.V_CTHR_WORKFORCE w ON s.AGENCY_CODE = w.AGENCY_CODE WHERE s.FISCAL_YEAR_LABEL = 'FY2026'),
    '1+ joined records';
