# PRISM: Snowflake Co-Sell Narrative

## Joint Value Proposition for State Central IT Organizations

**Target Audience**: Snowflake Account Executives, Solution Engineers, and Partner Teams engaging with state CIOs, budget offices, and central IT organizations such as EOTSS (Massachusetts), DoIT (various states), and similar entities.

---

## Executive Summary

PRISM is an enterprise intelligence platform built natively on Snowflake that addresses a critical gap in state government modernization: the lack of real-time visibility into spending, consumption, and execution risk across federated agency environments.

For Snowflake, PRISM represents:
- **Platform expansion** into executive decision support and FinOps use cases
- **Cortex AI adoption** with production-grade forecasting, anomaly detection, and generative AI
- **Snowflake Intelligence integration** demonstrating the hybrid embedded + full workspace model
- **Multi-agency deployment** potential as states standardize on Snowflake for data modernization

---

## The State Government Opportunity

### Current State Pain Points

State central IT organizations like EOTSS face mounting pressure to modernize while maintaining fiscal accountability:

| Challenge | Impact | Current Workaround |
|-----------|--------|-------------------|
| **Fragmented visibility** | Cannot see spending or risk across 50+ agencies | Manual Excel consolidation, 60-90 day lag |
| **Surprise chargebacks** | Cloud bills arrive months after consumption | Reactive budget cuts, program disruption |
| **Modernization sprawl** | Multiple integrators, platforms, timelines | Inconsistent reporting, no enterprise view |
| **Legislative scrutiny** | Must justify IT investments with outcomes | Anecdotal evidence, cherry-picked metrics |
| **Audit exposure** | AI-generated insights lack governance | Avoid AI entirely or accept risk |

### Why This Matters Now

- **Cloud-first mandates** are accelerating consumption without corresponding visibility
- **Fiscal year-end pressure** creates urgency around unliquidated obligations
- **AI governance requirements** are emerging in state procurement frameworks
- **Snowflake investments** are maturing; customers seek higher-value use cases

---

## PRISM Value Proposition

### For the State CIO

> "PRISM gives me a single view of modernization health across all agencies, with early warning on budget risk and AI-generated narratives I can trust in front of the legislature."

### For the State CFO / Budget Director

> "I can see incurred-but-not-billed exposure before invoices post. No more surprise chargebacks wiping out operating budgets in Q4."

### For the Snowflake Account Team

> "PRISM drives consumption across Cortex AI functions, Snowflake Intelligence, and multi-warehouse compute. It positions Snowflake as the enterprise intelligence platform, not just the data platform."

---

## Technical Alignment with Snowflake

### Cortex AI Usage

| Function | PRISM Application | Consumption Pattern |
|----------|-------------------|---------------------|
| FORECAST | Rolling spending and consumption predictions | Daily model refresh, 6-month horizon |
| ANOMALY_DETECTION | Spending spikes, billing lag, usage drift | Continuous monitoring, hourly evaluation |
| COMPLETE | Executive narrative generation | On-demand, ~500 tokens per narrative |
| Snowflake Intelligence | Natural language Q&A over financial data | User-driven, embedded in every page |

### Compute Profile

| Warehouse | Purpose | Sizing |
|-----------|---------|--------|
| COMPUTE_WH | Interactive queries, dashboard refresh | Medium, auto-suspend |
| CORTEX_WH | AI/ML workloads | Large, burst capacity |
| INGEST_WH | Data loading, Snowpipe | X-Small, continuous |

### Data Volume Estimates (Typical State)

| Data Type | Volume | Growth Rate |
|-----------|--------|-------------|
| Financial transactions | 50-100M rows/year | 10-15% annually |
| Cloud billing records | 200-500M rows/year | 25-40% annually |
| Modernization artifacts | 10-20M rows/year | Varies by initiative |
| Aggregated analytics | 5-10M rows/year | Stable |

---

## Competitive Positioning

### vs. Traditional BI (Tableau, Power BI)

| Dimension | Traditional BI | PRISM on Snowflake |
|-----------|---------------|-------------------|
| Architecture | Extract to visualization layer | Query in place, no movement |
| AI/ML | Separate tools, data export required | Native Cortex AI, no data leaves |
| Governance | Report-level security | Row-level, role-based in Snowflake |
| Natural Language | Limited or bolt-on | Native Snowflake Intelligence |

**Talking Point**: "PRISM is not a dashboard replacement. It is an intelligence layer that makes existing Snowflake investments work harder for executive decision-making."

### vs. FinOps Point Solutions (CloudHealth, Apptio)

| Dimension | FinOps Tools | PRISM on Snowflake |
|-----------|--------------|-------------------|
| Scope | Cloud cost only | Financial + cloud + modernization + operational |
| AI | Rules-based alerts | ML forecasting, anomaly detection, generative AI |
| Data Ownership | Vendor-hosted | Customer-owned in Snowflake |
| Integration | API export required | Native Snowflake, data sharing ready |

**Talking Point**: "FinOps tools show you cloud spend. PRISM shows you total modernization exposure, including the financial, delivery, and operational signals that FinOps tools cannot see."

### vs. Custom Development

| Dimension | Custom Build | PRISM with Archetype |
|-----------|--------------|---------------------|
| Time to Value | 12-18 months | 8-12 weeks (pilot), 6 months (full) |
| Risk | Unproven patterns | Reference implementation, validated |
| Maintenance | Full team required | Managed patterns, upgradeable |
| AI Governance | Must design from scratch | Trust State model included |

**Talking Point**: "Archetype has already solved the hard problems: signal normalization, AI governance, executive-quality output. PRISM customers get production patterns, not prototypes."

---

## EOTSS-Specific Positioning

### Massachusetts Context

EOTSS (Executive Office of Technology Services and Security) serves as the central IT authority for the Commonwealth of Massachusetts, overseeing:
- 150+ state agencies and quasi-public authorities
- $2B+ annual IT spend (direct and federated)
- Major cloud modernization initiatives across AWS, Azure, and GCP
- Legislative oversight requiring transparency and measurable outcomes

### EOTSS Pain Points PRISM Addresses

1. **MassIT Chargeback Complexity**: Agencies receive consolidated bills with limited visibility into drivers. PRISM provides agency-level consumption attribution with forecast and anomaly context.

2. **Vendor Concentration Risk**: Large integrator contracts create dependency. PRISM is integrator-agnostic, providing oversight independent of delivery vendors.

3. **Fiscal Year-End Pressure**: Unliquidated obligations and use-it-or-lose-it dynamics create Q4 chaos. PRISM forecasts year-end position 90+ days in advance.

4. **Legislative Transparency**: IT investments face scrutiny. PRISM generates governed, auditable narratives that explain outcomes in plain language.

### Recommended Approach for EOTSS

| Phase | Scope | Timeline | Snowflake Components |
|-------|-------|----------|---------------------|
| **Discovery** | Map visibility gaps, identify priority signals | 2-3 weeks | Snowflake SE engagement |
| **Pilot** | Single secretariat (e.g., HHS, Public Safety) | 8-12 weeks | Cortex AI, Intelligence |
| **Expand** | Enterprise rollout, cross-agency federation | 6 months | Data Sharing, RBAC |
| **Optimize** | Advanced forecasting, legislative reporting | Ongoing | Full Cortex suite |

---

## Co-Sell Motion

### Snowflake Role

- **Account Executive**: Position PRISM as strategic use case; connect to executive sponsors
- **Solution Engineer**: Technical validation; Cortex AI configuration; architecture review
- **Partner Team**: Archetype enablement; reference customer introductions

### Archetype Role

- **Discovery**: Conduct visibility gap assessment; map signal inventory
- **Implementation**: Deploy PRISM using reference patterns; configure for state context
- **Enablement**: Train state analysts on Trust State workflow and Intelligence usage
- **Support**: Ongoing pattern updates; new signal integration

### Joint Activities

| Activity | Owner | Timing |
|----------|-------|--------|
| Executive briefing | Snowflake AE + Archetype | Initial engagement |
| Technical deep dive | Snowflake SE + Archetype | Post-briefing |
| Proof of value | Archetype (Snowflake support) | 4-6 weeks |
| Business case development | Joint | Pre-procurement |
| Reference call | Snowflake (customer success) | Decision stage |

---

## Objection Handling

### "We already have dashboards."

> "Dashboards describe what happened. PRISM predicts what will happen and explains why. The difference is between reviewing last quarter's budget report and knowing today that you will exceed budget in 60 days unless you act."

### "AI governance concerns us."

> "That is exactly why we built the Trust State model. Every AI-generated insight progresses through defined gates, from Draft to Executive, with human review at each stage. Nothing reaches leadership without explicit approval and full audit trail."

### "We are not ready for AI."

> "PRISM works without AI features enabled. Start with the unified visibility and financial intelligence. Add forecasting when ready. Add generative narratives when governance is in place. The platform grows with your maturity."

### "Budget is tight."

> "PRISM pays for itself by preventing a single surprise chargeback. A $500K cloud true-up discovered in Q4 versus Q2 is the difference between managed reallocation and emergency budget cuts. What did your last surprise bill cost?"

### "We have an existing FinOps tool."

> "Keep it. PRISM is not a FinOps replacement. It is the intelligence layer that connects cloud cost data to financial systems, modernization progress, and executive decision-making. Your FinOps tool becomes a signal source, not a silo."

---

## Success Metrics

| Metric | Baseline | PRISM Target |
|--------|----------|--------------|
| Time to detect budget risk | 60-90 days | < 7 days |
| Surprise chargeback frequency | Quarterly | Eliminated |
| Executive reporting cycle | Monthly manual | Weekly automated |
| Cross-agency visibility | None | Real-time |
| AI insight governance | Ad hoc | 100% Trust State tracked |

---

## Call to Action

### For Snowflake Account Teams

1. **Identify candidates**: State central IT organizations with Snowflake footprint and modernization pressure
2. **Position the briefing**: "Enterprise Intelligence for Modernization Oversight"
3. **Engage Archetype**: Joint discovery session to map visibility gaps
4. **Drive to pilot**: Scoped proof of value with clear success criteria

### For State IT Leaders

1. **Assess your visibility gap**: Can you answer "What is our total modernization exposure?" today?
2. **Inventory your signals**: What data sources exist but are not connected?
3. **Define success**: What would change if you had 90-day forward visibility?
4. **Request a briefing**: See PRISM in action with your context

---

**Archetype** | PRISM Reference Implementation Partner

*Transforming enterprise modernization from a collection of disconnected initiatives into a coordinated, measurable, and governable program of record.*

---

## Appendix: EOTSS Reference Links

- EOTSS Strategic Plan: mass.gov/eotss
- Commonwealth IT Consolidation: mass.gov/it-consolidation
- MassIT Services: mass.gov/massit

*Note: Specific contact strategies and account intelligence should be developed in coordination with the Snowflake Massachusetts public sector team.*
