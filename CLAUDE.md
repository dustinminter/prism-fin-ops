# CLAUDE.md — PRISM FinOps Intelligence

## Repository
- **Repo**: `dustinminter/prism-fin-ops` (primary — ArchetypeCo upstream was deleted/inaccessible as of 2026-02-19)
- **Remote setup**: `origin` = dustinminter

## Stack
- React 19 + Vite 7 + Tailwind v4 (frontend), Express + tRPC (backend), Snowflake SDK
- Deployment: SPCS (Snowpark Container Services) — no Vercel, no external DB
- IaC: Terraform (`terraform/`, 7 modules), SQL scripts (`snowflake/sql/00a-20`)
- Transforms: dbt (`dbt_project/`)
- ETL: Python scripts (`etl/`), GitHub Actions (`.github/workflows/`)

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
- **ETL**: `python3 etl/load_cthru.py [--fy START END] [--truncate] [--budgets-only]`

## Gotchas
- 10 pre-existing test failures in useAuth-dependent tests (jsdom/localStorage issue) — not a regression
- All Snowflake config is env-var-only — no hardcoded account identifiers anywhere
- SQL scripts must run in Snowsight (Cortex ML, agents, tasks, DMFs blocked by MCP)
- SPCS deploy specs need `SYSTEM$GET_SERVICE_DNS_DOMAIN('APP')` output at deploy time for router DNS
- V_CIW_SPENDING reads from POC data (03-eotss-staging-views.sql) — NOT yet swapped to CTHRU
- V_CTHRU_SPENDING is the real-data view — getCTHRUSpending endpoint uses this

## Commands
- `pnpm dev` — start dev server (backend + frontend)
- `pnpm check` — TypeScript type checking
- `pnpm test` — run tests (expect 10 known failures)
- `pnpm build` — production build
- Credential scan: `grep -r "jnaqbvy\|kxc12813\|AHC45175\|MAIOS" .` — should return 0 results
