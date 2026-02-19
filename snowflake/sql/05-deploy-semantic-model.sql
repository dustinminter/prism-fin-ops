-- =============================================================================
-- 05-deploy-semantic-model.sql
-- Create semantic view using inline YAML for Snowflake Intelligence UI
-- =============================================================================
-- SYSTEM$CREATE_SEMANTIC_VIEW_FROM_YAML requires inline YAML (not a stage path).
-- The YAML uses the Semantic View format: dimensions, facts, metrics
-- (NOT the Cortex Analyst format: time_dimensions, measures, verified_queries).
--
-- The semantic-model.yaml file in the repo root uses Cortex Analyst format
-- and is kept for reference/REST API use. This SQL is the authoritative
-- deployment artifact for the Snowflake Intelligence UI.
-- =============================================================================

-- =============================================================================
-- OPTION A: Cortex Analyst REST API (stage-based, for programmatic access)
-- =============================================================================
-- If you also want to use the Cortex Analyst REST API, upload the
-- semantic-model.yaml (Cortex Analyst format) to a stage:
--
-- CREATE STAGE IF NOT EXISTS FEDERAL_FINANCIAL_DATA.EOTSS_STAGING.SEMANTIC_MODEL_STAGE
--     DIRECTORY = (ENABLE = TRUE)
--     COMMENT = 'Stage for PRISM EOTSS FinOps semantic model YAML';
--
-- PUT file://semantic-model.yaml @FEDERAL_FINANCIAL_DATA.EOTSS_STAGING.SEMANTIC_MODEL_STAGE AUTO_COMPRESS=FALSE;
--
-- Then reference in REST API:
-- POST /api/v2/cortex/analyst/message
-- {
--   "messages": [{"role": "user", "content": [{"type": "text", "text": "..."}]}],
--   "semantic_model_file": "@FEDERAL_FINANCIAL_DATA.EOTSS_STAGING.SEMANTIC_MODEL_STAGE/semantic-model.yaml"
-- }

-- =============================================================================
-- OPTION B: Native Semantic View (recommended for Intelligence UI)
-- =============================================================================
-- Creates a semantic view that the Snowflake Intelligence UI can discover
-- and use for natural language queries. Uses inline YAML with dollar-quote delimiters.

CALL SYSTEM$CREATE_SEMANTIC_VIEW_FROM_YAML(
  'FEDERAL_FINANCIAL_DATA.EOTSS_STAGING',
  $$
name: PRISM_EOTSS_FINOPS
description: >
  Commonwealth of Massachusetts financial operations intelligence model for EOTSS.
  Covers agency spending (CIW), capital IT investments (CIP), procurement awards
  (Commbuys), and workforce costs (CTHR). Designed for budget directors and
  secretariat leadership to query spending, detect anomalies, and forecast trends
  using natural language.

tables:
  # ===========================================================================
  # TABLE 1: Agency Spending (CIW)
  # ===========================================================================
  - name: SPENDING_BY_AGENCY
    description: >
      Monthly spending data by Commonwealth agency, fund code, and fiscal period.
      Sourced from the Comptroller Information Warehouse (CIW). Includes obligations,
      expenditures, budget authority, unliquidated obligations, and burn rate.
    synonyms:
      - agency spending
      - CIW data
      - spending data
      - appropriations
      - expenditure data
    base_table:
      database: FEDERAL_FINANCIAL_DATA
      schema: EOTSS_STAGING
      table: V_CIW_SPENDING
    primary_key:
      columns:
        - AGENCY_CODE
        - FUND_CODE
        - FISCAL_PERIOD_DATE
    dimensions:
      - name: AGENCY_CODE
        description: Unique code identifying the Commonwealth agency (e.g., ITD, MASSIT, DPH)
        synonyms:
          - agency
          - department code
          - org code
        expr: AGENCY_CODE
        data_type: VARCHAR
      - name: AGENCY_NAME
        description: Full name of the Commonwealth agency
        synonyms:
          - agency name
          - department name
          - department
        expr: AGENCY_NAME
        data_type: VARCHAR
      - name: SECRETARIAT_ID
        description: >
          The executive office (secretariat) that oversees the agency.
          Massachusetts state government is organized under secretariats
          (e.g., EOTSS, HHS, ANF, DOT).
        synonyms:
          - secretariat
          - executive office
          - cabinet
        expr: SECRETARIAT_ID
        data_type: VARCHAR
      - name: FUND_CODE
        description: >
          State fund code identifying the funding source.
          0100 = General Fund, 0200 = Federal Funds, 0300 = Capital Fund, 0400 = Trust Funds.
        synonyms:
          - fund
          - funding source
          - appropriation fund
        expr: FUND_CODE
        data_type: VARCHAR
      - name: FUND_NAME
        description: Descriptive name of the fund code
        expr: FUND_NAME
        data_type: VARCHAR
      - name: FISCAL_YEAR_LABEL
        description: Massachusetts state fiscal year label (FY2025, FY2026). Fiscal year runs July 1 through June 30.
        synonyms:
          - fiscal year
          - FY
          - budget year
        expr: FISCAL_YEAR_LABEL
        data_type: VARCHAR
      - name: FISCAL_PERIOD_DATE
        description: First day of the fiscal month for this spending record
        synonyms:
          - month
          - fiscal period
          - spending month
          - date
        expr: FISCAL_PERIOD_DATE
        data_type: DATE
    facts:
      - name: TOTAL_OBLIGATIONS
        description: >
          Total amount obligated (committed) for the period. Includes
          encumbrances and allotments.
        synonyms:
          - obligations
          - committed spending
          - encumbrances
          - allotments
        expr: TOTAL_OBLIGATIONS
        data_type: "NUMBER(38,2)"
      - name: TOTAL_EXPENDITURES
        description: Total amount actually spent (disbursed) for the period
        synonyms:
          - expenditures
          - spending
          - outlays
          - disbursements
          - actual spend
        expr: TOTAL_EXPENDITURES
        data_type: "NUMBER(38,2)"
      - name: BUDGET_AUTHORITY
        description: Authorized budget for the period
        synonyms:
          - budget
          - appropriation
          - authorized amount
          - budget limit
        expr: BUDGET_AUTHORITY
        data_type: "NUMBER(38,2)"
      - name: UNLIQUIDATED_OBLIGATIONS
        description: >
          Obligations not yet paid (obligations minus expenditures).
          High ULO at fiscal year-end is a risk indicator.
        synonyms:
          - ULO
          - unliquidated
          - unpaid obligations
          - outstanding commitments
        expr: UNLIQUIDATED_OBLIGATIONS
        data_type: "NUMBER(38,2)"
      - name: BURN_RATE_PCT
        description: >
          Percentage of budget spent (expenditures / budget * 100).
          Above 100% means over budget. Above 90% is a warning.
        synonyms:
          - burn rate
          - spend rate
          - utilization rate
          - budget utilization
        expr: BURN_RATE_PCT
        data_type: "NUMBER(10,2)"
    metrics:
      - name: TOTAL_SPENDING
        description: Sum of all expenditures across agencies and periods
        expr: SUM(spending_by_agency.total_expenditures)
      - name: TOTAL_BUDGET
        description: Sum of all budget authority
        expr: SUM(spending_by_agency.budget_authority)
      - name: TOTAL_OBLIGATIONS_AMOUNT
        description: Sum of all obligations
        expr: SUM(spending_by_agency.total_obligations)
      - name: AVG_BURN_RATE
        description: Average burn rate percentage
        expr: AVG(spending_by_agency.burn_rate_pct)
      - name: AGENCY_COUNT
        description: Count of distinct agencies
        expr: COUNT(DISTINCT spending_by_agency.agency_code)

  # ===========================================================================
  # TABLE 2: Capital IT Investments (CIP)
  # ===========================================================================
  - name: CIP_INVESTMENTS
    description: >
      Capital Investment Program (CIP) projects tracking IT investments
      across state agencies. Includes planned budget, actual spend,
      variance, and project status.
    synonyms:
      - capital investments
      - CIP projects
      - IT investments
      - IT projects
      - capital programs
    base_table:
      database: FEDERAL_FINANCIAL_DATA
      schema: EOTSS_STAGING
      table: V_CIP_INVESTMENTS
    primary_key:
      columns:
        - PROJECT_ID
    dimensions:
      - name: PROJECT_ID
        description: Unique identifier for the CIP project
        expr: PROJECT_ID
        data_type: VARCHAR
      - name: PROJECT_NAME
        description: Name of the capital investment project
        synonyms:
          - project
          - program name
          - initiative
        expr: PROJECT_NAME
        data_type: VARCHAR
      - name: AGENCY_CODE
        description: Agency responsible for the project
        synonyms:
          - agency
          - owning agency
        expr: AGENCY_CODE
        data_type: VARCHAR
      - name: SECRETARIAT
        description: Executive office overseeing the project
        synonyms:
          - secretariat
          - executive office
        expr: SECRETARIAT
        data_type: VARCHAR
      - name: POLICY_AREA
        description: Technology domain or policy area of the project
        synonyms:
          - category
          - domain
          - technology area
        expr: POLICY_AREA
        data_type: VARCHAR
      - name: PROJECT_STATUS
        description: Current status of the project
        synonyms:
          - status
          - phase
        expr: PROJECT_STATUS
        data_type: VARCHAR
      - name: FISCAL_YEAR_START
        description: Fiscal year when the project started
        expr: FISCAL_YEAR_START
        data_type: VARCHAR
      - name: FISCAL_YEAR_END
        description: Fiscal year when the project is expected to complete
        expr: FISCAL_YEAR_END
        data_type: VARCHAR
      - name: PROJECT_MANAGER
        description: Name of the project manager
        expr: PROJECT_MANAGER
        data_type: VARCHAR
      - name: FISCAL_YEAR_START_DATE
        description: Start date of the project
        synonyms:
          - start date
          - project start
        expr: FISCAL_YEAR_START_DATE
        data_type: DATE
    facts:
      - name: PLANNED_BUDGET
        description: Total planned budget for the project
        synonyms:
          - planned cost
          - estimated budget
          - project budget
        expr: PLANNED_BUDGET
        data_type: "NUMBER(38,2)"
      - name: ACTUAL_SPEND
        description: Total actual spending to date on the project
        synonyms:
          - actual cost
          - spent to date
          - actual spending
        expr: ACTUAL_SPEND
        data_type: "NUMBER(38,2)"
      - name: VARIANCE_AMOUNT
        description: Budget variance in dollars (actual - planned). Positive means over budget.
        synonyms:
          - variance
          - budget variance
          - over/under
        expr: VARIANCE_AMOUNT
        data_type: "NUMBER(38,2)"
      - name: VARIANCE_PCT
        description: Budget variance as a percentage
        synonyms:
          - variance percent
          - percent over budget
        expr: VARIANCE_PCT
        data_type: "NUMBER(10,2)"
      - name: PERCENT_COMPLETE
        description: Estimated project completion percentage (0-100)
        synonyms:
          - completion
          - progress
          - percent done
        expr: PERCENT_COMPLETE
        data_type: "NUMBER(5,2)"
    metrics:
      - name: TOTAL_PLANNED_INVESTMENT
        description: Sum of all planned budgets across projects
        expr: SUM(cip_investments.planned_budget)
      - name: TOTAL_ACTUAL_INVESTMENT
        description: Sum of all actual spending across projects
        expr: SUM(cip_investments.actual_spend)
      - name: PROJECT_COUNT
        description: Count of CIP projects
        expr: COUNT(cip_investments.project_id)
      - name: AVG_COMPLETION
        description: Average project completion percentage
        expr: AVG(cip_investments.percent_complete)

  # ===========================================================================
  # TABLE 3: Procurement Awards (Commbuys)
  # ===========================================================================
  - name: PROCUREMENT_AWARDS
    description: >
      State procurement contracts and vendor awards from the Commbuys system.
      Includes vendor name, award amount, category, and diversity set-aside
      designations (MBE, WBE, Small Business).
    synonyms:
      - procurement
      - contracts
      - Commbuys
      - vendor awards
      - purchase orders
      - RFPs
    base_table:
      database: FEDERAL_FINANCIAL_DATA
      schema: EOTSS_STAGING
      table: V_COMMBUYS_AWARDS
    primary_key:
      columns:
        - AWARD_ID
    dimensions:
      - name: AWARD_ID
        description: Unique award identifier
        expr: AWARD_ID
        data_type: VARCHAR
      - name: CONTRACT_NUMBER
        description: State contract or ITS number
        synonyms:
          - contract
          - contract ID
        expr: CONTRACT_NUMBER
        data_type: VARCHAR
      - name: VENDOR_NAME
        description: Name of the awarded vendor or contractor
        synonyms:
          - vendor
          - contractor
          - supplier
          - company
        expr: VENDOR_NAME
        data_type: VARCHAR
      - name: AGENCY_CODE
        description: Agency that issued the procurement
        synonyms:
          - agency
          - buying agency
          - issuing agency
        expr: AGENCY_CODE
        data_type: VARCHAR
      - name: CATEGORY
        description: Procurement category or commodity type
        synonyms:
          - type
          - commodity
          - service category
          - procurement type
        expr: CATEGORY
        data_type: VARCHAR
      - name: SET_ASIDE
        description: Diversity or small business set-aside designation (MBE, WBE, Small Business)
        synonyms:
          - diversity designation
          - small business
          - MBE
          - WBE
          - minority business
          - women-owned
        expr: SET_ASIDE
        data_type: VARCHAR
      - name: DESCRIPTION
        description: Brief description of the procurement scope
        expr: DESCRIPTION
        data_type: VARCHAR
      - name: AWARD_DATE
        description: Date the award was made
        synonyms:
          - date awarded
          - procurement date
        expr: AWARD_DATE
        data_type: DATE
    facts:
      - name: AWARD_AMOUNT
        description: Total dollar value of the procurement award
        synonyms:
          - contract value
          - award value
          - contract amount
          - total contract
        expr: AWARD_AMOUNT
        data_type: "NUMBER(38,2)"
    metrics:
      - name: TOTAL_AWARDED
        description: Sum of all award amounts
        expr: SUM(procurement_awards.award_amount)
      - name: AWARD_COUNT
        description: Count of procurement awards
        expr: COUNT(procurement_awards.award_id)
      - name: AVG_AWARD_VALUE
        description: Average award amount
        expr: AVG(procurement_awards.award_amount)

  # ===========================================================================
  # TABLE 4: Workforce Costs (CTHR)
  # ===========================================================================
  - name: WORKFORCE_COSTS
    description: >
      Workforce data by agency from the CTHR (human resources) system.
      Includes position counts, salary obligations, filled positions,
      and vacancy rates by job classification.
    synonyms:
      - workforce
      - CTHR
      - HR data
      - personnel
      - staffing
      - headcount
      - employees
    base_table:
      database: FEDERAL_FINANCIAL_DATA
      schema: EOTSS_STAGING
      table: V_CTHR_WORKFORCE
    primary_key:
      columns:
        - AGENCY_CODE
        - JOB_CLASSIFICATION
        - REPORTING_PERIOD_DATE
    dimensions:
      - name: AGENCY_CODE
        description: Agency code for the workforce record
        synonyms:
          - agency
          - department
        expr: AGENCY_CODE
        data_type: VARCHAR
      - name: AGENCY_NAME
        description: Full name of the agency
        synonyms:
          - agency name
          - department name
        expr: AGENCY_NAME
        data_type: VARCHAR
      - name: SECRETARIAT_ID
        description: Executive office overseeing the agency
        synonyms:
          - secretariat
          - executive office
        expr: SECRETARIAT_ID
        data_type: VARCHAR
      - name: JOB_CLASSIFICATION
        description: Job classification or title category
        synonyms:
          - job title
          - position type
          - classification
          - role
        expr: JOB_CLASSIFICATION
        data_type: VARCHAR
      - name: REPORTING_PERIOD_DATE
        description: First day of the reporting period for this workforce snapshot
        synonyms:
          - reporting date
          - period
          - as of date
        expr: REPORTING_PERIOD_DATE
        data_type: DATE
    facts:
      - name: POSITION_COUNT
        description: Total authorized positions (funded headcount)
        synonyms:
          - positions
          - authorized headcount
          - FTE count
          - total positions
        expr: POSITION_COUNT
        data_type: "NUMBER(10,0)"
      - name: FILLED_POSITIONS
        description: Number of positions currently filled
        synonyms:
          - filled
          - current headcount
          - active employees
        expr: FILLED_POSITIONS
        data_type: "NUMBER(10,0)"
      - name: SALARY_OBLIGATIONS
        description: Total salary obligations (payroll budget) for the period
        synonyms:
          - salaries
          - payroll
          - salary budget
          - compensation
          - personnel costs
        expr: SALARY_OBLIGATIONS
        data_type: "NUMBER(38,2)"
      - name: VACANCY_RATE
        description: >
          Percentage of authorized positions that are vacant.
          High vacancy rates may indicate hiring challenges.
        synonyms:
          - vacancies
          - vacancy percentage
          - unfilled rate
          - hiring gap
        expr: VACANCY_RATE
        data_type: "NUMBER(5,2)"
    metrics:
      - name: TOTAL_POSITIONS
        description: Sum of all authorized positions
        expr: SUM(workforce_costs.position_count)
      - name: TOTAL_FILLED
        description: Sum of all filled positions
        expr: SUM(workforce_costs.filled_positions)
      - name: TOTAL_SALARY
        description: Sum of all salary obligations
        expr: SUM(workforce_costs.salary_obligations)
      - name: AVG_VACANCY_RATE
        description: Average vacancy rate across agencies
        expr: AVG(workforce_costs.vacancy_rate)

  # ===========================================================================
  # TABLE 5: Spend Anomalies (Anomaly Detection Layer)
  # ===========================================================================
  - name: SPEND_ANOMALIES
    description: >
      Spending anomalies detected by Cortex ML ANOMALY_DETECTION model.
      Each row is a monthly agency spending observation with anomaly flag,
      severity classification, and deviation metrics. Use to identify
      unusual spending spikes or drops across Commonwealth agencies.
    synonyms:
      - spending anomalies
      - anomaly detection
      - spending outliers
      - unusual spending
      - spending deviations
      - spending flags
    base_table:
      database: FEDERAL_FINANCIAL_DATA
      schema: EOTSS_STAGING
      table: V_SPEND_ANOMALIES
    primary_key:
      columns:
        - AGENCY_CODE
        - FISCAL_PERIOD_DATE
    dimensions:
      - name: AGENCY_CODE
        description: Agency code for the spending observation
        synonyms:
          - agency
          - department
        expr: AGENCY_CODE
        data_type: VARCHAR
      - name: AGENCY_NAME
        description: Full name of the agency
        synonyms:
          - agency name
          - department name
        expr: AGENCY_NAME
        data_type: VARCHAR
      - name: SECRETARIAT_ID
        description: Executive office overseeing the agency
        synonyms:
          - secretariat
          - executive office
        expr: SECRETARIAT_ID
        data_type: VARCHAR
      - name: FISCAL_PERIOD_DATE
        description: Month of the spending observation
        synonyms:
          - month
          - fiscal period
          - date
        expr: FISCAL_PERIOD_DATE
        data_type: DATE
      - name: ANOMALY_SEVERITY
        description: >
          Severity of the anomaly based on standard deviations from expected:
          Critical (>3σ), Warning (>2σ), Minor (>1σ), Normal.
        synonyms:
          - severity
          - risk level
          - anomaly level
        expr: ANOMALY_SEVERITY
        data_type: VARCHAR
      - name: IS_ANOMALY
        description: Whether this observation is a statistical anomaly (TRUE/FALSE)
        synonyms:
          - anomaly flag
          - is flagged
          - flagged
        expr: IS_ANOMALY
        data_type: BOOLEAN
    facts:
      - name: ACTUAL_SPEND
        description: Actual spending amount for the period
        synonyms:
          - actual
          - spending
          - expenditures
        expr: ACTUAL_SPEND
        data_type: "NUMBER(38,2)"
      - name: EXPECTED_SPEND
        description: ML model's expected (predicted) spending amount
        synonyms:
          - expected
          - predicted
          - forecast
        expr: EXPECTED_SPEND
        data_type: "NUMBER(38,2)"
      - name: DISTANCE
        description: >
          Statistical distance (z-score) from expected value.
          Higher absolute values indicate more unusual spending.
        synonyms:
          - z-score
          - deviation score
          - standard deviations
        expr: DISTANCE
        data_type: "NUMBER(10,4)"
      - name: SPEND_DEVIATION_PCT
        description: >
          Percentage deviation of actual from expected spending.
          Positive means overspending, negative means underspending.
        synonyms:
          - deviation percent
          - percent deviation
          - spending deviation
        expr: SPEND_DEVIATION_PCT
        data_type: "NUMBER(10,2)"
    metrics:
      - name: ANOMALY_COUNT
        description: Count of flagged anomalies
        expr: COUNT_IF(spend_anomalies.is_anomaly = TRUE)
      - name: AVG_DEVIATION
        description: Average spending deviation percentage across anomalies
        expr: AVG(spend_anomalies.spend_deviation_pct)

  # ===========================================================================
  # TABLE 6: Budget Risk (Forecast-based)
  # ===========================================================================
  - name: BUDGET_RISK
    description: >
      Budget risk assessment by agency using Cortex ML FORECAST model.
      Projects year-end spending based on YTD actuals plus forecasted
      remaining months, compared against budget authority. Identifies
      agencies at risk of exceeding budget.
    synonyms:
      - budget risk
      - burn rate forecast
      - budget projection
      - over budget
      - budget forecast
      - spending forecast
    base_table:
      database: FEDERAL_FINANCIAL_DATA
      schema: EOTSS_STAGING
      table: V_BUDGET_RISK
    primary_key:
      columns:
        - AGENCY_CODE
        - FISCAL_YEAR
    dimensions:
      - name: AGENCY_CODE
        description: Agency code
        synonyms:
          - agency
          - department
        expr: AGENCY_CODE
        data_type: VARCHAR
      - name: AGENCY_NAME
        description: Full name of the agency
        synonyms:
          - agency name
          - department name
        expr: AGENCY_NAME
        data_type: VARCHAR
      - name: SECRETARIAT_ID
        description: Executive office overseeing the agency
        synonyms:
          - secretariat
          - executive office
        expr: SECRETARIAT_ID
        data_type: VARCHAR
      - name: FISCAL_YEAR
        description: Fiscal year label (e.g., FY2026)
        synonyms:
          - fiscal year
          - FY
          - budget year
        expr: FISCAL_YEAR
        data_type: VARCHAR
      - name: BUDGET_RISK_LEVEL
        description: >
          Risk classification: Over Budget (>100% projected burn),
          At Risk (>90%), On Track (50-90%), Under-Utilized (<50%).
        synonyms:
          - risk level
          - risk category
          - budget status
        expr: BUDGET_RISK_LEVEL
        data_type: VARCHAR
    facts:
      - name: YTD_SPEND
        description: Year-to-date actual spending
        synonyms:
          - year to date
          - spent so far
          - actual YTD
        expr: YTD_SPEND
        data_type: "NUMBER(38,2)"
      - name: FORECASTED_REMAINING
        description: ML-forecasted remaining spending for the fiscal year
        synonyms:
          - forecasted spend
          - remaining forecast
          - projected remaining
        expr: FORECASTED_REMAINING
        data_type: "NUMBER(38,2)"
      - name: PROJECTED_YEAR_END
        description: Projected total spending at fiscal year end (YTD + forecast)
        synonyms:
          - projected total
          - year-end projection
          - projected spend
        expr: PROJECTED_YEAR_END
        data_type: "NUMBER(38,2)"
      - name: BUDGET_AUTHORITY
        description: Total budget authority for the fiscal year
        synonyms:
          - budget
          - authorized budget
          - appropriation
        expr: BUDGET_AUTHORITY
        data_type: "NUMBER(38,2)"
      - name: PROJECTED_SURPLUS_DEFICIT
        description: >
          Projected surplus (negative) or deficit (positive) at year end.
          Positive values mean the agency is projected to exceed budget.
        synonyms:
          - surplus deficit
          - budget gap
          - over under
        expr: PROJECTED_SURPLUS_DEFICIT
        data_type: "NUMBER(38,2)"
      - name: PROJECTED_BURN_RATE_PCT
        description: Projected year-end burn rate as percentage of budget authority
        synonyms:
          - burn rate
          - utilization rate
          - spend rate
        expr: PROJECTED_BURN_RATE_PCT
        data_type: "NUMBER(10,2)"
    metrics:
      - name: TOTAL_PROJECTED_SPEND
        description: Sum of projected year-end spending across all agencies
        expr: SUM(budget_risk.projected_year_end)
      - name: AGENCIES_OVER_BUDGET
        description: Count of agencies projected to exceed budget
        expr: COUNT_IF(budget_risk.budget_risk_level = 'Over Budget')

  # ===========================================================================
  # TABLE 7: Procurement Outliers
  # ===========================================================================
  - name: PROCUREMENT_OUTLIERS
    description: >
      Procurement award outlier analysis using statistical z-scores and
      Herfindahl-Hirschman Index (HHI) for vendor concentration. Flags
      unusually large awards within their category and identifies agencies
      with concentrated vendor spending patterns.
    synonyms:
      - procurement outliers
      - award outliers
      - unusual awards
      - vendor concentration
      - procurement anomalies
      - large awards
    base_table:
      database: FEDERAL_FINANCIAL_DATA
      schema: EOTSS_STAGING
      table: V_PROCUREMENT_OUTLIERS
    primary_key:
      columns:
        - AWARD_ID
    dimensions:
      - name: AWARD_ID
        description: Unique award identifier
        expr: AWARD_ID
        data_type: VARCHAR
      - name: VENDOR_NAME
        description: Name of the awarded vendor
        synonyms:
          - vendor
          - contractor
          - supplier
        expr: VENDOR_NAME
        data_type: VARCHAR
      - name: AGENCY_CODE
        description: Agency that issued the procurement
        synonyms:
          - agency
          - buying agency
        expr: AGENCY_CODE
        data_type: VARCHAR
      - name: CATEGORY
        description: Procurement category or commodity type
        synonyms:
          - type
          - commodity
          - service category
        expr: CATEGORY
        data_type: VARCHAR
      - name: AWARD_DATE
        description: Date the award was made
        synonyms:
          - date awarded
          - procurement date
        expr: AWARD_DATE
        data_type: DATE
      - name: IS_OUTLIER
        description: Whether this award is a statistical outlier (z-score > 2.0)
        synonyms:
          - outlier flag
          - is flagged
          - flagged
        expr: IS_OUTLIER
        data_type: BOOLEAN
      - name: CONCENTRATION_LEVEL
        description: >
          Agency vendor concentration: High (HHI>2500), Moderate (1500-2500),
          Competitive (<1500). Based on Herfindahl-Hirschman Index.
        synonyms:
          - concentration
          - vendor diversity
          - competition level
        expr: CONCENTRATION_LEVEL
        data_type: VARCHAR
    facts:
      - name: AWARD_AMOUNT
        description: Dollar value of the procurement award
        synonyms:
          - contract value
          - award value
          - amount
        expr: AWARD_AMOUNT
        data_type: "NUMBER(38,2)"
      - name: Z_SCORE
        description: >
          Statistical z-score measuring how many standard deviations
          the award is from its category average. Above 2.0 is an outlier.
        synonyms:
          - z score
          - standard score
          - deviation score
        expr: Z_SCORE
        data_type: "NUMBER(10,4)"
      - name: CATEGORY_AVG
        description: Average award amount for this procurement category
        synonyms:
          - category average
          - average award
        expr: CATEGORY_AVG
        data_type: "NUMBER(38,2)"
      - name: AGENCY_HHI
        description: >
          Herfindahl-Hirschman Index for the agency's vendor distribution.
          Higher values indicate more concentrated (less competitive) spending.
        synonyms:
          - HHI
          - concentration index
          - herfindahl index
        expr: AGENCY_HHI
        data_type: "NUMBER(10,2)"
    metrics:
      - name: OUTLIER_COUNT
        description: Count of outlier awards (z-score > 2.0)
        expr: COUNT_IF(procurement_outliers.is_outlier = TRUE)
      - name: TOTAL_OUTLIER_VALUE
        description: Total dollar value of outlier awards
        expr: SUM(IFF(procurement_outliers.is_outlier = TRUE, procurement_outliers.award_amount, 0))

  # ===========================================================================
  # TABLE 8: Cloud Spending (Multi-Provider)
  # ===========================================================================
  - name: CLOUD_SPENDING
    description: >
      Multi-cloud billing data aggregated monthly by provider, agency, and cost
      category. Covers AWS, Azure, and GCP. Includes on-demand vs reserved/spot
      cost breakdown, budget utilization, savings coverage, and month-over-month
      trends. Use to analyze cloud cost efficiency and identify optimization
      opportunities across Commonwealth agencies.
    synonyms:
      - cloud spending
      - cloud costs
      - cloud billing
      - AWS costs
      - Azure costs
      - GCP costs
      - cloud budget
      - infrastructure costs
    base_table:
      database: FEDERAL_FINANCIAL_DATA
      schema: EOTSS_STAGING
      table: V_CLOUD_SPENDING
    primary_key:
      columns:
        - RECORD_ID
    dimensions:
      - name: RECORD_ID
        description: Unique identifier for the cloud spending record
        expr: RECORD_ID
        data_type: NUMBER
      - name: CLOUD_PROVIDER
        description: Cloud provider (aws, azure, gcp)
        synonyms:
          - provider
          - cloud vendor
          - CSP
        expr: CLOUD_PROVIDER
        data_type: VARCHAR
      - name: AGENCY_CODE
        description: Agency responsible for the cloud account
        synonyms:
          - agency
          - department
        expr: AGENCY_CODE
        data_type: VARCHAR
      - name: AGENCY_NAME
        description: Full name of the agency
        synonyms:
          - agency name
          - department name
        expr: AGENCY_NAME
        data_type: VARCHAR
      - name: SECRETARIAT_ID
        description: Executive office overseeing the agency
        synonyms:
          - secretariat
          - executive office
        expr: SECRETARIAT_ID
        data_type: VARCHAR
      - name: COST_CATEGORY
        description: >
          Standardized cost category: Compute, Storage, Database, Network,
          AI/ML, Security, Other.
        synonyms:
          - service category
          - cost type
          - service type
        expr: COST_CATEGORY
        data_type: VARCHAR
      - name: FISCAL_PERIOD_DATE
        description: First day of the billing month
        synonyms:
          - month
          - billing period
          - date
        expr: FISCAL_PERIOD_DATE
        data_type: DATE
      - name: FISCAL_YEAR_LABEL
        description: Massachusetts fiscal year label (FY2025, FY2026)
        synonyms:
          - fiscal year
          - FY
        expr: FISCAL_YEAR_LABEL
        data_type: VARCHAR
      - name: ENVIRONMENT
        description: Deployment environment (production, staging, dev, sandbox)
        synonyms:
          - env
          - deployment environment
        expr: ENVIRONMENT
        data_type: VARCHAR
    facts:
      - name: TOTAL_COST
        description: Total cloud cost for the period (unblended for AWS, direct for Azure/GCP)
        synonyms:
          - cloud cost
          - total spend
          - cloud spend
        expr: TOTAL_COST
        data_type: "NUMBER(18,2)"
      - name: ONDEMAND_COST
        description: Cost from on-demand (pay-as-you-go) usage
        synonyms:
          - on demand
          - pay as you go
        expr: ONDEMAND_COST
        data_type: "NUMBER(18,2)"
      - name: RESERVED_COST
        description: Cost from reserved instances or savings plans
        synonyms:
          - reserved
          - savings plan cost
          - RI cost
        expr: RESERVED_COST
        data_type: "NUMBER(18,2)"
      - name: SPOT_COST
        description: Cost from spot/preemptible instances
        synonyms:
          - spot
          - preemptible
        expr: SPOT_COST
        data_type: "NUMBER(18,2)"
      - name: USAGE_HOURS
        description: Total compute usage hours
        synonyms:
          - compute hours
          - runtime hours
        expr: USAGE_HOURS
        data_type: "NUMBER(18,2)"
      - name: SERVICE_COUNT
        description: Number of distinct cloud services used
        expr: SERVICE_COUNT
        data_type: NUMBER
      - name: RESOURCE_COUNT
        description: Number of distinct resources provisioned
        expr: RESOURCE_COUNT
        data_type: NUMBER
      - name: BUDGET_UTILIZATION_PCT
        description: Percentage of monthly budget consumed
        synonyms:
          - budget utilization
          - budget usage
        expr: BUDGET_UTILIZATION_PCT
        data_type: "NUMBER(10,2)"
      - name: SAVINGS_PLAN_COVERAGE_PCT
        description: >
          Percentage of total cost covered by reserved/spot pricing.
          Higher is better — indicates cost optimization.
        synonyms:
          - savings coverage
          - RI coverage
          - discount coverage
        expr: SAVINGS_PLAN_COVERAGE_PCT
        data_type: "NUMBER(10,2)"
      - name: COST_PER_HOUR
        description: Average cost per compute hour
        synonyms:
          - unit cost
          - hourly cost
        expr: COST_PER_HOUR
        data_type: "NUMBER(18,4)"
      - name: MOM_CHANGE_PCT
        description: Month-over-month cost change percentage
        synonyms:
          - monthly change
          - cost trend
          - month over month
        expr: MOM_CHANGE_PCT
        data_type: "NUMBER(10,2)"
    metrics:
      - name: TOTAL_CLOUD_SPEND
        description: Sum of all cloud spending across providers
        expr: SUM(cloud_spending.total_cost)
      - name: TOTAL_ONDEMAND
        description: Sum of all on-demand cloud spending
        expr: SUM(cloud_spending.ondemand_cost)
      - name: TOTAL_RESERVED
        description: Sum of all reserved/savings plan spending
        expr: SUM(cloud_spending.reserved_cost)
      - name: AVG_SAVINGS_COVERAGE
        description: Average savings plan coverage across agencies
        expr: AVG(cloud_spending.savings_plan_coverage_pct)
      - name: PROVIDER_COUNT
        description: Count of distinct cloud providers with spending
        expr: COUNT(DISTINCT cloud_spending.cloud_provider)

# =============================================================================
# RELATIONSHIPS
# NOTE: Relationships removed — Snowflake semantic views only support
# many_to_one where the join column is the primary/unique key of the
# referenced table. Since AGENCY_CODE is not a PK in any of these tables,
# cross-table joins must be done manually in user queries.
# =============================================================================

# =============================================================================
# VERIFIED QUERIES
# Pre-validated SQL for common Intelligence UI questions.
# Improves Cortex Analyst accuracy for these patterns.
# =============================================================================
verified_queries:
  # -- Spending scenario queries --
  - name: spending_by_secretariat
    question: "What is total spending by secretariat for FY2026?"
    use_as_onboarding_question: true
    sql: |
      SELECT SECRETARIAT_ID,
             COUNT(DISTINCT AGENCY_CODE) AS agency_count,
             SUM(TOTAL_OBLIGATIONS) AS total_obligations,
             SUM(TOTAL_EXPENDITURES) AS total_expenditures,
             ROUND(SUM(TOTAL_EXPENDITURES) / NULLIF(SUM(BUDGET_AUTHORITY), 0) * 100, 2) AS burn_rate
      FROM EOTSS_STAGING.V_CIW_SPENDING
      WHERE FISCAL_YEAR_LABEL = 'FY2026'
      GROUP BY SECRETARIAT_ID
      ORDER BY total_expenditures DESC
    verified_by: "PRISM Intelligence UI"
    verified_at: 1740000000

  - name: monthly_spending_trend
    question: "Show me monthly spending trend for a specific agency"
    sql: |
      SELECT FISCAL_PERIOD_DATE, AGENCY_CODE, AGENCY_NAME,
             SUM(TOTAL_OBLIGATIONS) AS total_obligations,
             SUM(TOTAL_EXPENDITURES) AS total_expenditures,
             SUM(BUDGET_AUTHORITY) AS budget_authority,
             ROUND(SUM(TOTAL_EXPENDITURES) / NULLIF(SUM(BUDGET_AUTHORITY), 0) * 100, 2) AS burn_rate_pct
      FROM EOTSS_STAGING.V_CIW_SPENDING
      WHERE FISCAL_YEAR_LABEL = 'FY2026'
      GROUP BY FISCAL_PERIOD_DATE, AGENCY_CODE, AGENCY_NAME
      ORDER BY FISCAL_PERIOD_DATE
    verified_by: "PRISM Intelligence UI"
    verified_at: 1740000000

  - name: high_burn_rate_agencies
    question: "Show agencies with burn rate above 90%"
    use_as_onboarding_question: true
    sql: |
      SELECT AGENCY_CODE, AGENCY_NAME, FUND_NAME,
             FISCAL_PERIOD_DATE, BURN_RATE_PCT,
             TOTAL_EXPENDITURES, BUDGET_AUTHORITY
      FROM EOTSS_STAGING.V_CIW_SPENDING
      WHERE BURN_RATE_PCT > 90
      ORDER BY BURN_RATE_PCT DESC
      LIMIT 20
    verified_by: "PRISM Intelligence UI"
    verified_at: 1740000000

  # -- Anomaly scenario queries --
  - name: active_anomalies
    question: "Which agencies have spending anomalies?"
    use_as_onboarding_question: true
    sql: |
      SELECT AGENCY_CODE, AGENCY_NAME, FISCAL_PERIOD_DATE,
             ACTUAL_SPEND, EXPECTED_SPEND, ANOMALY_SEVERITY,
             SPEND_DEVIATION_PCT
      FROM EOTSS_STAGING.V_SPEND_ANOMALIES
      WHERE IS_ANOMALY = TRUE
      ORDER BY DISTANCE DESC
    verified_by: "PRISM Intelligence UI"
    verified_at: 1740000000

  - name: over_budget_agencies
    question: "Which agencies are over budget?"
    use_as_onboarding_question: true
    sql: |
      SELECT AGENCY_CODE, AGENCY_NAME, BUDGET_RISK_LEVEL,
             YTD_SPEND, FORECASTED_REMAINING, PROJECTED_YEAR_END,
             BUDGET_AUTHORITY, PROJECTED_BURN_RATE_PCT
      FROM EOTSS_STAGING.V_BUDGET_RISK
      WHERE BUDGET_RISK_LEVEL IN ('Over Budget', 'At Risk')
      ORDER BY PROJECTED_BURN_RATE_PCT DESC
    verified_by: "PRISM Intelligence UI"
    verified_at: 1740000000

  # -- Forecast scenario queries --
  - name: projected_yearend_spend
    question: "What is the projected year-end spend by agency?"
    sql: |
      SELECT AGENCY_CODE, AGENCY_NAME, BUDGET_RISK_LEVEL,
             YTD_SPEND, FORECASTED_REMAINING, PROJECTED_YEAR_END,
             BUDGET_AUTHORITY, PROJECTED_BURN_RATE_PCT
      FROM EOTSS_STAGING.V_BUDGET_RISK
      ORDER BY PROJECTED_BURN_RATE_PCT DESC
    verified_by: "PRISM Intelligence UI"
    verified_at: 1740000000

  # -- Cross-source scenario queries --
  - name: total_cost_with_salaries
    question: "What is the total cost per agency including salaries?"
    sql: |
      SELECT s.AGENCY_CODE, s.AGENCY_NAME,
             SUM(s.TOTAL_EXPENDITURES) AS operational_spending,
             w.total_salary,
             SUM(s.TOTAL_EXPENDITURES) + COALESCE(w.total_salary, 0) AS total_cost,
             w.total_positions, w.total_filled, w.avg_vacancy_rate
      FROM EOTSS_STAGING.V_CIW_SPENDING s
      LEFT JOIN (
          SELECT AGENCY_CODE,
                 SUM(SALARY_OBLIGATIONS) AS total_salary,
                 SUM(POSITION_COUNT) AS total_positions,
                 SUM(FILLED_POSITIONS) AS total_filled,
                 AVG(VACANCY_RATE) AS avg_vacancy_rate
          FROM EOTSS_STAGING.V_CTHR_WORKFORCE
          GROUP BY AGENCY_CODE
      ) w ON s.AGENCY_CODE = w.AGENCY_CODE
      WHERE s.FISCAL_YEAR_LABEL = 'FY2026'
      GROUP BY s.AGENCY_CODE, s.AGENCY_NAME, w.total_salary,
               w.total_positions, w.total_filled, w.avg_vacancy_rate
      ORDER BY total_cost DESC
    verified_by: "PRISM Intelligence UI"
    verified_at: 1740000000

  - name: agency_cross_source_profile
    question: "Show me spending across all sources for a specific agency"
    sql: |
      SELECT 'Agency Profile' AS analysis_type,
          (SELECT SUM(TOTAL_EXPENDITURES) FROM EOTSS_STAGING.V_CIW_SPENDING
           WHERE FISCAL_YEAR_LABEL = 'FY2026') AS operational_spending,
          (SELECT SUM(SALARY_OBLIGATIONS) FROM EOTSS_STAGING.V_CTHR_WORKFORCE) AS salary_costs,
          (SELECT SUM(AWARD_AMOUNT) FROM EOTSS_STAGING.V_COMMBUYS_AWARDS) AS procurement_awards,
          (SELECT AVG(VACANCY_RATE) FROM EOTSS_STAGING.V_CTHR_WORKFORCE) AS avg_vacancy_rate,
          (SELECT COUNT(*) FROM EOTSS_STAGING.V_CIP_INVESTMENTS) AS active_projects
    verified_by: "PRISM Intelligence UI"
    verified_at: 1740000000

  # -- Anomaly precision/evaluation queries --
  - name: anomaly_model_accuracy
    question: "How accurate is the anomaly detection model?"
    sql: |
      SELECT * FROM EOTSS_STAGING.V_ANOMALY_PRECISION
    verified_by: "PRISM Intelligence UI"
    verified_at: 1740000000

  # -- Cloud cost scenario queries --
  - name: cloud_spend_by_provider
    question: "What is cloud spending by provider?"
    use_as_onboarding_question: true
    sql: |
      SELECT CLOUD_PROVIDER,
             SUM(TOTAL_COST) AS total_cost,
             SUM(ONDEMAND_COST) AS ondemand_cost,
             SUM(RESERVED_COST) AS reserved_cost,
             SUM(SPOT_COST) AS spot_cost,
             ROUND(AVG(SAVINGS_PLAN_COVERAGE_PCT), 2) AS avg_savings_coverage
      FROM EOTSS_STAGING.V_CLOUD_SPENDING
      GROUP BY CLOUD_PROVIDER
      ORDER BY total_cost DESC
    verified_by: "PRISM Intelligence UI"
    verified_at: 1740000000

  - name: cloud_cost_by_category
    question: "What are cloud costs by service category?"
    sql: |
      SELECT COST_CATEGORY,
             SUM(TOTAL_COST) AS total_cost,
             COUNT(DISTINCT AGENCY_CODE) AS agency_count,
             ROUND(AVG(MOM_CHANGE_PCT), 2) AS avg_mom_change
      FROM EOTSS_STAGING.V_CLOUD_SPENDING
      GROUP BY COST_CATEGORY
      ORDER BY total_cost DESC
    verified_by: "PRISM Intelligence UI"
    verified_at: 1740000000

  - name: cloud_cost_trend
    question: "Show me the monthly cloud cost trend"
    sql: |
      SELECT FISCAL_PERIOD_DATE, CLOUD_PROVIDER,
             SUM(TOTAL_COST) AS total_cost,
             SUM(ONDEMAND_COST) AS ondemand_cost,
             SUM(RESERVED_COST) AS reserved_cost
      FROM EOTSS_STAGING.V_CLOUD_SPENDING
      GROUP BY FISCAL_PERIOD_DATE, CLOUD_PROVIDER
      ORDER BY FISCAL_PERIOD_DATE, CLOUD_PROVIDER
    verified_by: "PRISM Intelligence UI"
    verified_at: 1740000000

  - name: outlier_awards
    question: "Which procurement awards are outliers?"
    sql: |
      SELECT AWARD_ID, VENDOR_NAME, AGENCY_CODE, CATEGORY,
             AWARD_DATE, AWARD_AMOUNT, Z_SCORE, IS_OUTLIER,
             CONCENTRATION_LEVEL
      FROM EOTSS_STAGING.V_PROCUREMENT_OUTLIERS
      WHERE IS_OUTLIER = TRUE
      ORDER BY Z_SCORE DESC
    verified_by: "PRISM Intelligence UI"
    verified_at: 1740000000
  $$
);

-- =============================================================================
-- Verification (run manually in Snowsight)
-- =============================================================================
-- SHOW SEMANTIC VIEWS IN SCHEMA FEDERAL_FINANCIAL_DATA.EOTSS_STAGING;
-- DESCRIBE SEMANTIC VIEW FEDERAL_FINANCIAL_DATA.EOTSS_STAGING.PRISM_EOTSS_FINOPS;
