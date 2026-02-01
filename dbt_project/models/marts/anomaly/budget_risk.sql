-- Budget risk assessment view
-- Replaces EOTSS_STAGING.V_BUDGET_RISK
-- 4-CTE fiscal year logic: YTD actual + forecasted remaining vs budget authority
WITH fiscal_params AS (
    SELECT
        {{ fiscal_year_params() }} AS fy_start_year,
        {{ fiscal_year_label() }} AS fiscal_year_label
),

ytd_actual AS (
    SELECT
        s.AGENCY_CODE,
        s.AGENCY_NAME,
        s.SECRETARIAT_ID,
        fp.fiscal_year_label AS FISCAL_YEAR,
        SUM(s.TOTAL_EXPENDITURES) AS YTD_SPEND
    FROM {{ ref('stg_ciw_spending') }} s
    CROSS JOIN fiscal_params fp
    WHERE s.FISCAL_YEAR_LABEL = fp.fiscal_year_label
    GROUP BY s.AGENCY_CODE, s.AGENCY_NAME, s.SECRETARIAT_ID, fp.fiscal_year_label
),

forecasted_remaining AS (
    SELECT
        f.AGENCY_CODE,
        fp.fiscal_year_label AS FISCAL_YEAR,
        SUM(f.FORECAST) AS FORECASTED_REMAINING
    FROM {{ source('eotss_staging', 'BUDGET_FORECAST_RESULTS') }} f
    CROSS JOIN fiscal_params fp
    WHERE f.FISCAL_PERIOD_DATE >= (
            SELECT DATEADD('month', 1, MAX(FISCAL_PERIOD_DATE))
            FROM {{ source('eotss_staging', 'V_FORECAST_TRAINING') }}
            WHERE AGENCY_CODE = f.AGENCY_CODE
          )
      AND f.FISCAL_PERIOD_DATE < DATE_FROM_PARTS(fp.fy_start_year + 1, 7, 1)
    GROUP BY f.AGENCY_CODE, fp.fiscal_year_label
),

annual_budget AS (
    SELECT
        s.AGENCY_CODE,
        fp.fiscal_year_label AS FISCAL_YEAR,
        SUM(s.BUDGET_AUTHORITY) AS BUDGET_AUTHORITY
    FROM {{ ref('stg_ciw_spending') }} s
    CROSS JOIN fiscal_params fp
    WHERE s.FISCAL_YEAR_LABEL = fp.fiscal_year_label
    GROUP BY s.AGENCY_CODE, fp.fiscal_year_label
)

SELECT
    y.AGENCY_CODE,
    y.AGENCY_NAME,
    y.SECRETARIAT_ID,
    y.FISCAL_YEAR,
    ROUND(y.YTD_SPEND, 2) AS YTD_SPEND,
    ROUND(COALESCE(fr.FORECASTED_REMAINING, 0), 2) AS FORECASTED_REMAINING,
    ROUND(y.YTD_SPEND + COALESCE(fr.FORECASTED_REMAINING, 0), 2) AS PROJECTED_YEAR_END,
    ROUND(ab.BUDGET_AUTHORITY, 2) AS BUDGET_AUTHORITY,
    ROUND(y.YTD_SPEND + COALESCE(fr.FORECASTED_REMAINING, 0) - ab.BUDGET_AUTHORITY, 2) AS PROJECTED_SURPLUS_DEFICIT,
    CASE
        WHEN ab.BUDGET_AUTHORITY > 0
        THEN ROUND((y.YTD_SPEND + COALESCE(fr.FORECASTED_REMAINING, 0)) / ab.BUDGET_AUTHORITY * 100, 2)
        ELSE 0
    END AS PROJECTED_BURN_RATE_PCT,
    CASE
        WHEN ab.BUDGET_AUTHORITY > 0 AND
             (y.YTD_SPEND + COALESCE(fr.FORECASTED_REMAINING, 0)) / ab.BUDGET_AUTHORITY > 1.0
        THEN 'Over Budget'
        WHEN ab.BUDGET_AUTHORITY > 0 AND
             (y.YTD_SPEND + COALESCE(fr.FORECASTED_REMAINING, 0)) / ab.BUDGET_AUTHORITY > 0.9
        THEN 'At Risk'
        WHEN ab.BUDGET_AUTHORITY > 0 AND
             (y.YTD_SPEND + COALESCE(fr.FORECASTED_REMAINING, 0)) / ab.BUDGET_AUTHORITY > 0.5
        THEN 'On Track'
        ELSE 'Under-Utilized'
    END AS BUDGET_RISK_LEVEL
FROM ytd_actual y
LEFT JOIN forecasted_remaining fr
    ON y.AGENCY_CODE = fr.AGENCY_CODE AND y.FISCAL_YEAR = fr.FISCAL_YEAR
LEFT JOIN annual_budget ab
    ON y.AGENCY_CODE = ab.AGENCY_CODE AND y.FISCAL_YEAR = ab.FISCAL_YEAR
