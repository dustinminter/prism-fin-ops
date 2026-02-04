# Quality Gates

PM enforces quality gates before any work is marked "complete." Gates are non-optional when their trigger conditions are met.

## Gate Overview

| Gate | Agents | Trigger | Fail Policy |
|------|--------|---------|-------------|
| Security | Sec + Gov | Auth, PII, tenant isolation, compliance changes | Fail-closed: Critical/High = block |
| Cost | Snowball + Price | Cloud costs, ROMs, pricing, warehouse changes | Fail-closed: unquantified costs = block |
| Architecture | Arch | Major structural changes, new services, schema changes | Advisory: findings documented, PM decides |
| Proposal | Prop + Contract + Price | Solicitation responses before submission | Fail-closed: compliance gaps = block |

## Gate Process

```
Work Completed → PM Identifies Applicable Gates → Gate Agents Review
     ↓                                                    ↓
  Gate Report ← PM Synthesizes ← Agent Review Checklists
     ↓
  PASS → Work Released
  FAIL → Remediation Plan → Re-review
```

### Step 1: Gate Identification
PM determines which gates apply based on the work content:
- Changed auth/security? → Security Gate
- Affected Snowflake costs? → Cost Gate
- Modified architecture/schemas? → Architecture Gate
- Producing a proposal? → Proposal Gate

### Step 2: Agent Review
Each gate agent produces a review checklist:

| Field | Description |
|-------|-------------|
| Item | What was reviewed |
| Status | PASS / FAIL / WARN / N/A |
| Severity | Critical / High / Medium / Low |
| Finding | Description of the issue (if FAIL/WARN) |
| Remediation | Recommended fix |

### Step 3: Gate Report
PM synthesizes agent reviews into a Gate Report:
- Overall gate status: PASS or FAIL
- Findings summary by severity
- Remediation plan for FAIL items
- Decision points requiring human judgment

### Step 4: Resolution
- **PASS**: Work proceeds
- **FAIL (Critical/High)**: Work blocked until remediated and re-reviewed
- **FAIL (Medium/Low)**: PM documents findings, may proceed with risk acceptance from user

## Security Gate

### Agents: Sec + Gov

### When Required
- Any changes to authentication or authorization mechanisms
- Any handling of PII or sensitive data
- Tenant isolation changes in multi-tenant systems
- Compliance-affecting changes (FedRAMP, FISMA, NIST, SOC2, StateRAMP)
- External integrations or data sharing
- AI systems handling sensitive data

### Review Checklist
- [ ] Threat model updated (STRIDE)
- [ ] Auth/authz design reviewed
- [ ] PII identification and protection verified
- [ ] Data classification applied (Gov)
- [ ] Access policies enforced (Gov)
- [ ] Compliance requirements mapped and met
- [ ] Multi-tenancy isolation validated (if applicable)
- [ ] AI guardrails in place (if AI involved)

### Fail Criteria
- **Block (Critical):** Auth bypass, PII exposure, tenant isolation gap, compliance failure
- **Block (High):** Missing encryption, inadequate access controls, unclassified sensitive data
- **Warn (Medium):** Missing audit logging, incomplete compliance mapping
- **Note (Low):** Documentation gaps, minor policy alignment issues

## Cost Gate

### Agents: Snowball + Price

### When Required
- Snowflake warehouse size changes
- New SPCS deployments or container scaling
- Dynamic Table or materialization additions
- ROM development or pricing commitments
- Any change with monthly cost impact > $100

### Review Checklist
- [ ] Current cost baseline documented
- [ ] Cost impact quantified (monthly, annual)
- [ ] Alternatives considered with cost comparison
- [ ] Cost optimization recommendations provided
- [ ] ROM includes confidence range (low/target/high)
- [ ] Pricing aligns with rate card (Price)
- [ ] Budget authority confirmed

### Fail Criteria
- **Block:** Unquantified cost impact, ROM without confidence range, below-margin pricing
- **Warn:** Cost increase without optimization analysis, missing baseline

## Architecture Gate

### Agents: Arch

### When Required
- New services or microservices
- Schema changes affecting multiple consumers
- API contract changes (breaking or additive)
- Technology selection with lock-in implications
- Cross-project integration patterns

### Review Checklist
- [ ] ADR documented with context, decision, consequences
- [ ] Component diagram updated
- [ ] Integration contracts specified
- [ ] NFRs addressed (scalability, availability, performance)
- [ ] Backward compatibility assessed
- [ ] Alternative approaches considered

### Fail Criteria
- **Advisory:** Architecture Gate findings are documented but PM decides whether to block. Arch provides severity ratings and recommendations.

## Proposal Gate

### Agents: Prop + Contract + Price

### When Required
- Any solicitation response before submission
- ROM included in client-facing materials
- Teaming agreements before execution
- Past performance claims before inclusion

### Review Checklist
- [ ] Compliance matrix complete — every requirement addressed (Prop)
- [ ] SOW/terms reviewed and acceptable (Contract)
- [ ] FAR/DFARS compliance confirmed (Contract)
- [ ] Pricing validated and profitable (Price)
- [ ] ROM has confidence range (Price)
- [ ] Past performance verified (Prop)
- [ ] Win themes and discriminators articulated (Prop)
- [ ] Executive summary compelling (Prop)

### Fail Criteria
- **Block:** Compliance gap, unreviewed terms, unvalidated pricing, unverified past performance
- **Warn:** Weak win themes, missing discriminators, tight margin

## Running Gates via CLI

```
/review security <scope>
/review cost <scope>
/review architecture <scope>
/review proposal <scope>
/review all <scope>
```

PM orchestrates the gate review and produces the Gate Report.
