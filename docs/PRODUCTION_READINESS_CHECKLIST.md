# PRISM Production Readiness Checklist

## Purpose

This checklist defines the criteria for declaring PRISM Generally Available (GA) for enterprise deployment. Each item must be completed, verified, and signed off before GA.

**Target:** Enterprise-ready AI-governed FinOps intelligence platform for state/federal central IT organizations.

---

## Status Legend

- [ ] Not started
- [~] In progress
- [x] Complete
- [N/A] Not applicable

---

## 1. Infrastructure and Deployment

### 1.1 Snowflake Environment

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] Production Snowflake account provisioned | | | Separate from dev/staging |
| [ ] Enterprise tier with Cortex AI enabled | | | Required for FORECAST, ANOMALY_DETECTION, COMPLETE |
| [ ] Multi-warehouse configuration deployed | | | COMPUTE_WH, CORTEX_WH, INGEST_WH |
| [ ] Auto-suspend and auto-resume configured | | | Cost optimization |
| [ ] Time Travel retention set (90 days minimum) | | | Required for audit |
| [ ] Fail-safe enabled | | | Disaster recovery |
| [ ] Network policies configured | | | IP allowlisting if required |
| [ ] Private Link enabled (if required) | | | For VPC connectivity |

### 1.2 Application Deployment

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] Production Vercel project configured | | | Separate from preview; or SPCS if Snowflake-native |
| [ ] Custom domain configured and verified | | | prism.mass.gov or similar |
| [ ] SSL/TLS certificates valid | | | Auto-renewed |
| [ ] Environment variables secured | | | No secrets in code |
| [ ] Edge runtime validated | | | Serverless compatibility (Vercel) or SPCS container |
| [ ] CDN caching configured | | | Static assets |
| [ ] Error tracking enabled (Sentry or similar) | | | Production monitoring |
| [ ] SPCS deployment evaluated | | | Snowflake-native option vs Vercel |

### 1.3 Database Schema

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [x] ANALYTICS schema deployed | | | Core spending tables |
| [x] GOVERNANCE schema deployed | | | Agreement tables |
| [x] Stored procedures deployed | | | Policy resolution |
| [ ] Row-level security policies active | | | Agency isolation |
| [ ] Masking policies configured | | | PII/PHI protection |
| [ ] Search optimization enabled | | | Query performance |
| [ ] Clustering keys validated | | | Partition pruning |

---

## 2. Security and Access Control

### 2.1 Authentication

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] SSO integration configured | | | SAML/OIDC with state IdP |
| [ ] MFA enforced for all users | | | No exceptions |
| [ ] Session timeout configured | | | 30 min inactive |
| [ ] Session invalidation on logout | | | Complete cleanup |
| [ ] Failed login lockout enabled | | | 5 attempts max |

### 2.2 Authorization

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] RBAC roles defined and documented | | | PRISM_ADMIN, ANALYST, VIEWER |
| [ ] Role hierarchy validated | | | Inheritance correct |
| [ ] Agency-scoped access tested | | | Users see only their data |
| [ ] Cross-agency access explicitly gated | | | Agreement-controlled |
| [ ] Service account credentials rotated | | | 90-day rotation |
| [ ] Least privilege verified | | | No over-permissioning |

### 2.3 Data Protection

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] Encryption at rest verified (AES-256) | | | Snowflake managed |
| [ ] Encryption in transit verified (TLS 1.3) | | | All connections |
| [ ] PII detection rules active | | | Pre-query and post-generation |
| [ ] PHI detection rules active | | | If applicable |
| [ ] Data masking policies tested | | | SSN, DOB, etc. |
| [ ] Export controls implemented | | | PDF, CSV restrictions |

### 2.4 Audit and Compliance

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] All queries logged | | | ACCESS_HISTORY enabled |
| [ ] All authentication events logged | | | LOGIN_HISTORY enabled |
| [ ] Governance enforcement logged | | | POLICY_ENFORCEMENT_LOG |
| [ ] Trust state transitions logged | | | With actor and timestamp |
| [ ] Audit log retention configured | | | 7 years minimum |
| [ ] Audit log immutability verified | | | Cannot be modified |
| [ ] SOC 2 Type II controls mapped | | | If required |
| [ ] FedRAMP controls mapped | | | If required |

---

## 3. Governance Enforcement

### 3.1 Agreement Registry

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [x] Agreement schema deployed | | | GOVERNANCE.AGREEMENTS |
| [x] Clause schema deployed | | | GOVERNANCE.AGREEMENT_CLAUSES |
| [x] Policy compilation working | | | COMPILE_AGREEMENT_POLICY |
| [ ] At least one executed DULA loaded | | | Production agreement |
| [ ] Enterprise default agreement defined | | | Fallback policy |
| [ ] Agreement expiration alerts configured | | | 30/60/90 day warnings |

### 3.2 Runtime Enforcement

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [x] Pre-query validation implemented | | | VALIDATE_REQUEST_PRE_QUERY |
| [x] Post-generation validation implemented | | | VALIDATE_RESPONSE_POST_GENERATION |
| [x] Trust state promotion gating implemented | | | CHECK_TRUST_STATE_PROMOTION |
| [ ] Policy resolution latency < 100ms | | | Performance requirement |
| [ ] Enforcement logging complete | | | All decisions logged |
| [ ] Denial explanations user-friendly | | | Cite clause, suggest action |

### 3.3 Trust State Workflow

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] DRAFT state working | | | AI-generated, no validation |
| [ ] INTERNAL state working | | | Analyst review gate |
| [ ] CLIENT state working | | | Stakeholder approval gate |
| [ ] EXECUTIVE state working | | | Leadership approval gate |
| [ ] Human-in-the-loop enforced for EXECUTIVE | | | Cannot auto-promote |
| [ ] State demotion working | | | With reason capture |
| [ ] State transition notifications working | | | Email/Slack alerts |

---

## 4. AI/ML Capabilities

### 4.1 Cortex AI Functions

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] FORECAST function validated | | | Accuracy testing |
| [ ] ANOMALY_DETECTION function validated | | | Sensitivity tuning |
| [ ] COMPLETE function validated | | | Prompt engineering |
| [ ] Snowflake Intelligence integrated | | | If using |
| [ ] Model selection documented | | | mistral-large, llama, etc. |
| [ ] Token limits enforced | | | Cost control |

### 4.2 AI Governance

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] All prompts logged | | | For audit |
| [ ] All outputs logged | | | For audit |
| [ ] Prompt injection defenses tested | | | Security |
| [ ] Output filtering active | | | PII/PHI removal |
| [ ] Hallucination mitigation documented | | | Grounding strategy |
| [ ] AI explanation citations working | | | Source attribution |

---

## 5. Data Quality and Integrity

### 5.1 Data Ingestion

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] Financial data source connected | | | ERP/MMARS/etc. |
| [ ] Cloud billing data source connected | | | AWS CUR, Azure Cost, GCP |
| [ ] Data freshness SLA defined | | | e.g., < 24 hours |
| [ ] Data validation rules implemented | | | Schema conformance |
| [ ] Duplicate detection active | | | Deduplication |
| [ ] Late-arriving data handling defined | | | Backfill strategy |

### 5.2 Data Quality Monitoring

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] Null rate monitoring active | | | Alert on anomalies |
| [ ] Cardinality monitoring active | | | Detect schema drift |
| [ ] Volume monitoring active | | | Detect missing loads |
| [ ] Reconciliation to source implemented | | | Monthly validation |
| [ ] Data quality dashboard operational | | | Visibility |

---

## 6. Operational Monitoring

### 6.1 Application Health

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] Health check endpoint implemented | | | /api/health |
| [ ] Uptime monitoring configured | | | 99.9% SLA target |
| [ ] Response time monitoring active | | | P50, P95, P99 |
| [ ] Error rate monitoring active | | | < 1% target |
| [ ] Memory/CPU monitoring active | | | Resource utilization |

### 6.2 Snowflake Monitoring

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] Query performance monitoring active | | | Slow query alerts |
| [ ] Credit consumption monitoring active | | | Budget alerts |
| [ ] Warehouse utilization dashboard | | | Right-sizing |
| [ ] Failed query alerts configured | | | Immediate notification |
| [ ] Storage growth monitoring active | | | Capacity planning |

### 6.3 Alerting

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] On-call rotation defined | | | Coverage schedule |
| [ ] Escalation policy documented | | | L1 → L2 → L3 |
| [ ] Alert channels configured | | | Slack, email, PagerDuty |
| [ ] Alert runbooks created | | | Response procedures |
| [ ] Alert fatigue review completed | | | No noise |

---

## 7. Performance and Scalability

### 7.1 Performance Baselines

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] Dashboard load time < 3s | | | P95 target |
| [ ] Intelligence query response < 5s | | | P95 target |
| [ ] Forecast generation < 30s | | | P95 target |
| [ ] Narrative generation < 60s | | | P95 target |
| [ ] Agreement search < 500ms | | | P95 target |

### 7.2 Load Testing

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] Concurrent user load test completed | | | 100+ users |
| [ ] Peak load test completed | | | 2x expected |
| [ ] Sustained load test completed | | | 8 hours |
| [ ] Warehouse scaling validated | | | Auto-scale triggers |
| [ ] No memory leaks detected | | | 24-hour soak test |

---

## 8. Documentation

### 8.1 Technical Documentation

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [x] Architecture diagram documented | | | architecture-annotated.md |
| [x] Database schema documented | | | DDL files |
| [x] API documentation generated | | | tRPC types |
| [ ] Deployment runbook created | | | Step-by-step |
| [ ] Disaster recovery runbook created | | | RTO/RPO defined |
| [ ] Incident response runbook created | | | Escalation paths |

### 8.2 User Documentation

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] User guide written | | | End-user focused |
| [ ] Admin guide written | | | Configuration |
| [ ] Agreement management guide written | | | Legal/governance |
| [ ] FAQ documented | | | Common questions |
| [ ] Video tutorials created | | | Optional |

### 8.3 Compliance Documentation

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] Data flow diagram documented | | | For security review |
| [ ] Privacy impact assessment completed | | | If required |
| [ ] Security assessment completed | | | Penetration test |
| [ ] Vendor risk assessment completed | | | Snowflake, Vercel |

---

## 9. Testing

### 9.1 Functional Testing

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] Unit tests passing (> 80% coverage) | | | Server-side |
| [ ] Integration tests passing | | | API endpoints |
| [ ] E2E tests passing | | | Critical paths |
| [ ] Cross-browser testing completed | | | Chrome, Edge, Safari |
| [ ] Mobile responsiveness verified | | | Tablet, phone |

### 9.2 Security Testing

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] Vulnerability scan completed | | | No critical/high |
| [ ] Penetration test completed | | | Third-party |
| [ ] OWASP Top 10 verified | | | No violations |
| [ ] Dependency audit completed | | | No known CVEs |
| [ ] Secrets scan completed | | | No exposed credentials |

### 9.3 Governance Testing

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] Blocked query scenario tested | | | Cross-agency denial |
| [ ] Degraded query scenario tested | | | Domain restriction |
| [ ] Trust state promotion tested | | | DRAFT → EXECUTIVE |
| [ ] Amendment workflow tested | | | End-to-end |
| [ ] Agreement expiration tested | | | Access revocation |

---

## 10. Operational Readiness

### 10.1 Support

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] Support team trained | | | Product knowledge |
| [ ] Support channels defined | | | Email, Slack, portal |
| [ ] Ticket workflow defined | | | Triage, escalation |
| [ ] SLA defined and communicated | | | Response times |
| [ ] Knowledge base seeded | | | Common issues |

### 10.2 Change Management

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] Release process documented | | | CI/CD pipeline |
| [ ] Rollback procedure tested | | | < 15 min recovery |
| [ ] Feature flag system operational | | | Gradual rollout |
| [ ] Change advisory board identified | | | Approval process |
| [ ] Maintenance window defined | | | If required |

### 10.3 Business Continuity

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] RTO defined | | | e.g., 4 hours |
| [ ] RPO defined | | | e.g., 1 hour |
| [ ] Backup strategy documented | | | Snowflake + app |
| [ ] Disaster recovery tested | | | Annual exercise |
| [ ] Failover tested | | | If multi-region |

---

## 11. Legal and Contractual

### 11.1 Agreements

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] Snowflake contract reviewed | | | Terms of service |
| [ ] Vercel contract reviewed | | | Terms of service |
| [ ] Data processing agreement in place | | | If required |
| [ ] BAA in place | | | If PHI involved |
| [ ] Customer agreement template ready | | | For agencies |

### 11.2 Intellectual Property

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] Open source license compliance verified | | | Dependencies |
| [ ] Attribution requirements met | | | License terms |
| [ ] Proprietary code protected | | | No accidental exposure |

---

## 12. Go-Live Checklist

### Pre-Launch (T-7 days)

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] All blockers resolved | | | No open critical issues |
| [ ] Stakeholder sign-off obtained | | | CIO, Legal, Security |
| [ ] Launch communication drafted | | | Announcement |
| [ ] Support team on standby | | | Hypercare period |
| [ ] Monitoring dashboards visible | | | War room ready |

### Launch Day (T-0)

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] Production deployment completed | | | Final push |
| [ ] Smoke tests passing | | | Critical paths |
| [ ] DNS cutover completed | | | If new domain |
| [ ] Monitoring confirmed active | | | All alerts firing correctly |
| [ ] Launch communication sent | | | Stakeholders notified |

### Post-Launch (T+7 days)

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [ ] No critical incidents | | | Stability verified |
| [ ] User feedback collected | | | Initial reactions |
| [ ] Performance baseline captured | | | Production metrics |
| [ ] Hypercare period concluded | | | Normal support |
| [ ] Retrospective completed | | | Lessons learned |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Technical Lead | | | |
| Security Lead | | | |
| Operations Lead | | | |
| Legal/Compliance | | | |
| Executive Sponsor | | | |

---

## EOTSS POC Readiness (Pre-GA)

The following items validate the POC is ready for the 6-8 week evaluation period. These are prerequisites for the POC demo, not for full GA.

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| [x] EOTSS_POC schema created with sample data | | | 4 tables seeded |
| [x] EOTSS_STAGING swap-layer views created | | | 4 views with computed columns |
| [x] Semantic model YAML written | | | 4 tables, ~35 columns, 14 verified queries |
| [x] Cortex FORECAST + ANOMALY_DETECTION configured | | | DDL scripts ready |
| [x] Semantic view deployment script ready | | | Stage + SYSTEM$CREATE_SEMANTIC_VIEW_FROM_YAML |
| [x] POC DULA governance agreement (AGR-EOTSS-POC-001) | | | 5 clauses |
| [x] Validation queries for 5 demo scenarios | | | All scenarios scripted |
| [ ] SQL scripts 01-03 executed in Snowflake | | | Schema + data + views |
| [ ] Semantic model deployed and queryable | | | Via Intelligence UI |
| [ ] Cortex models trained | | | FORECAST + ANOMALY_DETECTION |
| [ ] All 5 demo scenarios validated | | | Non-empty results |
| [ ] Snowflake Intelligence UI tested | | | NL query produces correct SQL |
| [ ] POC demo rehearsed with stakeholders | | | End-to-end walkthrough |

---

## Appendix: Critical Path Items

The following items are **hard blockers** for GA. All must be complete:

1. **Production Snowflake account** with Cortex AI enabled
2. **At least one executed DULA** loaded in GOVERNANCE schema
3. **SSO integration** with state identity provider
4. **Row-level security** enforcing agency isolation
5. **Governance enforcement** logging all decisions
6. **Trust state workflow** with human-in-the-loop for EXECUTIVE
7. **Security assessment** completed with no critical findings
8. **Support team** trained and on-call rotation defined
9. **Stakeholder sign-off** from CIO, Legal, and Security

---

*Last updated: 2026-02-01*
*Version: 1.1 — Added EOTSS POC readiness section, SPCS deployment option*
