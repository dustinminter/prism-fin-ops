# Routing Rules

PM enforces these routing rules for every work request. Rules are cumulative — a request can trigger multiple mandatory inclusions.

## Mandatory Agent Inclusions

| Trigger | Required Agents | Rationale |
|---------|----------------|-----------|
| Pricing / ROM / milestones | Price + Contract | Financial commitments need commercial + legal review |
| SOW / procurement / terms | Contract | Contractual language needs procurement expertise |
| Snowflake cost / perf / security | Snowball | Platform-specific knowledge required |
| Metric definitions / SSOT | Metrics | Canonical definitions must go through Analytics Architect |
| AI agent / prompt / model behavior | AI + Sec | AI work needs governance review for PII/bias risks |
| Auth / tenant isolation / PII / compliance | Sec + Gov | Security-sensitive changes are fail-closed |
| Exec-facing output | Viz + Prod | Executive communications need design + product framing |

## Default Bundle Patterns

PM selects from these pre-defined bundles as starting points, then adds mandatory inclusions.

### Platform Build
**Agents:** Arch + Data + Ops (+ Snowball if Snowflake)

**Use when:** Building new services, infrastructure, data pipelines, or platform capabilities.

**Examples:**
- PRISM SPCS container deployment
- DQ Intelligence pipeline automation
- New data ingestion from USASpending API

### Analytics Truth
**Agents:** Metrics + Info (+ Snowball if Snowflake semantic views)

**Use when:** Defining metrics, building semantic layers, resolving conflicting KPIs, or establishing data dictionaries.

**Examples:**
- PRISM burn rate metric standardization
- ARIA pipeline success rate KPI
- Cross-project data dictionary alignment

### Proposal Pursuit
**Agents:** Prop + Contract + Price (+ Viz for slides/graphics)

**Use when:** Responding to solicitations, building ROMs, creating capture strategies, or packaging proposals.

**Examples:**
- EOTSS analytics RFP response
- ROM for OneStream integration engagement
- Teaming agreement for DQ accelerator bid

### AI Feature
**Agents:** AI + Metrics + Sec (+ Snowball if Cortex/Snowflake)

**Use when:** Building or modifying AI capabilities, prompt engineering, model evaluation, or RAG pipeline work.

**Examples:**
- ARIA scoring agent accuracy improvement
- PRISM Cortex Agent anomaly investigation
- DQ Intelligence exception explainer agent

## Agent Count Guidelines

- **Default:** 2–4 agents per task
- **Minimum:** 2 agents (ensures cross-domain review)
- **Maximum without override:** 4 agents
- **Override:** PM can activate 5+ agents with documented rationale

## Scope Enforcement

If an activated agent encounters work outside their scope:

1. Agent documents what they found and why it's out of scope
2. Agent recommends which specialist should handle it
3. Agent returns to PM with the recommendation
4. PM re-routes the work to the appropriate specialist
5. Agent does NOT attempt out-of-scope work

## Conflict Resolution

When specialists disagree:

1. PM collects both positions with supporting rationale
2. PM presents the disagreement transparently to the user
3. PM provides a recommendation with reasoning
4. User makes the final call
5. PM documents the decision for future reference
