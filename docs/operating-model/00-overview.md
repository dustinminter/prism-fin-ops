# MAIOS Delivery Organization — Operating Model

## What This Is

A governed, PM-led, multi-agent delivery organization for PRISM, ARIA, DQ Intelligence, and Archetype work. 18 specialized agents — 1 PM orchestrator + 17 domain specialists — collaborate to deliver platform builds, analytics, proposals, and AI features with built-in quality gates.

## Single Front Door: PM

**Every request goes through PM. No exceptions.**

PM is the only agent that receives direct user input. PM classifies the work, activates 2–4 specialist agents, enforces quality gates, and synthesizes outputs into a unified response.

```
User → PM → [Agent 1, Agent 2, Agent 3] → PM → User
                                              ↓
                                        Quality Gates
```

### How to Invoke PM

```
/pm <your request>
```

Or use the specialized commands:

| Command | Purpose |
|---------|---------|
| `/pm` | General work request routing |
| `/route <request>` | Explicit agent routing |
| `/codepack <feature>` | Implementation-ready tasks and diffs |
| `/review <gate> <scope>` | Run quality gates |
| `/execpack <topic>` | Executive-ready deck and narrative |

## Agent Roster (18 Total)

| # | ID | Name | Persona | File |
|---|-----|------|---------|------|
| 1 | pm | PM | Chief of Staff + Delivery Program Manager | `01-pm.md` |
| 2 | arch | Arch | Principal Enterprise Architect | `02-arch.md` |
| 3 | prod | Prod | Head of Product | `03-prod.md` |
| 4 | info | Info | Chief Information Architect | `04-info.md` |
| 5 | data | Data | Lead Data Engineer | `05-data.md` |
| 6 | metrics | Metrics | Analytics Architect | `06-metrics.md` |
| 7 | ux | UX | Lead UX Engineer | `07-ux.md` |
| 8 | ai | AI | Applied AI Lead | `08-ai.md` |
| 9 | snowball | Snowball | Snowflake Platform Authority | `09-snowball.md` |
| 10 | stream | Stream | Finance Systems Architect | `10-stream.md` |
| 11 | gov | Gov | Chief Data Governance Officer | `11-gov.md` |
| 12 | sec | Sec | CISO Advisor | `12-sec.md` |
| 13 | ops | Ops | Platform Reliability Engineer | `13-ops.md` |
| 14 | ba | BA | Senior Business Analyst | `14-ba.md` |
| 15 | prop | Prop | Capture + Proposal Director | `15-prop.md` |
| 16 | contract | Contract | Public Sector Contracts SME | `16-contract.md` |
| 17 | viz | Viz | Executive Communications Designer | `17-viz.md` |
| 18 | price | Price | Commercial Strategy Lead | `18-price.md` |

## Quality Gates

| Gate | Agents | Trigger |
|------|--------|---------|
| Security | Sec + Gov | Auth, PII, tenant isolation, compliance |
| Cost | Snowball + Price | Cloud costs, ROMs, pricing, warehouse changes |
| Architecture | Arch | Major structural changes, new services, schemas |
| Proposal | Prop + Contract + Price | Solicitation responses |

## Hard Rules

1. **Single front door**: Users interact ONLY with PM
2. **Scope discipline**: Agents stay in scope; out-of-scope work routes back to PM
3. **Default 2–4 agents**: Per task, unless PM explicitly overrides with rationale
4. **Fail-closed**: Security, contracts, pricing, multi-tenancy — escalate, don't decide
5. **Artifact-first**: Every activation produces concrete files
6. **Gate before done**: No work completes without applicable quality gates passing

## File Structure

```
.claude/
  agents/          # 18 agent system prompt files
  commands/        # 5 slash commands (pm, route, codepack, review, execpack)
  hooks/           # Automation hooks (quality gates, etc.)
maios/
  registry/        # agents.json + agents.yaml (machine-readable roster)
docs/
  operating-model/ # This documentation (00-04)
```

## Related Docs

- [01 — Invocation Patterns](01-invocation-patterns.md)
- [02 — Routing Rules](02-routing-rules.md)
- [03 — Quality Gates](03-quality-gates.md)
- [04 — Tooling Recommendations](04-tooling-recommendations.md)
