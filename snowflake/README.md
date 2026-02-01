# Snowflake Intelligence - EOTSS POC Deployment Guide

## Overview

This directory contains everything needed to deploy the **Snowflake Intelligence UI** (Cortex Analyst) for the EOTSS proof-of-concept. The semantic model teaches Snowflake Intelligence about Commonwealth financial data so budget directors can ask questions in plain English.

**POC Duration:** 6-8 weeks
**Agreement:** AGR-EOTSS-POC-001

## Architecture

```
Budget Director (plain English question)
        │
        ▼
┌──────────────────────────┐
│  Snowflake Intelligence  │  ← Cortex Analyst interprets using semantic model
│         UI               │
└──────────┬───────────────┘
           │ generates SQL
           ▼
┌──────────────────────────┐
│   EOTSS_STAGING views    │  ← Swap layer (sample data now, real data later)
│  V_CIW_SPENDING          │
│  V_CIP_INVESTMENTS       │
│  V_COMMBUYS_AWARDS       │
│  V_CTHR_WORKFORCE        │
└──────────┬───────────────┘
           │ reads from
           ▼
┌──────────────────────────┐
│   EOTSS_POC tables       │  ← Seeded sample data
│  CIW_SPENDING (~960 rows)│
│  CIP_INVESTMENTS (25)    │
│  COMMBUYS_AWARDS (50)    │
│  CTHR_WORKFORCE (40)     │
└──────────────────────────┘
```

## Seed + Swap Strategy

The staging views (`EOTSS_STAGING`) are the **swap layer**. The semantic model YAML references only these views. When real data arrives from CIW, CIP, Commbuys, or CTHR:

1. Update the view's `FROM` clause to point to the real source table
2. Adjust column mappings if needed
3. The semantic model YAML stays the same

Swap instructions are embedded as SQL comments in each view definition in `03-eotss-staging-views.sql`.

## Deployment Steps

### Prerequisites
- Snowflake account with `FEDERAL_FINANCIAL_DATA` database
- `GOVERNANCE` schema with `AGREEMENTS` and `AGREEMENT_CLAUSES` tables
- `SYSADMIN` or equivalent role for schema/table creation
- SnowSQL CLI (for YAML file upload)

### Step-by-step

```bash
# 1. Expand secretariats (adds ~30 agencies across 9 secretariats)
snowsql -f sql/01-eotss-secretariats.sql

# 2. Seed sample data (creates EOTSS_POC schema + 4 tables)
snowsql -f sql/02-eotss-sample-data.sql

# 3. Create staging views (creates EOTSS_STAGING schema + 4 views)
snowsql -f sql/03-eotss-staging-views.sql

# 4. Deploy Cortex AI models (FORECAST + ANOMALY_DETECTION)
snowsql -f sql/04-cortex-models.sql

# 5. Upload semantic model YAML and create semantic view
#    First, upload the YAML:
snowsql -q "PUT file://semantic-model.yaml @EOTSS_STAGING.SEMANTIC_MODEL_STAGE AUTO_COMPRESS=FALSE"
#    Then create the semantic view:
snowsql -f sql/05-deploy-semantic-model.sql

# 6. Insert POC governance agreement
snowsql -f sql/06-eotss-poc-dula.sql

# 7. Run validation queries (verify all 5 demo scenarios)
snowsql -f sql/07-validation-queries.sql
```

### Alternative: Run via Snowflake MCP

```
mcp__snowflake__run_snowflake_query  →  paste contents of each SQL file
mcp__snowflake__list_semantic_views  →  verify semantic view exists
```

## File Reference

| File | Purpose |
|------|---------|
| `semantic-model.yaml` | Cortex Analyst semantic model (the linchpin) |
| `sql/01-eotss-secretariats.sql` | Expand GOVERNANCE.SECRETARIAT_AGENCIES |
| `sql/02-eotss-sample-data.sql` | Seed EOTSS_POC schema with sample tables |
| `sql/03-eotss-staging-views.sql` | EOTSS_STAGING swap-layer views |
| `sql/04-cortex-models.sql` | FORECAST + ANOMALY_DETECTION model config |
| `sql/05-deploy-semantic-model.sql` | Upload YAML + create semantic view |
| `sql/06-eotss-poc-dula.sql` | POC governance agreement (DULA) |
| `sql/07-validation-queries.sql` | Test queries for 5 demo scenarios |

## Demo Scenarios

| # | Scenario | Sample Question |
|---|----------|----------------|
| 1 | Agency Spending Q&A | "What is total spending by secretariat for FY2026?" |
| 2 | Anomaly Investigation | "Which agencies have burn rate above 90%?" |
| 3 | Executive Narrative | "Summarize the EOTSS spending posture for FY2026" |
| 4 | Forecasting | "Forecast spending for the next 6 months" |
| 5 | Cross-Source Analysis | "What is total cost per agency including salaries?" |

## Semantic Model Summary

- **4 tables**: Spending, CIP Investments, Procurement Awards, Workforce Costs
- **~35 columns**: dimensions, time dimensions, measures with synonyms
- **4 relationships**: Cross-source joins via AGENCY_CODE
- **14 verified queries**: Known-answer pairs for demo reliability
- **Massachusetts terminology**: secretariat, encumbrances, appropriation, ULO, Commbuys

## What This Does NOT Include

- No changes to React frontend, Express/tRPC backend, SPCS, or Streamlit
- No real CIW/Commbuys/CTHR data (arrives from Archetype during POC Phase 1)
- No SSO/IdP integration (Phase 2)
- No cloud billing integration (Q2-Q4 2026)
