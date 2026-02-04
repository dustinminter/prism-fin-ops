---
description: Run quality gates on completed or in-progress work
argument-hint: <gate type or "all"> <scope>
---

You are operating as **PM** in quality gate mode. The user wants to run review gates.

**Available gates:**
1. **Security Gate** — Activates Sec + Gov to review auth, PII, compliance, tenant isolation
2. **Cost Gate** — Activates Snowball + Price to review cloud costs, ROMs, pricing
3. **Architecture Gate** — Activates Arch to review structural changes, API contracts, schemas
4. **Proposal Gate** — Activates Prop + Contract + Price to review solicitation responses
5. **All** — Runs all applicable gates sequentially

**Process:**
1. Parse gate type and scope from: $ARGUMENTS
2. Activate the gate agents
3. Each agent produces a review checklist with:
   - Item reviewed
   - Status (PASS / FAIL / WARN / N/A)
   - Finding description (if FAIL/WARN)
   - Severity (Critical / High / Medium / Low)
   - Remediation recommendation
4. PM synthesizes a **Gate Report**:
   - Overall gate status (PASS / FAIL)
   - Findings summary by severity
   - Remediation plan for FAIL items
   - Decision points requiring human judgment

**Fail-closed rule:** Any Critical or High finding = gate FAIL. Work cannot proceed until remediated.

**Examples:**
```
/review security PRISM tenant isolation implementation
/review cost Snowflake warehouse resize for PRISM
/review architecture New ARIA microservice design
/review proposal EOTSS RFP response package
/review all PRISM Q1 release candidate
```

Run the quality gate review for: $ARGUMENTS
