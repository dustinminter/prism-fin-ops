# PRISM GA Walkthrough: Security Review

**Duration:** 15 minutes
**Audience:** Security Lead
**Objective:** Confirm no critical findings, sign Section 1 of GA Sign-Off Memo

---

## Slide 1: What We're Asking For (1 min)

**Request:** Sign off that PRISM meets security requirements for production deployment.

**What you're signing:**
- Identity controls are sufficient
- Data isolation is database-enforced
- Audit controls meet state requirements
- No critical or high findings are open

**Evidence provided:** A1, A2, A3, A6

---

## Slide 2: Identity Architecture (3 min)

**Question you care about:** Can every action be attributed to a known user?

### Implementation
```
IdP (SAML/OIDC)
    ↓ claims: sub, email, prism_agency_id, prism_secretariat_id, prism_role
PRISM Application
    ↓ resolves role deterministically
Snowflake Session
    ↓ assumes role, sets context
Query Execution
    ↓ tagged with user, role, agency
Audit Log
```

### Evidence (A2)
| Persona | IdP Claim | Resolved Role | Verified |
|---------|-----------|---------------|----------|
| EOTSS Executive | agency:EOTSS, role:EXEC | EOTSS_EXECUTIVE | ✓ |
| EOTSS Analyst | agency:EOTSS, role:ANALYST | EOTSS_FINOPS_ANALYST | ✓ |
| ITD Analyst | agency:ITD, role:ANALYST | AGENCY_ITD_ANALYST | ✓ |
| MassIT Analyst | agency:MASSIT, role:ANALYST | AGENCY_MASSIT_ANALYST | ✓ |
| DPH Analyst | agency:DPH, role:ANALYST | AGENCY_DPH_ANALYST | ✓ |

**Key point:** Role resolution is deterministic from claims. No manual role selection except admin break-glass.

---

## Slide 3: Data Isolation Architecture (4 min)

**Question you care about:** Can a user access data they shouldn't see?

### Implementation
- Row Access Policy at Snowflake layer (not application logic)
- Policy evaluates `CURRENT_ROLE()` against role-agency mapping
- Three scope levels: AGENCY (own only), SECRETARIAT (all agencies in secretariat), ALL (governance admin)

### Evidence (A3) - 7 Tests, 7 Passed

| Test | User | Expected | Actual | Result |
|------|------|----------|--------|--------|
| Agency isolation | ITD Analyst | ITD only | ITD only | ✓ |
| Agency isolation | MassIT Analyst | MASSIT only | MASSIT only | ✓ |
| Agency isolation | DPH Analyst | DPH only | DPH only | ✓ |
| Secretariat scope | EOTSS Analyst | EOTSS agencies | EOTSS agencies | ✓ |
| Secretariat scope | EOTSS Exec | EOTSS agencies | EOTSS agencies | ✓ |
| Cross-secretariat | EOTSS → HHS | 0 rows | 0 rows | ✓ |
| Admin access | Governance Admin | All | All | ✓ |

**Key point:** Isolation is enforced by Snowflake RLS, not by PRISM application code. Bypass requires Snowflake admin access.

---

## Slide 4: Audit and Logging (3 min)

**Question you care about:** Can we reconstruct who did what, when?

### Audit Layers

1. **Snowflake Native**
   - QUERY_HISTORY: All queries with user, role, timestamp
   - LOGIN_HISTORY: All authentication events
   - ACCESS_HISTORY: Object-level access tracking

2. **PRISM Governance**
   - SESSION_LOG: Session establishment with full context
   - POLICY_ENFORCEMENT_LOG: Every governance decision

### Evidence (A6)
```
POLICY_ENFORCEMENT_LOG sample:
┌─────────────────────┬─────────────┬──────────┬──────────────────────────┐
│ USER_ID             │ DECISION    │ CLAUSE   │ REASON                   │
├─────────────────────┼─────────────┼──────────┼──────────────────────────┤
│ TEST_ITD_ANALYST    │ ALLOWED     │ -        │ -                        │
│ TEST_ITD_ANALYST    │ DENIED      │ C03      │ Cross-agency requires DSA│
│ TEST_EOTSS_ANALYST  │ GATED       │ -        │ HITL required            │
│ TEST_EOTSS_EXEC     │ APPROVED    │ -        │ -                        │
└─────────────────────┴─────────────┴──────────┴──────────────────────────┘
```

### Verification Checks (8/8 passed)
- ✓ All logs have user_id
- ✓ All logs have agreement_id
- ✓ All logs have decision
- ✓ DENIED logs cite clause
- ✓ GATED logs specify required approver
- ✓ APPROVED logs attribute approver

**Key point:** Complete audit trail exists. Retention configured for 7 years per DULA Clause 8.1.

---

## Slide 5: RBAC Structure (2 min)

**Question you care about:** Is least privilege enforced?

### Role Hierarchy (Evidence A1)
```
ACCOUNTADMIN
├── PRISM_GOVERNANCE_ADMIN
│   ├── PRISM_POLICY_VALIDATOR
│   │   └── PRISM_AUDIT_READER
│   └── PRISM_ENFORCER
├── EOTSS_EXECUTIVE
│   └── EOTSS_FINOPS_ANALYST
│       └── EOTSS_VIEWER
├── AGENCY_ITD_ADMIN → ANALYST → VIEWER
├── AGENCY_MASSIT_ADMIN → ANALYST → VIEWER
└── AGENCY_DPH_ADMIN → ANALYST → VIEWER
```

### Permissions Summary
| Role Type | Read Own | Read Secretariat | Promote EXEC | Manage Agreements |
|-----------|----------|------------------|--------------|-------------------|
| AGENCY_VIEWER | ✓ | ✗ | ✗ | ✗ |
| AGENCY_ANALYST | ✓ | ✗ | ✗ | ✗ |
| SECRETARIAT_ANALYST | ✓ | ✓ | ✗ | ✗ |
| SECRETARIAT_EXEC | ✓ | ✓ | ✓ | ✗ |
| GOVERNANCE_ADMIN | via grants | via grants | N/A | ✓ |

**Key point:** No over-permissioning. Users cannot escalate their own access.

---

## Slide 6: Summary and Ask (2 min)

### Controls Verified
| Control | Status |
|---------|--------|
| SSO authentication | ✓ Implemented |
| Deterministic role mapping | ✓ Tested |
| Database-enforced isolation | ✓ 7/7 tests |
| Enforcement logging | ✓ 8/8 checks |
| Audit retention | ✓ 7 years |

### Open Critical Findings
**None.**

### Request
Please sign Section 1 of the GA Sign-Off Memo confirming:
- [ ] Identity controls are sufficient for production
- [ ] Data isolation controls prevent unauthorized access
- [ ] Audit controls meet state security requirements
- [ ] No critical or high security findings are open

---

## Appendix: Evidence File Locations

- `docs/evidence/A1_snowflake_environment_20260119.json`
- `docs/evidence/A1_2_rbac_grants_20260119.json`
- `docs/evidence/A2_1_idp_claim_mapping_20260119.json`
- `docs/evidence/A2_2_persona_logins_20260119.json`
- `docs/evidence/A2_3_role_resolution_logs_20260119.json`
- `docs/evidence/A3_rls_verification_20260119.json`
- `docs/evidence/A6_operational_controls_20260119.json`
