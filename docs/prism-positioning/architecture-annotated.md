# PRISM Architecture

## Annotated Reference Architecture for Technical Evaluation

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              PRISM INTELLIGENCE PLATFORM                                 │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                         EXECUTIVE DECISION SURFACE                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │   │
│  │  │  Portfolio   │  │   Agency     │  │   Anomaly    │  │  Snowflake           │ │   │
│  │  │  Dashboard   │  │  Deep Dive   │  │   Console    │  │  Intelligence Panel  │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                              │
│                                          ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                         GOVERNANCE & TRUST LAYER                                 │   │
│  │                                                                                  │   │
│  │   DRAFT ────────► INTERNAL ────────► CLIENT ────────► EXECUTIVE                 │   │
│  │     │                 │                 │                  │                     │   │
│  │   AI Generated    Analyst Review    Stakeholder OK    Leadership Ready          │   │
│  │   Unvalidated     Fact-Checked      Context Added     Audit Complete            │   │
│  │                                                                                  │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                              │
│                                          ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                         SNOWFLAKE CORTEX AI LAYER                                │   │
│  │                                                                                  │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐  │   │
│  │  │    FORECAST    │  │    ANOMALY     │  │    COMPLETE    │  │  INTELLIGENCE │  │   │
│  │  │                │  │   DETECTION    │  │    (LLM)       │  │   (Chat)      │  │   │
│  │  │  Time-series   │  │                │  │                │  │               │  │   │
│  │  │  predictions   │  │  Deviation     │  │  Narrative     │  │  Natural      │  │   │
│  │  │  with CI bands │  │  detection     │  │  generation    │  │  language Q&A │  │   │
│  │  └────────────────┘  └────────────────┘  └────────────────┘  └───────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                              │
│                                          ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                         ANALYTICS DATA LAYER                                     │   │
│  │                                                                                  │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐  │   │
│  │  │   MONTHLY      │  │   ANOMALIES    │  │   FORECAST     │  │  EXECUTIVE    │  │   │
│  │  │   SPENDING     │  │                │  │   RESULTS      │  │  NARRATIVES   │  │   │
│  │  └────────────────┘  └────────────────┘  └────────────────┘  └───────────────┘  │   │
│  │                                                                                  │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                     │   │
│  │  │  NOTIFICATION  │  │   AUDIT        │  │   TRUST        │                     │   │
│  │  │  LOG           │  │   TRAIL        │  │   STATE LOG    │                     │   │
│  │  └────────────────┘  └────────────────┘  └────────────────┘                     │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                          │                                              │
└──────────────────────────────────────────┼──────────────────────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              SIGNAL INGESTION LAYER                                      │
│                                                                                         │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────────────────┐│
│  │   FINANCIAL   │  │     CLOUD     │  │ MODERNIZATION │  │      OPERATIONAL          ││
│  │   SYSTEMS     │  │  CONSUMPTION  │  │   ARTIFACTS   │  │        DATA               ││
│  │               │  │               │  │               │  │                           ││
│  │  - ERP/SAP    │  │  - AWS CUR    │  │  - Jira/ADO   │  │  - ServiceNow             ││
│  │  - MMARS      │  │  - Azure Cost │  │  - Rally      │  │  - Splunk                 ││
│  │  - STARS      │  │  - GCP Billing│  │  - Confluence │  │  - AppDynamics            ││
│  │  - Treasury   │  │  - Snowflake  │  │  - Git repos  │  │  - CloudWatch             ││
│  └───────────────┘  └───────────────┘  └───────────────┘  └───────────────────────────┘│
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer Annotations

### 1. Signal Ingestion Layer

**Purpose**: Standardize and aggregate signals from heterogeneous source systems across agencies and vendors.

| Component | Function | Key Considerations |
|-----------|----------|-------------------|
| Financial Systems | Budget, obligations, expenditures, encumbrances | Align to fiscal year and appropriation structures |
| Cloud Consumption | Usage metrics, billing data, reserved capacity | Handle billing lag (30-60 days typical) |
| Modernization Artifacts | Delivery progress, velocity, scope changes | Normalize across different PM tools |
| Operational Data | Incidents, availability, performance | Correlate with spending and delivery signals |

**Technical Notes**:
- Snowflake Connectors and Snowpipe for automated ingestion
- Schema-on-read flexibility for varied source formats
- Data sharing for cross-agency signal federation

---

### 2. Analytics Data Layer

**Purpose**: Persist curated, governed analytical tables optimized for Cortex AI and reporting.

| Table | Purpose | Retention |
|-------|---------|-----------|
| MONTHLY_SPENDING | Aggregated financial metrics by agency/period | 7 years (audit) |
| ANOMALIES | Detected deviations with context and status | 3 years |
| FORECAST_RESULTS | Model outputs with confidence intervals | 2 years |
| EXECUTIVE_NARRATIVES | AI-generated and human-edited insights | 5 years |
| NOTIFICATION_LOG | Alert delivery and acknowledgment tracking | 1 year |
| AUDIT_TRAIL | All system actions with lineage | 7 years |

**Technical Notes**:
- Clustering on (AGENCY_CODE, FISCAL_PERIOD) for query performance
- Row-level security via Snowflake RBAC for agency isolation
- Time Travel enabled for point-in-time recovery

---

### 3. Snowflake Cortex AI Layer

**Purpose**: Apply machine learning and generative AI to produce forecasts, detect anomalies, and generate narratives.

| Cortex Function | Application in PRISM |
|-----------------|---------------------|
| **FORECAST** | Rolling consumption and spending predictions with 95% confidence bands |
| **ANOMALY_DETECTION** | Unsupervised detection of spending spikes, billing lag, usage drift |
| **COMPLETE** | Narrative generation using mistral-large or llama models |
| **Snowflake Intelligence** | Natural language Q&A over governed data assets |

**Technical Notes**:
- No data leaves Snowflake; all AI processing occurs within the secure perimeter
- Model selection configurable per use case (speed vs. quality tradeoff)
- Prompt engineering patterns defined in Archetype reference implementation

---

### 4. Governance and Trust Layer

**Purpose**: Ensure AI-generated insights are reviewed, validated, and appropriate for their intended audience.

| Trust State | Meaning | Allowed Actions |
|-------------|---------|-----------------|
| DRAFT | AI-generated, unvalidated | View by analysts only |
| INTERNAL | Fact-checked by analyst | Share within agency |
| CLIENT | Approved for stakeholder consumption | Include in reports |
| EXECUTIVE | Leadership-ready, audit-complete | Present to CIO/CFO |

**Technical Notes**:
- State transitions logged with timestamp, actor, and rationale
- Promotion requires explicit approval (no auto-promotion to EXECUTIVE)
- Demotion allowed with documented reason

---

### 5. Executive Decision Surface

**Purpose**: Deliver intelligence to decision-makers through purpose-built interfaces.

| Interface | Audience | Key Features |
|-----------|----------|--------------|
| Portfolio Dashboard | CIO, CFO, Budget Director | Enterprise-wide health, top risks, forecast summary |
| Agency Deep Dive | Agency CIO, Program Manager | Agency-specific trends, vendor analysis, risk indicators |
| Anomaly Console | Financial Analyst, Auditor | Active alerts, acknowledgment workflow, root cause |
| Intelligence Panel | All users | Embedded Snowflake Intelligence for contextual Q&A |

**Technical Notes**:
- React + tRPC frontend with real-time data refresh
- Responsive design for executive mobile access
- Export to PDF for board presentations and legislative briefings

---

## Deployment Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                     SNOWFLAKE ACCOUNT                           │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   COMPUTE_WH    │  │   CORTEX_WH     │  │   INGEST_WH     │ │
│  │   (Queries)     │  │   (AI/ML)       │  │   (Loading)     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              FEDERAL_FINANCIAL_DATA (Database)          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │ USASPENDING │  │  ANALYTICS  │  │  STAGING        │  │   │
│  │  │  (Source)   │  │  (Curated)  │  │  (Ingestion)    │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    RBAC Structure                        │   │
│  │  PRISM_ADMIN ──► PRISM_ANALYST ──► PRISM_VIEWER         │   │
│  │       │               │                  │               │   │
│  │   Full DDL      Read/Write Analytics   Read Only         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                            │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   PRISM Web     │  │   Edge API      │  │   Scheduled     │ │
│  │   (Vercel)      │  │   (Vercel)      │  │   Jobs (n8n)    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Security and Compliance

| Requirement | PRISM Approach |
|-------------|----------------|
| Data Residency | All data remains in Snowflake; no external AI calls |
| Access Control | Snowflake RBAC with row-level security by agency |
| Audit Logging | All queries, state changes, and exports logged |
| Encryption | AES-256 at rest, TLS 1.3 in transit |
| Compliance | Aligned to FedRAMP, SOC 2, state-specific requirements |

---

## Integration Patterns

### Inbound (Data Sources)
- **Batch**: Snowpipe, scheduled COPY INTO from cloud storage
- **Streaming**: Snowflake Connector for Kafka (real-time billing events)
- **Federation**: Snowflake Data Sharing for cross-agency signals

### Outbound (Consumers)
- **API**: tRPC endpoints for web application
- **Export**: Scheduled PDF/Excel generation for offline distribution
- **Alerts**: Webhook integration with Slack, Teams, email

---

## Archetype Reference Patterns

Archetype provides pre-built, validated patterns that accelerate PRISM deployment:

| Pattern | Description |
|---------|-------------|
| Signal Normalization | Canonical schemas for financial, cloud, and delivery data |
| Forecast Pipeline | Cortex FORECAST configuration with optimal parameters |
| Anomaly Classification | Severity thresholds and escalation rules |
| Narrative Templates | Prompt engineering for executive-quality output |
| Trust State Machine | State transition logic with audit requirements |

---

*This architecture is designed for enterprise-scale deployment across federated state or federal agencies, with security, governance, and auditability as first-class concerns.*
