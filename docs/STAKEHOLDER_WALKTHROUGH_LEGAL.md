# PRISM GA Walkthrough: Legal Review

**Duration:** 15 minutes
**Audience:** Legal / Compliance Lead
**Objective:** Confirm DULA enforcement is legally binding and auditable, sign Section 2 of GA Sign-Off Memo

---

## Slide 1: What We're Asking For (1 min)

**Request:** Sign off that PRISM's agreement enforcement meets legal and compliance requirements.

**What you're signing:**
- DULA-EOTSS-2024-001 is legally binding and correctly encoded
- Clause enforcement is deterministic and auditable
- AI governance controls meet state AI usage policy
- Audit trail is sufficient for legal discovery

**Evidence provided:** A4, A5

---

## Slide 2: Agreement Enforcement Model (3 min)

**Question you care about:** How do agreements become enforceable controls?

### The Pipeline
```
Executed DULA (Legal Document)
    ↓
GOVERNANCE.AGREEMENTS (Registry)
    ↓
GOVERNANCE.AGREEMENT_CLAUSES (Individual clauses with policy_json)
    ↓
GOVERNANCE.COMPILED_POLICIES (Machine-readable policy)
    ↓
Runtime Enforcement (Every request checked)
    ↓
POLICY_ENFORCEMENT_LOG (Every decision logged with citations)
```

### Key Principle
The `policy_json` attached to each clause is the **executable representation** of the legal text. When the system denies a request, it cites the specific clause that was violated.

---

## Slide 3: DULA-EOTSS-2024-001 Structure (4 min)

**Question you care about:** What did we encode and is it correct?

### Agreement Record (Evidence A4)
| Field | Value |
|-------|-------|
| Agreement ID | DULA-EOTSS-2024-001 |
| Title | EOTSS Enterprise Data Use and License Agreement |
| Type | DULA |
| Status | EXECUTED |
| Effective | 2024-01-01 |
| Expiration | 2027-01-01 |
| Executed By | CIO_OFFICE |

### Encoded Clauses

| Clause | Type | What It Controls |
|--------|------|------------------|
| 3.1 | PURPOSE_RESTRICTION | Allowed: operational analysis, budget planning, vendor evaluation, executive reporting. Prohibited: commercial resale, individual profiling. |
| 4.1 | DATA_DOMAIN | Allowed: IT spending, cloud costs, contracts, budget. Prohibited: personnel, procurement-sensitive, security incidents. |
| 5.1 | CROSS_AGENCY | Intra-secretariat aggregation OK. Line-item sharing requires DSA. Cross-secretariat prohibited. |
| 6.1 | AI_PROCESSING | AI allowed for trend/anomaly/narrative. Trust ceiling: CLIENT. EXECUTIVE requires HITL. |
| 7.1 | DATA_PROTECTION | PII prohibited. PHI prohibited. Detection and redaction required. |
| 8.1 | AUDIT | All access logged. 7-year retention. Quarterly audit rights. |

**Key point:** Each clause has both human-readable text AND machine-executable policy. The system enforces the policy; the text explains why.

---

## Slide 4: Enforcement in Action (4 min)

**Question you care about:** Does the system actually enforce the agreement?

### Scenario B: Cross-Agency Denial with Citation (Evidence A5)

**Request:** ITD Analyst asks to compare ITD spending to MassIT spending

**System Response:**
```
Decision: DENIED
Violated Clause: DULA-EOTSS-2024-001-C03 (Clause 5.1)
Reason: Cross-agency line-item data sharing requires explicit DSA per Clause 5.1
```

**What the clause says:**
> "Line-item or vendor-specific data sharing between agencies requires explicit data sharing agreement between agencies."

**What the system did:**
1. Detected cross-agency data request
2. Checked policy_json for Clause 5.1
3. Found `line_item_requires_dsa: true`
4. Blocked request
5. Logged decision with clause citation
6. Offered "Request Amendment" option in UI

**Key point:** The denial cites the specific clause. This is auditable and defensible.

---

## Slide 5: AI Governance Controls (3 min)

**Question you care about:** How is AI use constrained by the agreement?

### Clause 6.1 (AI_PROCESSING) Enforcement

**Encoded Policy:**
```json
{
  "ai_allowed": true,
  "allowed_ai_uses": ["TREND_ANALYSIS", "ANOMALY_DETECTION", "NARRATIVE_GENERATION"],
  "prohibited_ai_uses": ["MODEL_TRAINING", "AUTOMATED_DECISIONS"],
  "trust_state_ceiling": "CLIENT",
  "executive_requires_human_review": true,
  "labeling_required": true
}
```

### Scenario C: Human-in-the-Loop Gate (Evidence A5)

**Action:** Analyst attempts to promote AI-generated narrative to EXECUTIVE

**System Response:**
```
Decision: GATED
Gate Type: HUMAN_REVIEW
Required Approver: EOTSS_EXECUTIVE
```

**After Executive Approval:**
```
Decision: APPROVED
Approver: TEST_EOTSS_EXEC
```

**Key point:** AI content cannot reach executive distribution without human review. This is enforced by the system, not by policy manual.

---

## Slide 6: Audit Trail for Discovery (2 min)

**Question you care about:** Can we produce evidence if challenged?

### What Is Logged

Every governance decision includes:
- `user_id` - who made the request
- `agreement_id` - which agreement governed
- `policy_version` - which version of compiled policy
- `decision` - ALLOWED, DENIED, GATED, APPROVED
- `violated_clause` - if denied, which clause
- `denial_reason` - human-readable explanation
- `approver_id` - if approved, who approved
- `enforced_at` - timestamp

### Retention
Per Clause 8.1: **7 years minimum**

### Sample Log Entry (Denial)
```json
{
  "user_id": "TEST_ITD_ANALYST",
  "agreement_id": "DULA-EOTSS-2024-001",
  "policy_version": "1.0.0",
  "decision": "DENIED",
  "violated_clause": "DULA-EOTSS-2024-001-C03",
  "denial_reason": "Cross-agency line-item data sharing requires DSA per Clause 5.1",
  "enforced_at": "2026-01-19T04:11:58"
}
```

**Key point:** Full provenance. If someone asks "why was this denied?", we can answer with clause citations and timestamps.

---

## Slide 7: Summary and Ask (2 min)

### Enforcement Verified
| Check | Status |
|-------|--------|
| Agreement loaded and executable | ✓ |
| All 6 clauses encoded with policy_json | ✓ |
| Policy compiled and validated | ✓ |
| Denial cites specific clause | ✓ (Scenario B) |
| HITL enforced for AI content | ✓ (Scenario C) |
| Audit trail with clause citations | ✓ |

### Open Legal Concerns
**None.**

### Request
Please sign Section 2 of the GA Sign-Off Memo confirming:
- [ ] DULA-EOTSS-2024-001 is legally binding and correctly encoded
- [ ] Clause enforcement is deterministic and auditable
- [ ] AI governance controls meet state AI usage policy
- [ ] Audit trail is sufficient for legal discovery

---

## Appendix: Evidence File Locations

- `docs/evidence/A4_dula_policy_20260119.json`
- `docs/evidence/A5_proof_scenarios_20260119.json`

### Full Clause Text Available In
- `TRIANGLE_CLOSURE_RUNBOOK.md` Part 5
