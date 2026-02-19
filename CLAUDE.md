# CLAUDE.md — PRISM FinOps Intelligence

## Repository
- **Repo**: `dustinminter/prism-fin-ops` (primary — ArchetypeCo upstream was deleted/inaccessible as of 2026-02-19)
- **Remote setup**: `origin` = dustinminter

## Stack
- React 19 + Vite 7 + Tailwind v4 (frontend), Express + tRPC (backend), Snowflake SDK
- Deployment: SPCS (Snowpark Container Services) — no Vercel, no external DB
- IaC: Terraform (`terraform/`, 7 modules), SQL scripts (`snowflake/sql/00a-21`)
- Transforms: dbt (`dbt_project/`)
- ETL: Snowpark Python stored procedures (automated via Tasks), manual scripts (`etl/`) deprecated

## Branches
- `main` — primary branch (includes production migration, multi-tenancy, CTHRU port, Intelligence UI redesign)
- Feature branches merged and deleted 2026-02-19: `feature/production-migration`, `feature/cthru-port`

## CTHRU Data Integration
- **Source**: Massachusetts Comptroller's CTHRU platform (Socrata API)
  - Spending: `pegc-naaa` (~47.5M rows, transaction-level)
  - Budget authority: `kv7m-35wn` (~44K rows, appropriation-level)
- **Snowflake objects** (all in tenant data schema):
  - `CTHRU_RAW`, `CTHRU_BUDGETS_RAW` — raw staging
  - `CTHRU_SECRETARIAT_MAP` (39 mappings), `CTHRU_FUND_MAP` (21 mappings)
  - `CTHRU_BUDGET_AUTHORITY` — dept/fund/FY aggregated budget
  - `CTHRU_SPENDING` — monthly dept/fund grain with budget join
  - `V_CTHRU_SPENDING` — parallel view (does NOT replace V_CIW_SPENDING)
- **API**: `getCTHRUSpending` — tenantProcedure, schema token `{{DATA_SCHEMA}}`, executeTenantQuery
- **ETL (deprecated)**: `python3 etl/load_cthru.py [--fy START END] [--truncate] [--budgets-only]` — manual backfill only
- **Automated ingestion**: 3 Snowpark procedures + Tasks (`21-automated-ingestion.sql`)
  - `INGEST_CTHRU_SPENDING_DAILY` — daily 4 AM ET, Socrata pegc-naaa
  - `INGEST_CTHRU_BUDGETS_WEEKLY` — weekly Sunday 3 AM ET, Socrata kv7m-35wn
  - `INGEST_USASPENDING_DAILY` — daily 5 AM ET, api.usaspending.gov
  - Monitoring: `V_INGESTION_STATUS`, `INGESTION_LOG`

## SPCS Deployment
- **Public endpoint**: `https://mrfn6t-jnaqbvy-kxc12813.snowflakecomputing.app`
- **DNS domain hash**: `pfka` (from `SYSTEM$GET_SERVICE_DNS_DOMAIN('PRISM_SPCS.APP')`)
- **Image tag**: `v2` (deployed 2026-02-19)
- **Services**: backend, frontend, router — all RUNNING on `PRISM_COMPUTE_POOL`

## Gotchas
- 10 pre-existing test failures in useAuth-dependent tests (jsdom/localStorage issue) — not a regression
- All Snowflake config is env-var-only — no hardcoded account identifiers anywhere
- SQL scripts must run in Snowsight (Cortex ML, agents, tasks, DMFs blocked by MCP)
- SPCS deploy specs use DNS hash `pfka` — recalculate if compute pool changes
- V_CIW_SPENDING reads from CTHRU_SPENDING (cutover completed 2026-02-19)
- V_CTHRU_SPENDING is the parallel view — getCTHRUSpending endpoint uses this
- DETECT_ANOMALIES requires V_ANOMALY_DETECTION (filtered to agencies with training data), NOT V_FORECAST_TRAINING
- `CREATE OR REPLACE SERVICE` is not supported — must DROP then CREATE

## Commands
- `pnpm dev` — start dev server (backend + frontend)
- `pnpm check` — TypeScript type checking
- `pnpm test` — run tests (expect 10 known failures)
- `pnpm build` — production build
- Credential scan: `grep -r "jnaqbvy\|kxc12813\|AHC45175\|MAIOS" .` — should return 0 results
