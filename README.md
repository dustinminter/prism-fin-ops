# PRISM FinOps Intelligence

AI-powered financial operations intelligence platform for the Commonwealth of Massachusetts, built on Snowflake. Semantic model over 4 source systems, Cortex ML anomaly detection and forecasting, and natural language queries via Snowflake Intelligence UI.

## Architecture

```
                    Snowflake (FEDERAL_FINANCIAL_DATA)
                    ┌─────────────────────────────────┐
  Data Sources      │  EOTSS_POC    EOTSS_STAGING     │
  ┌──────────┐      │  (raw data)   (staging views)    │
  │ CTHRU    │─────►│       │            │             │
  │ CIP      │─────►│       ▼            ▼             │
  │ COMMBUYS │─────►│  Cortex ML    Semantic View      │
  │ CTHR     │─────►│  (anomaly +   (7 tables)         │
  └──────────┘      │   forecast)        │             │
                    │       │            ▼             │
                    │       ▼      Intelligence UI     │
                    │  ANALYTICS   (natural language)   │
                    │  GOVERNANCE  USASPENDING          │
                    └─────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   SPCS Container  │
                    │  ┌──────┐ ┌─────┐ │
                    │  │Router│→│Front│ │
                    │  │ :8080│ │:80  │ │
                    │  └──┬───┘ └─────┘ │
                    │     ▼             │
                    │  ┌──────┐         │
                    │  │Back  │         │
                    │  │:3000 │         │
                    │  └──────┘         │
                    └───────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 7, Tailwind v4, Radix UI |
| Backend | Express, tRPC, Snowflake SDK |
| Database | Snowflake (Enterprise) |
| AI/ML | Cortex FORECAST, ANOMALY_DETECTION, Cortex Agents |
| Analytics | Cortex Analyst (Semantic Views), Intelligence UI |
| IaC | Terraform (Snowflake-Labs/snowflake provider) |
| Transforms | dbt (staging, anomaly marts, snapshots) |
| Deployment | Snowpark Container Services (SPCS) |
| CI/CD | GitHub Actions |

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 10+
- Snowflake account (Enterprise edition, US region)
- SPCS enabled on account

### Local Development

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your Snowflake credentials

# Start development server (backend + frontend)
pnpm dev
```

The dev server starts Express/tRPC on the configured port with Vite HMR for the frontend.

### Environment Variables

See `.env.example` for the full list:

| Variable | Required | Description |
|----------|----------|-------------|
| `SNOWFLAKE_ACCOUNT` | Yes | Account identifier (org-account format) |
| `SNOWFLAKE_USER` | Yes | Service user |
| `SNOWFLAKE_PASSWORD` | Yes | Password |
| `SNOWFLAKE_WAREHOUSE` | No | Default: `PRISM_APP_WH` |
| `SNOWFLAKE_DATABASE` | No | Default: `FEDERAL_FINANCIAL_DATA` |
| `SNOWFLAKE_SCHEMA` | No | Default: `EOTSS_STAGING` |
| `SNOWFLAKE_ROLE` | No | Default: `PRISM_APP_ROLE` |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build client + server for production |
| `pnpm start` | Start production server |
| `pnpm check` | TypeScript type checking |
| `pnpm test` | Run tests |

## Snowflake Deployment

### Step 1: Infrastructure (Terraform)

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with Snowflake credentials

terraform init
terraform plan
terraform apply
```

Creates: database, 6 schemas, 3 roles, warehouse, SPCS infrastructure, stages, governance tags.

### Step 2: SQL Objects (Snowsight Console)

Run SQL scripts in order in Snowsight (Cortex objects can't be created via Terraform):

```
snowflake/sql/00a-analytics-tables.sql    # Analytics schema tables
snowflake/sql/00b-governance-ddl.sql      # Governance tables
snowflake/sql/00c-governance-procs.sql    # Stored procedures
snowflake/sql/01-eotss-secretariats.sql   # Reference data
snowflake/sql/02a-real-data-load.sql      # Load real CTHRU/CIP/COMMBUYS data
snowflake/sql/03-eotss-staging-views.sql  # Swap-layer staging views
snowflake/sql/04-cortex-models.sql        # Cortex ML models
snowflake/sql/05-deploy-semantic-model.sql # Semantic view
snowflake/sql/06-eotss-poc-dula.sql       # DULA agreement
snowflake/sql/07-validation-queries.sql   # Verification suite
snowflake/sql/08-anomaly-detection.sql    # 3-module anomaly layer
snowflake/sql/09-create-tasks.sql         # Monthly retrain pipeline
snowflake/sql/10-dynamic-tables.sql       # Auto-refreshing tables
snowflake/sql/11-cortex-agents.sql        # Anomaly investigator
snowflake/sql/12-evaluations.sql          # Model evaluation tracking
snowflake/sql/13-horizon.sql              # Governance tags & policies
snowflake/sql/14-data-quality.sql         # Data metric functions
snowflake/sql/15-data-sharing.sql         # Internal share
snowflake/sql/16-external-sharing.sql     # External share
snowflake/sql/17-clean-rooms.sql          # Cross-state benchmarking
```

### Step 3: dbt Transforms

```bash
cd dbt_project
dbt seed && dbt run && dbt test
```

### Step 4: SPCS Deployment

```bash
# Build and push Docker images
SNOWFLAKE_ACCOUNT=<account> ./spcs/scripts/build.sh build-push

# Deploy services (run in Snowsight)
# spcs/sql/01-infrastructure.sql
# spcs/sql/02-deploy-services.sql

# Verify
SHOW ENDPOINTS IN SERVICE PRISM_SPCS.APP.PRISM_ROUTER;
```

## Project Structure

```
prism-fin-ops/
├── client/src/          # React 19 + Vite 7 frontend (14 pages)
├── server/              # Express + tRPC backend (18 procedures)
├── shared/              # Shared TypeScript types
├── terraform/           # Snowflake IaC (databases, roles, SPCS, governance)
├── snowflake/           # SQL scripts, semantic model, native app, templates
│   ├── sql/             # Numbered deployment scripts (00a-17)
│   ├── native-app/      # Snowflake Native App package
│   └── templates/       # Reusable government FinOps starter
├── dbt_project/         # dbt staging models, anomaly marts, snapshots
├── spcs/                # SPCS Docker, specs, deploy scripts
├── data/                # Real Massachusetts data assets
│   ├── cthru/           # CTHRU spending (4,401 txns, $179M)
│   ├── cip/             # Capital Investment Plan agencies + line items
│   ├── commbuys/        # COMMBUYS bids + attachments
│   └── sources/         # Raw CSV files
├── etl/                 # Data acquisition scripts
├── .github/workflows/   # CI/CD (build, deploy, ETL, dbt)
├── docs/                # Demo scripts, architecture docs, stakeholder guides
└── .env.example         # Environment template
```

## Data Sources

| Source | Data | Rows | Coverage |
|--------|------|------|----------|
| CTHRU | State expenditures | 4,401 | FY23-FY26 |
| CIP | Capital investments | 16 agencies | FY26-FY30 |
| COMMBUYS | IT procurement bids | 5 bids | Current |
| CTHR | Workforce data | — | Not yet sourced |
| USASpending | Federal awards | — | Via ETL script |

## Anomaly Detection

Three modules analyze financial data for anomalies:

1. **Spend Anomalies** — Cortex ANOMALY_DETECTION model identifies statistical outliers (Critical >3σ, Warning >2σ, Minor >1σ)
2. **Budget Risk** — Cortex FORECAST projects remaining spend vs budget authority (Over Budget / At Risk / On Track / Under-Utilized)
3. **Procurement Outliers** — SQL z-score analysis + HHI vendor concentration index

## License

MIT
