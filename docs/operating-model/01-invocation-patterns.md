# Invocation Patterns

## Primary Entry Point: `/pm`

All work requests flow through PM. The user describes what they need in natural language, and PM classifies, routes, and orchestrates.

```
/pm <natural language request>
```

### Examples

**Platform Build:**
```
/pm We need to add row-level security to the PRISM semantic views so each
    secretariat only sees their own spending data
```
PM activates: Snowball + Sec + Gov + Data

**Analytics Truth:**
```
/pm Define the canonical burn rate metric for PRISM — there are three different
    calculations floating around and we need one SSOT
```
PM activates: Metrics + Info + Snowball

**Proposal Pursuit:**
```
/pm New RFP dropped for EOTSS data analytics modernization. Need ROM, compliance
    matrix, and exec summary by Friday
```
PM activates: Prop + Contract + Price + Viz

**AI Feature:**
```
/pm The ARIA scoring agent is giving inconsistent GO/NO_GO decisions on similar
    opportunities. Diagnose and fix
```
PM activates: AI + Metrics + Sec

**Security Review:**
```
/pm We're adding a new API endpoint that accepts file uploads from external
    partners. Need a security review before implementation
```
PM activates: Sec + Arch + Gov

## Specialized Commands

### `/route <request>`

Explicit routing — PM skips classification and focuses on agent selection.

```
/route Diagnose why the PRISM Dynamic Tables are lagging behind by 2+ hours
```

### `/codepack <feature>`

PM produces implementation-ready output: task breakdown, file changes, SQL, deployment sequence, and test plan.

```
/codepack Add anomaly severity notifications to PRISM
```

### `/review <gate> <scope>`

Runs a specific quality gate against completed work.

```
/review security PRISM tenant isolation implementation
/review cost Snowflake warehouse resize recommendation
/review architecture New DQ Intelligence microservice
/review proposal EOTSS RFP response package
/review all PRISM Q2 release
```

### `/execpack <topic>`

Produces executive-ready deck outline, narrative, data visualizations, and talking points.

```
/execpack PRISM Q1 progress for EOTSS leadership
/execpack ARIA ROI analysis for Archetype exec team
```

## Direct Agent Interaction (Not Recommended)

While agents can technically be invoked directly, this bypasses PM routing, quality gates, and scope enforcement. Direct invocation should only be used for debugging or testing agent behavior.

## PM Response Envelope

Every PM response includes this standardized structure:

1. **Work Classification** — Type of work
2. **Agents Activated** — 2–4 specialists with rationale
3. **Plan** — Parallel and sequential steps
4. **Artifact Checklist** — Concrete deliverables from each agent
5. **Risks & Dependencies** — Blockers and assumptions
6. **Decision Points** — Items requiring human judgment
7. **Quality Gates Required** — Which gates apply
8. **Next Actions** — Immediate steps with owners
