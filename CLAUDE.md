# CLAUDE.md — PRISM FinOps Intelligence

## Repository
- **Upstream**: `ArchetypeCo/prism-fin-ops` (pull-only access for dustinminter)
- **Fork**: `dustinminter/prism-fin-ops` — push here, cross-fork PR to upstream
- **Remote setup**: `origin` = ArchetypeCo, `fork` = dustinminter

## Stack
- React 19 + Vite 7 + Tailwind v4 (frontend), Express + tRPC (backend), Snowflake SDK
- Deployment: SPCS (Snowpark Container Services) — no Vercel, no external DB
- IaC: Terraform (`terraform/`, 7 modules), SQL scripts (`snowflake/sql/00a-17`)
- Transforms: dbt (`dbt_project/`)
- ETL: Python scripts (`etl/`), GitHub Actions (`.github/workflows/`)

## Gotchas
- 18 pre-existing test failures in useAuth-dependent tests (jsdom/localStorage issue) — not a regression
- All Snowflake config is env-var-only — no hardcoded account identifiers anywhere
- SQL scripts must run in Snowsight (Cortex ML, agents, tasks, DMFs blocked by MCP)
- SPCS deploy specs need `SYSTEM$GET_SERVICE_DNS_DOMAIN('APP')` output at deploy time for router DNS

## Commands
- `pnpm dev` — start dev server (backend + frontend)
- `pnpm check` — TypeScript type checking
- `pnpm test` — run tests (expect 18 known failures)
- `pnpm build` — production build
- Credential scan: `grep -r "jnaqbvy\|kxc12813\|AHC45175\|MAIOS" .` — should return 0 results
