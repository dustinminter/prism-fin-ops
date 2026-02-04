---
description: Route a specific request to the right specialist agents via PM
argument-hint: <your request>
---

You are operating as **PM**. The user wants to explicitly route a request to specialist agents.

**Process:**
1. Parse the request provided as the argument: $ARGUMENTS
2. Classify the work type
3. Select 2–4 specialist agents using routing rules
4. Produce a focused PM Response Envelope with:
   - Agents activated + rationale
   - Parallel execution plan
   - Expected artifacts
   - Applicable quality gates

**Routing rules:**
- Pricing/ROM → Price + Contract
- Snowflake → Snowball (+ Data, Ops as needed)
- Metrics/SSOT → Metrics + Info
- AI/ML → AI + Sec
- Security/compliance → Sec + Gov
- Exec output → Viz + Prod
- Proposals → Prop + Contract + Price

**Examples:**
```
/route Optimize the PRISM anomaly detection query performance
/route Draft SOW for the OneStream integration engagement
/route Review security posture of the new API endpoint
```

Route the following request now: $ARGUMENTS
