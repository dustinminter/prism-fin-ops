# PRISM FinOps Intelligence — Project Context

> This file is authoritative when cwd matches this project's directory. Global CLAUDE.md is supplementary only.

## Overview

Government FinOps analytics platform. Deployed for Massachusetts EOTSS as a proof of concept. Detects spend anomalies, forecasts budgets, surfaces procurement outliers.
- **Repo**: `dustinminter/prism-fin-ops` | **Local**: `~/Projects/prism-fin-ops/`
- **Status**: Active, all phases (1-17) complete, 22 SQL scripts deployed

## Architecture

**Snowflake** (`FEDERAL_FINANCIAL_DATA.EOTSS_STAGING`):
- Semantic view: `PRISM_EOTSS_FINOPS` (8 tables: CIW, CIP, Commbuys, CTHR, 3 anomaly, cloud), queried by `PRISM_FINOPS_AGENT`
- Core views: `V_CIW_SPENDING`, `V_CIP_INVESTMENTS`, `V_COMMBUYS_AWARDS`, `V_CTHR_WORKFORCE`, `V_CTHRU_SPENDING` (real data, parallel)
- Anomaly: `V_SPEND_ANOMALIES`, `V_BUDGET_RISK`, `V_PROCUREMENT_OUTLIERS`
- Cortex ML: `EOTSS_SPENDING_ANOMALY` (anomaly detection), `EOTSS_SPENDING_FORECAST` (6-month forward)
- Results: `SPEND_ANOMALY_RESULTS` (70 rows), `BUDGET_FORECAST_RESULTS` (60 rows)

**App Stack**: React 19 + Express/tRPC + Snowflake SDK
- Single-page Intelligence interface at `/` (Snowflake Intelligence chat is the entire frontend)
- Frontend: `pages/Intelligence.tsx` + `pages/NotFound.tsx`; components in `components/intelligence/`
- Context: `contexts/IntelligenceContext.tsx`; data: `data/intelligenceData.ts` (5 scenario topics)
- Auth: 3-mode (dev stub, SPCS edge auth, JWT/OIDC via jose)
- Run: `npm run dev` (port 3000)

**Snowflake Features** (deployed):
- dbt project (`dbt_project/`): 7 staging models, 3 anomaly marts, `fiscal_year_params` macro, SCD2 snapshot
- Tasks (`sql/09-create-tasks.sql`): 5-task monthly retrain DAG (1st of month 3AM)
- Dynamic Tables (`sql/10-dynamic-tables.sql`): 5 DTs (CIW/CIP 1hr, anomaly DOWNSTREAM)
- Cortex Agent (`sql/11-cortex-agents.sql`): `PRISM_ANOMALY_INVESTIGATOR`
- CTHRU real data: `CTHRU_RAW` (5.66M rows), `V_CTHRU_SPENDING` (parallel, not replacing V_CIW_SPENDING)
- Cloud billing (`sql/22-cloud-billing.sql`): AWS/Azure/GCP, `V_CLOUD_SPENDING`
- Automated ingestion (`sql/21-automated-ingestion.sql`): CTHRU daily 4AM, budgets weekly Sun 3AM, USASpending daily 5AM

## Data Model

Schema: `FEDERAL_FINANCIAL_DATA.EOTSS_STAGING`

| Object | Notes |
|--------|-------|
| V_CIW_SPENDING | POC spending data (active, not yet replaced) |
| V_CTHRU_SPENDING | Real CTHRU data, parallel view |
| V_COMMBUYS_AWARDS | Procurement awards |
| V_CIP_INVESTMENTS | Capital investments |
| SPEND_ANOMALY_RESULTS | 70 rows: Cortex anomaly output |
| BUDGET_FORECAST_RESULTS | 60 rows: 6-month Cortex forecast |
| CTHRU_RAW | 5.66M rows: raw Socrata data |
| CLOUD_SPENDING | AWS/Azure/GCP billing consolidated |

Maps: `CTHRU_SECRETARIAT_MAP` (39 entries), `CTHRU_FUND_MAP` (21 entries)

## Workflows

- **Dev**: `npm run dev` (port 3000)
- **Deploy SQL**: `python3 ~/Desktop/maios/scripts/snow_deploy.py prism [file|range]`
- **Anomaly retrain**: `scratchpad/deploy_anomaly.py` (domain-specific, NOT snow_deploy)
- **CTHRU ETL**: `etl/load_cthru.py` (Socrata API → PUT+COPY pipeline)
- **Cloud billing rebuild**: `CALL EOTSS_STAGING.REBUILD_CLOUD_SPENDING()`
- **SPCS deploy**: keypair JWT auth (`~/.snowflake/keys/rsa_key.p8`)

## Key Decisions

- SPCS-only deployment (no Vercel, no external OAuth, no MySQL/Drizzle)
- Keypair JWT auth for CLI deploy (SSO can't complete from CLI)
- DETECT_ANOMALIES split: V_ANOMALY_TRAINING (17 months) + V_ANOMALY_DETECTION (7 months): evaluation timestamps must be AFTER training data
- V_CIW_SPENDING swap deferred: failed scope-risk rubric criterion 2 (no deterministic cutover control)
- Repo is independent: ArchetypeCo upstream deleted/inaccessible as of 2026-02-19

## Active Work

- CTHRU cutover from V_CIW_SPENDING deferred: needs future migration PR with deterministic cutover control
- SPCS container deployment pending production validation

## Constraints / Gotchas

- `CREATE CORTEX INTELLIGENCE` is not valid SQL: Intelligence UI auto-discovers semantic views
- SQL files numbered 00a-22 (22 files): deploy sequentially
- `snow_deploy.py prism` for MCP-blocked DDL only; does NOT replace `scratchpad/deploy_anomaly.py`
- Semantic view WHERE clauses via MCP don't resolve table-prefixed identifiers: use `run_snowflake_query` for filtered queries
- Procurement Outliers: pure SQL z-score (outlier >2.0s) + HHI vendor concentration index
