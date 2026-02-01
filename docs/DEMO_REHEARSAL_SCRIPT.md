# PRISM FinOps Intelligence — EOTSS POC Demo Rehearsal Script

**Duration:** ~15 minutes
**Audience:** EOTSS CIO, Budget Directors, Secretariat Leadership
**Platform:** Snowflake Intelligence UI (natural language queries)
**Semantic Model:** `PRISM_EOTSS_FINOPS` (7 tables)

---

## Pre-Demo Setup Checklist

- [ ] Open Snowsight in browser, logged in as PRISM admin user
- [ ] Navigate to Intelligence > PRISM_EOTSS_FINOPS — confirm it loads
- [ ] Open a second browser tab with a SQL Worksheet (backup queries below)
- [ ] Verify recent data: run `SELECT COUNT(*) FROM EOTSS_STAGING.V_CIW_SPENDING` — expect 960
- [ ] Verify anomaly data: run `SELECT COUNT(*) FROM EOTSS_STAGING.SPEND_ANOMALY_RESULTS` — expect 70
- [ ] Verify forecast data: run `SELECT COUNT(*) FROM EOTSS_STAGING.BUDGET_FORECAST_RESULTS` — expect 60
- [ ] Close all other browser tabs to avoid accidental screen shares
- [ ] Have this script open on a separate device or second monitor

---

## Demo Flow: 5 Acts

### Act 1: The Problem (2 min)

**Talking points — do not type in Intelligence UI yet:**

> "Today, financial operations data across the Commonwealth is siloed in four
> separate systems: CIW for spending, CIP for capital investments, Commbuys
> for procurement, and CTHR for workforce. Budget directors spend hours
> manually pulling reports and cross-referencing spreadsheets."

> "What if you could just ask a question in plain English and get an
> immediate, governed answer — with full audit trail?"

**Transition:** "Let me show you what that looks like."

---

### Act 2: Agency Spending Q&A (3 min)

**Type in Intelligence UI:**

```
What is total spending by secretariat for FY2026?
```

**Expected result:** Table with 7 secretariats, total expenditures, and budget authority.

**Talking points:**
- "This query hit 960 rows of spending data across 10 agencies and 4 fund codes"
- "Notice it automatically grouped by secretariat — the model understands our org structure"
- "Every query generates SQL you can audit — click 'Show SQL' to see exactly what ran"

**Follow-up query:**

```
Show me monthly spending trend for MASSIT
```

**Expected:** Line/table showing 24 months of spending data for MassIT.

---

### Act 3: Anomaly Detection (4 min)

**Type in Intelligence UI:**

```
Which agencies have spending anomalies?
```

**Expected:** Table showing anomalies flagged by the ML model, with ITD and CYBER highlighted.

**Talking points:**
- "The system uses Cortex ML anomaly detection — trained on 17 months of baseline spending"
- "ITD had a significant spike in December 2025, flagged as Critical severity"
- "CYBER showed unusual spending in January 2026 — consistent with an incident response scenario"
- "Each anomaly shows a severity level: Critical (>3 standard deviations), Warning (>2), Minor (>1)"

**Follow-up:**

```
Which agencies are over budget?
```

**Expected:** Budget risk view showing agencies with projected burn rate above 100%.

**Talking points:**
- "This combines year-to-date actual spending with a 6-month ML forecast"
- "Agencies are classified: Over Budget, At Risk, On Track, or Under-Utilized"
- "This is forward-looking — not just what happened, but what's projected to happen"

---

### Act 4: Forecasting (3 min)

**Type in Intelligence UI:**

```
What is the projected year-end spend by agency?
```

**Expected:** Budget risk table with YTD spend, forecasted remaining, projected year-end, and risk level.

**Talking points:**
- "The forecast model was trained on 24 months of historical spending per agency"
- "It generates 6-month forward predictions with 95% confidence intervals"
- "Budget directors can see TODAY which agencies need attention before year-end"

**Follow-up:**

```
Show agencies with burn rate above 90%
```

**Expected:** 2+ agencies flagged (At Risk or Over Budget).

---

### Act 5: Cross-Source Intelligence (3 min)

**Type in Intelligence UI:**

```
What is the total cost per agency including salaries?
```

**Expected:** Cross-source join showing operational spending + workforce costs per agency.

**Talking points:**
- "This is the real power — a single question that joins across CIW spending and CTHR workforce data"
- "Previously this required manual extraction from two separate systems and a spreadsheet merge"
- "The semantic model knows how these data sources relate to each other"

**Final query (if time permits):**

```
Show me cybersecurity spending across all sources
```

**Expected:** CYBER agency data spanning spending, workforce, procurement, and CIP projects.

**Closing:**
> "Every one of these queries is governed by a Data Use License Agreement —
> agreement AGR-EOTSS-POC-001 — which specifies exactly what data can be
> queried, by whom, and for what purpose. The AI is constrained to operate
> within those boundaries."

---

## Governance Talking Points

Use these when asked about data governance:

1. **DULA Enforcement:** "Every query runs under agreement AGR-EOTSS-POC-001, which defines 5 clauses covering purpose limitation, data scope, AI use restrictions, cross-agency visibility, and retention."

2. **Trust State:** "AI-generated content starts in Draft state. It must be reviewed by a human before it can be promoted to Executive trust level or shared outside the POC team."

3. **Audit Trail:** "Every query, every AI prompt, and every output is logged. We can trace any insight back to its source data, the query that generated it, and the agreement that authorized it."

4. **No PII/PHI:** "The POC uses synthetic sample data. The DULA explicitly prohibits PII and PHI. When we move to production data, separate data sharing agreements will be executed per secretariat."

5. **AI Boundaries:** "The AI can analyze spending, detect anomalies, and generate forecasts. It cannot make budget decisions, evaluate personnel, or score vendors — those are explicitly prohibited in the agreement."

---

## FAQ — Anticipated Questions

**Q: When can we use real data?**
A: The staging views are a swap layer. When real CIW/CIP/Commbuys/CTHR data is available, we change the FROM clause in each view. The semantic model and all queries stay the same. A new data sharing agreement per secretariat is the only prerequisite.

**Q: Can other secretariats use this?**
A: Yes. Each new secretariat requires its own DULA. The technical infrastructure (semantic model, ML models, views) is designed to support multi-secretariat deployment. The POC proves the pattern with EOTSS.

**Q: What if the AI gives a wrong answer?**
A: The Intelligence UI generates SQL, not free-text opinions. You can always click "Show SQL" to see and verify the exact query. For executive-level outputs, human review is required before distribution. The semantic model uses synonyms and descriptions to guide the AI toward correct interpretations.

**Q: What does this cost?**
A: The POC runs on existing Snowflake infrastructure (COMPUTE_WH). Cortex ML models use serverless compute billed per-second. The semantic view and Intelligence UI are included features. Estimated incremental cost for the POC is minimal — dominated by ML model training (~2-3 credits per retrain).

**Q: How is this different from a BI dashboard?**
A: A dashboard shows pre-built charts for pre-defined questions. Intelligence UI lets you ask any question in natural language. You can combine data sources, drill down, and explore anomalies without waiting for a developer to build a new report.

---

## Backup Plan — Raw SQL Queries

If the Intelligence UI is unavailable or not generating correct SQL, run these directly in a SQL Worksheet:

### Scenario 1: Spending by Secretariat
```sql
SELECT SECRETARIAT_ID,
       COUNT(DISTINCT AGENCY_CODE) AS agency_count,
       SUM(TOTAL_OBLIGATIONS) AS total_obligations,
       SUM(TOTAL_EXPENDITURES) AS total_expenditures,
       SUM(BUDGET_AUTHORITY) AS total_budget,
       ROUND(SUM(TOTAL_EXPENDITURES) / NULLIF(SUM(BUDGET_AUTHORITY), 0) * 100, 2) AS burn_rate
FROM EOTSS_STAGING.V_CIW_SPENDING
WHERE FISCAL_YEAR_LABEL = 'FY2026'
GROUP BY SECRETARIAT_ID
ORDER BY total_expenditures DESC;
```

### Scenario 2: Spending Anomalies
```sql
SELECT AGENCY_CODE, AGENCY_NAME, FISCAL_PERIOD_DATE,
       ACTUAL_SPEND, EXPECTED_SPEND, ANOMALY_SEVERITY,
       SPEND_DEVIATION_PCT
FROM EOTSS_STAGING.V_SPEND_ANOMALIES
WHERE IS_ANOMALY = TRUE
ORDER BY DISTANCE DESC;
```

### Scenario 3: Budget Risk
```sql
SELECT AGENCY_CODE, AGENCY_NAME, BUDGET_RISK_LEVEL,
       YTD_SPEND, FORECASTED_REMAINING, PROJECTED_YEAR_END,
       BUDGET_AUTHORITY, PROJECTED_BURN_RATE_PCT
FROM EOTSS_STAGING.V_BUDGET_RISK
ORDER BY PROJECTED_BURN_RATE_PCT DESC;
```

### Scenario 4: Agencies Over 90% Burn Rate
```sql
SELECT AGENCY_CODE, AGENCY_NAME, FUND_NAME,
       FISCAL_PERIOD_DATE, BURN_RATE_PCT,
       TOTAL_EXPENDITURES, BUDGET_AUTHORITY
FROM EOTSS_STAGING.V_CIW_SPENDING
WHERE BURN_RATE_PCT > 90
ORDER BY BURN_RATE_PCT DESC
LIMIT 20;
```

### Scenario 5: Cross-Source Total Cost
```sql
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
GROUP BY s.AGENCY_CODE, s.AGENCY_NAME, w.total_salary, w.total_positions, w.total_filled, w.avg_vacancy_rate
ORDER BY total_cost DESC;
```

### Scenario 6: Cybersecurity Posture
```sql
SELECT 'Cybersecurity' AS domain,
    (SELECT SUM(TOTAL_EXPENDITURES) FROM EOTSS_STAGING.V_CIW_SPENDING
     WHERE AGENCY_CODE = 'CYBER' AND FISCAL_YEAR_LABEL = 'FY2026') AS operational_spending,
    (SELECT SUM(SALARY_OBLIGATIONS) FROM EOTSS_STAGING.V_CTHR_WORKFORCE
     WHERE AGENCY_CODE = 'CYBER') AS salary_costs,
    (SELECT SUM(AWARD_AMOUNT) FROM EOTSS_STAGING.V_COMMBUYS_AWARDS
     WHERE AGENCY_CODE = 'CYBER') AS procurement_awards,
    (SELECT AVG(VACANCY_RATE) FROM EOTSS_STAGING.V_CTHR_WORKFORCE
     WHERE AGENCY_CODE = 'CYBER') AS avg_vacancy_rate,
    (SELECT COUNT(*) FROM EOTSS_STAGING.V_CIP_INVESTMENTS
     WHERE AGENCY_CODE = 'CYBER') AS active_projects;
```

---

## Post-Demo Next Steps

If the demo goes well, present these as immediate next steps:

1. **Data swap:** Execute data sharing agreements for real CIW/CIP/Commbuys/CTHR data
2. **Expand scope:** Onboard additional secretariats (each requires its own DULA)
3. **Automation:** Enable monthly ML model retraining via Snowflake Tasks (already built, deferred from POC)
4. **Governance:** Deploy Horizon tags and row-access policies for multi-secretariat isolation
5. **Production:** Move from EOTSS_POC sample data to production data feeds
