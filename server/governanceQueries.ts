// =============================================================================
// PRISM Governance Queries
// Server-side queries for Agreement Intelligence module
// =============================================================================

import { executeQuery } from "./snowflake";

// Demo mode flag - set to true to use mock data instead of Snowflake
const DEMO_MODE = process.env.GOVERNANCE_DEMO_MODE === "true" || true;

function useDemoMode(): boolean {
  return DEMO_MODE;
}

// =============================================================================
// Types
// =============================================================================

export interface Agreement {
  agreementId: string;
  agreementType: "MOU" | "DULA" | "ADDENDUM" | "AMENDMENT" | "APPENDIX";
  agreementTitle: string;
  agencyId: string | null;
  secretariatId: string | null;
  counterpartyType: string;
  counterpartyName: string;
  programId: string | null;
  effectiveDate: string;
  expirationDate: string | null;
  status: "DRAFT" | "IN_REVIEW" | "EXECUTED" | "EXPIRED" | "SUPERSEDED" | "TERMINATED";
  ownerOrg: string;
  agreementOwner: string;
  dataDomains: string[];
  dataClassificationMax: string;
  piiAllowed: boolean;
  phiAllowed: boolean;
  crossAgencySharingAllowed: boolean;
  aiProcessingAllowed: boolean;
  aiRestrictionsSummary: string | null;
  daysUntilExpiration: number | null;
  expirationStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgreementClause {
  agreementId: string;
  clauseId: string;
  clauseType: string;
  clauseTitle: string | null;
  clauseText: string;
  clausePriority: number;
  policyJson: Record<string, any> | null;
  sourceSection: string | null;
  extractionMethod: string;
  validatedBy: string | null;
  validatedAt: string | null;
}

export interface AgreementPolicy {
  agreementId: string;
  policyVersion: string;
  compiledPolicyJson: Record<string, any>;
  validationStatus: string;
  isActive: boolean;
  compiledAt: string;
  validatedAt: string | null;
}

export interface PermissionsMatrix {
  aiAllowed: boolean;
  piiAllowed: boolean;
  phiAllowed: boolean;
  crossAgencyAllowed: boolean;
  externalSharingAllowed: boolean;
  domainsAllowed: string[];
  purposesAllowed: string[];
  purposesProhibited: string[];
  fieldsProhibited: string[];
  requirements: string[];
  maxClassification: string;
  maxRetentionDays: number;
}

export interface AgreementEvent {
  eventId: string;
  agreementId: string;
  eventType: string;
  eventSubtype: string | null;
  actorId: string;
  actorRole: string | null;
  eventAt: string;
  detailsJson: Record<string, any> | null;
}

export interface EnforcementLogEntry {
  logId: string;
  requestId: string;
  requestTimestamp: string;
  userId: string;
  userAgency: string | null;
  agencyContext: string | null;
  agreementIdSelected: string | null;
  decision: "ALLOWED" | "DENIED" | "DEGRADED";
  decisionReason: string | null;
  trustStateOutput: string | null;
}

// =============================================================================
// Demo Data
// =============================================================================

const DEMO_AGREEMENTS: Agreement[] = [
  {
    agreementId: "AGR-EOTSS-001",
    agreementType: "DULA",
    agreementTitle: "PRISM FinOps Intelligence Data Use and License Agreement",
    agencyId: null,
    secretariatId: null,
    counterpartyType: "EOTSS",
    counterpartyName: "Executive Office of Technology Services and Security",
    programId: null,
    effectiveDate: "2026-01-01",
    expirationDate: "2028-12-31",
    status: "EXECUTED",
    ownerOrg: "EOTSS",
    agreementOwner: "PRISM Program Office",
    dataDomains: ["CLOUD_COST", "BILLING", "CIP_PROGRAM", "MODERNIZATION_STATUS"],
    dataClassificationMax: "CONFIDENTIAL",
    piiAllowed: false,
    phiAllowed: false,
    crossAgencySharingAllowed: false,
    aiProcessingAllowed: true,
    aiRestrictionsSummary: "AI processing permitted for forecasting, anomaly detection, and executive narrative generation. Human-in-the-loop required for executive-level outputs.",
    daysUntilExpiration: 1076,
    expirationStatus: "ACTIVE",
    createdAt: "2025-11-15T10:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    agreementId: "AGR-HHS-001",
    agreementType: "MOU",
    agreementTitle: "Health and Human Services Data Sharing MOU",
    agencyId: "HHS",
    secretariatId: "HHS",
    counterpartyType: "AGENCY",
    counterpartyName: "Executive Office of Health and Human Services",
    programId: "CIP-HHS-MODERNIZATION",
    effectiveDate: "2025-07-01",
    expirationDate: "2027-06-30",
    status: "EXECUTED",
    ownerOrg: "JOINT",
    agreementOwner: "HHS CIO Office",
    dataDomains: ["CLOUD_COST", "BILLING", "MODERNIZATION_STATUS"],
    dataClassificationMax: "CONFIDENTIAL",
    piiAllowed: false,
    phiAllowed: false,
    crossAgencySharingAllowed: true,
    aiProcessingAllowed: true,
    aiRestrictionsSummary: "AI permitted for trend analysis and forecasting. PHI data excluded from all processing.",
    daysUntilExpiration: 528,
    expirationStatus: "ACTIVE",
    createdAt: "2025-05-01T10:00:00Z",
    updatedAt: "2025-07-01T00:00:00Z",
  },
  {
    agreementId: "AGR-DOT-001",
    agreementType: "DULA",
    agreementTitle: "Department of Transportation Cloud Cost Analytics Agreement",
    agencyId: "DOT",
    secretariatId: "TRANS",
    counterpartyType: "AGENCY",
    counterpartyName: "Massachusetts Department of Transportation",
    programId: "CIP-DOT-CLOUD",
    effectiveDate: "2025-09-01",
    expirationDate: "2026-02-28",
    status: "EXECUTED",
    ownerOrg: "AGENCY",
    agreementOwner: "DOT IT Director",
    dataDomains: ["CLOUD_COST", "BILLING"],
    dataClassificationMax: "INTERNAL",
    piiAllowed: false,
    phiAllowed: false,
    crossAgencySharingAllowed: false,
    aiProcessingAllowed: true,
    aiRestrictionsSummary: "Full AI capabilities enabled for cloud cost optimization.",
    daysUntilExpiration: 40,
    expirationStatus: "EXPIRING_SOON",
    createdAt: "2025-08-01T10:00:00Z",
    updatedAt: "2025-09-01T00:00:00Z",
  },
  {
    agreementId: "AGR-EDU-001",
    agreementType: "MOU",
    agreementTitle: "Department of Education Program Analytics MOU",
    agencyId: "DOE",
    secretariatId: "EDU",
    counterpartyType: "AGENCY",
    counterpartyName: "Department of Elementary and Secondary Education",
    programId: null,
    effectiveDate: "2025-01-01",
    expirationDate: "2025-12-31",
    status: "EXPIRED",
    ownerOrg: "AGENCY",
    agreementOwner: "DESE Data Office",
    dataDomains: ["CIP_PROGRAM", "MODERNIZATION_STATUS"],
    dataClassificationMax: "CONFIDENTIAL",
    piiAllowed: false,
    phiAllowed: false,
    crossAgencySharingAllowed: false,
    aiProcessingAllowed: false,
    aiRestrictionsSummary: "AI processing not permitted under this agreement.",
    daysUntilExpiration: -19,
    expirationStatus: "EXPIRED",
    createdAt: "2024-11-01T10:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    agreementId: "AGR-DPS-001",
    agreementType: "DULA",
    agreementTitle: "Public Safety Real-Time Analytics Agreement",
    agencyId: "DPS",
    secretariatId: "EOPSS",
    counterpartyType: "AGENCY",
    counterpartyName: "Executive Office of Public Safety and Security",
    programId: "CIP-DPS-ANALYTICS",
    effectiveDate: "2025-10-01",
    expirationDate: "2027-09-30",
    status: "EXECUTED",
    ownerOrg: "JOINT",
    agreementOwner: "EOPSS CISO",
    dataDomains: ["CLOUD_COST", "BILLING", "OPERATIONAL"],
    dataClassificationMax: "RESTRICTED",
    piiAllowed: false,
    phiAllowed: false,
    crossAgencySharingAllowed: false,
    aiProcessingAllowed: true,
    aiRestrictionsSummary: "AI permitted for anomaly detection only. No narrative generation without explicit approval.",
    daysUntilExpiration: 619,
    expirationStatus: "ACTIVE",
    createdAt: "2025-08-15T10:00:00Z",
    updatedAt: "2025-10-01T00:00:00Z",
  },
];

const DEMO_CLAUSES: Record<string, AgreementClause[]> = {
  "AGR-EOTSS-001": [
    {
      agreementId: "AGR-EOTSS-001",
      clauseId: "CLS-001",
      clauseType: "PURPOSE_LIMITATION",
      clauseTitle: "Permitted Purposes",
      clauseText: "Data provided under this Agreement may only be used for: (a) modernization program oversight, (b) financial operations forecasting, (c) spending anomaly detection, (d) executive reporting and narrative generation. Data shall not be used for personnel evaluation, law enforcement purposes, or marketing activities.",
      clausePriority: 100,
      policyJson: {
        allowed: ["modernization_oversight", "finops_forecasting", "anomaly_detection", "executive_reporting"],
        prohibited: ["personnel_evaluation", "law_enforcement", "marketing"],
      },
      sourceSection: "4.1",
      extractionMethod: "MANUAL",
      validatedBy: "Legal Counsel",
      validatedAt: "2025-12-15T14:00:00Z",
    },
    {
      agreementId: "AGR-EOTSS-001",
      clauseId: "CLS-002",
      clauseType: "DATA_SCOPE",
      clauseTitle: "Data Domains and Restrictions",
      clauseText: "This Agreement covers the following data domains: Cloud Cost data, Billing records, CIP Program information, and Modernization Status indicators. Personally identifiable information (PII) is not permitted under this Agreement.",
      clausePriority: 100,
      policyJson: {
        domains_allowed: ["CLOUD_COST", "BILLING", "CIP_PROGRAM", "MODERNIZATION_STATUS"],
        fields_prohibited: ["SSN", "DOB", "FULL_ADDRESS"],
        pii_allowed: false,
      },
      sourceSection: "4.2",
      extractionMethod: "MANUAL",
      validatedBy: "Legal Counsel",
      validatedAt: "2025-12-15T14:00:00Z",
    },
    {
      agreementId: "AGR-EOTSS-001",
      clauseId: "CLS-003",
      clauseType: "AI_USE",
      clauseTitle: "Artificial Intelligence Processing",
      clauseText: "AI and machine learning processing is permitted under the following conditions: (1) Human review is required before any AI-generated content is promoted to Executive trust state. (2) All prompts submitted to AI systems and all outputs generated must be logged for audit purposes. (3) AI-generated insights must cite source data and governing agreement clauses.",
      clausePriority: 100,
      policyJson: {
        ai_allowed: true,
        requirements: ["human_in_the_loop_for_executive", "log_prompts_outputs", "cite_sources"],
        prohibited_actions: ["automated_decision_making_without_approval"],
      },
      sourceSection: "5.1",
      extractionMethod: "MANUAL",
      validatedBy: "Legal Counsel",
      validatedAt: "2025-12-15T14:00:00Z",
    },
    {
      agreementId: "AGR-EOTSS-001",
      clauseId: "CLS-004",
      clauseType: "CROSS_SHARING",
      clauseTitle: "Cross-Agency Data Sharing",
      clauseText: "Cross-agency sharing of raw data is not permitted under this Agreement. Aggregated, de-identified summaries may be shared with EOTSS FinOps roles for government-wide oversight purposes only.",
      clausePriority: 100,
      policyJson: {
        cross_agency_allowed: false,
        allowed_recipients: ["EOTSS_ROLE:FINOPS_ANALYST", "EOTSS_ROLE:CFO"],
        aggregation_required: true,
        external_sharing_allowed: false,
      },
      sourceSection: "6.1",
      extractionMethod: "MANUAL",
      validatedBy: "Legal Counsel",
      validatedAt: "2025-12-15T14:00:00Z",
    },
    {
      agreementId: "AGR-EOTSS-001",
      clauseId: "CLS-005",
      clauseType: "RETENTION",
      clauseTitle: "Data Retention and Disposal",
      clauseText: "Data obtained under this Agreement shall be retained for a maximum of seven (7) years from the date of collection. Upon termination of this Agreement, all data shall be securely deleted within ninety (90) days unless retention is required by law.",
      clausePriority: 100,
      policyJson: {
        max_days: 2555,
        delete_on_termination: true,
        deletion_period_days: 90,
      },
      sourceSection: "7.1",
      extractionMethod: "MANUAL",
      validatedBy: "Legal Counsel",
      validatedAt: "2025-12-15T14:00:00Z",
    },
  ],
};

const DEMO_EVENTS: AgreementEvent[] = [
  {
    eventId: "EVT-001",
    agreementId: "AGR-EOTSS-001",
    eventType: "CREATED",
    eventSubtype: null,
    actorId: "system",
    actorRole: "SYSTEM",
    eventAt: "2025-11-15T10:00:00Z",
    detailsJson: { source: "Manual entry" },
  },
  {
    eventId: "EVT-002",
    agreementId: "AGR-EOTSS-001",
    eventType: "COMPILED",
    eventSubtype: null,
    actorId: "legal.counsel@mass.gov",
    actorRole: "GOVERNANCE_ADMIN",
    eventAt: "2025-12-01T14:00:00Z",
    detailsJson: { policy_version: "v20251201_140000", clause_count: 5 },
  },
  {
    eventId: "EVT-003",
    agreementId: "AGR-EOTSS-001",
    eventType: "VALIDATED",
    eventSubtype: null,
    actorId: "cio@mass.gov",
    actorRole: "GOVERNANCE_VALIDATOR",
    eventAt: "2025-12-15T09:00:00Z",
    detailsJson: { validation_notes: "All clauses reviewed and approved" },
  },
  {
    eventId: "EVT-004",
    agreementId: "AGR-EOTSS-001",
    eventType: "ACTIVATED",
    eventSubtype: null,
    actorId: "cio@mass.gov",
    actorRole: "GOVERNANCE_ADMIN",
    eventAt: "2026-01-01T00:00:00Z",
    detailsJson: { policy_version: "v20251201_140000" },
  },
];

const DEMO_ENFORCEMENT_LOG: EnforcementLogEntry[] = [
  {
    logId: "LOG-001",
    requestId: "REQ-2026-001",
    requestTimestamp: "2026-01-19T10:30:00Z",
    userId: "analyst@mass.gov",
    userAgency: "EOTSS",
    agencyContext: "DOT",
    agreementIdSelected: "AGR-DOT-001",
    decision: "ALLOWED",
    decisionReason: null,
    trustStateOutput: "DRAFT",
  },
  {
    logId: "LOG-002",
    requestId: "REQ-2026-002",
    requestTimestamp: "2026-01-19T11:15:00Z",
    userId: "analyst@mass.gov",
    userAgency: "EOTSS",
    agencyContext: "HHS",
    agreementIdSelected: "AGR-HHS-001",
    decision: "DEGRADED",
    decisionReason: "PHI fields detected in query scope; restricted to non-PHI data",
    trustStateOutput: "INTERNAL",
  },
  {
    logId: "LOG-003",
    requestId: "REQ-2026-003",
    requestTimestamp: "2026-01-19T14:00:00Z",
    userId: "external@vendor.com",
    userAgency: null,
    agencyContext: "DPS",
    agreementIdSelected: null,
    decision: "DENIED",
    decisionReason: "No applicable agreement for external user accessing DPS data",
    trustStateOutput: null,
  },
];

// =============================================================================
// Query Functions
// =============================================================================

export async function getAgreements(filters?: {
  status?: string;
  agencyId?: string;
  agreementType?: string;
}): Promise<Agreement[]> {
  if (useDemoMode()) {
    let result = [...DEMO_AGREEMENTS];
    if (filters?.status) {
      result = result.filter((a) => a.status === filters.status);
    }
    if (filters?.agencyId) {
      result = result.filter((a) => a.agencyId === filters.agencyId);
    }
    if (filters?.agreementType) {
      result = result.filter((a) => a.agreementType === filters.agreementType);
    }
    return result;
  }

  const conditions: string[] = ["1=1"];
  if (filters?.status) conditions.push(`status = '${filters.status}'`);
  if (filters?.agencyId) conditions.push(`agency_id = '${filters.agencyId}'`);
  if (filters?.agreementType) conditions.push(`agreement_type = '${filters.agreementType}'`);

  const query = `
    SELECT * FROM GOVERNANCE.V_ACTIVE_AGREEMENTS
    WHERE ${conditions.join(" AND ")}
    ORDER BY effective_date DESC
  `;

  return executeQuery(query);
}

export async function getAgreementById(agreementId: string): Promise<Agreement | null> {
  if (useDemoMode()) {
    return DEMO_AGREEMENTS.find((a) => a.agreementId === agreementId) || null;
  }

  const query = `
    SELECT * FROM GOVERNANCE.V_ACTIVE_AGREEMENTS
    WHERE agreement_id = '${agreementId}'
  `;

  const results = await executeQuery<Agreement>(query);
  return results[0] || null;
}

export async function getAgreementClauses(agreementId: string): Promise<AgreementClause[]> {
  if (useDemoMode()) {
    return DEMO_CLAUSES[agreementId] || [];
  }

  const query = `
    SELECT * FROM GOVERNANCE.AGREEMENT_CLAUSES
    WHERE agreement_id = '${agreementId}'
    ORDER BY clause_priority DESC, clause_type
  `;

  return executeQuery(query);
}

export async function getAgreementPolicy(agreementId: string): Promise<AgreementPolicy | null> {
  if (useDemoMode()) {
    // Return a mock compiled policy
    const agreement = DEMO_AGREEMENTS.find((a) => a.agreementId === agreementId);
    if (!agreement) return null;

    return {
      agreementId,
      policyVersion: "v20251201_140000",
      compiledPolicyJson: {
        ai_allowed: agreement.aiProcessingAllowed,
        pii_allowed: agreement.piiAllowed,
        phi_allowed: agreement.phiAllowed,
        cross_agency_allowed: agreement.crossAgencySharingAllowed,
        domains_allowed: agreement.dataDomains,
        max_classification: agreement.dataClassificationMax,
        requirements: ["human_in_the_loop_for_executive", "log_prompts_outputs", "cite_sources"],
      },
      validationStatus: "VALIDATED",
      isActive: true,
      compiledAt: "2025-12-01T14:00:00Z",
      validatedAt: "2025-12-15T09:00:00Z",
    };
  }

  const query = `
    SELECT * FROM GOVERNANCE.AGREEMENT_POLICY
    WHERE agreement_id = '${agreementId}' AND is_active = TRUE
  `;

  const results = await executeQuery<AgreementPolicy>(query);
  return results[0] || null;
}

export async function getPermissionsMatrix(agreementId: string): Promise<PermissionsMatrix | null> {
  const policy = await getAgreementPolicy(agreementId);
  if (!policy) return null;

  const compiled = policy.compiledPolicyJson;
  return {
    aiAllowed: compiled.ai_allowed ?? true,
    piiAllowed: compiled.pii_allowed ?? false,
    phiAllowed: compiled.phi_allowed ?? false,
    crossAgencyAllowed: compiled.cross_agency_allowed ?? false,
    externalSharingAllowed: compiled.external_sharing_allowed ?? false,
    domainsAllowed: compiled.domains_allowed ?? [],
    purposesAllowed: compiled.purposes_allowed ?? [],
    purposesProhibited: compiled.purposes_prohibited ?? [],
    fieldsProhibited: compiled.fields_prohibited ?? [],
    requirements: compiled.requirements ?? [],
    maxClassification: compiled.max_classification ?? "INTERNAL",
    maxRetentionDays: compiled.max_retention_days ?? 2555,
  };
}

export async function getAgreementEvents(agreementId: string): Promise<AgreementEvent[]> {
  if (useDemoMode()) {
    return DEMO_EVENTS.filter((e) => e.agreementId === agreementId);
  }

  const query = `
    SELECT * FROM GOVERNANCE.AGREEMENT_EVENTS
    WHERE agreement_id = '${agreementId}'
    ORDER BY event_at DESC
    LIMIT 50
  `;

  return executeQuery(query);
}

export async function getEnforcementLog(filters?: {
  agreementId?: string;
  userId?: string;
  decision?: string;
  limit?: number;
}): Promise<EnforcementLogEntry[]> {
  if (useDemoMode()) {
    let result = [...DEMO_ENFORCEMENT_LOG];
    if (filters?.agreementId) {
      result = result.filter((e) => e.agreementIdSelected === filters.agreementId);
    }
    if (filters?.userId) {
      result = result.filter((e) => e.userId === filters.userId);
    }
    if (filters?.decision) {
      result = result.filter((e) => e.decision === filters.decision);
    }
    return result.slice(0, filters?.limit || 50);
  }

  const conditions: string[] = ["1=1"];
  if (filters?.agreementId) conditions.push(`agreement_id_selected = '${filters.agreementId}'`);
  if (filters?.userId) conditions.push(`user_id = '${filters.userId}'`);
  if (filters?.decision) conditions.push(`decision = '${filters.decision}'`);

  const query = `
    SELECT * FROM GOVERNANCE.POLICY_ENFORCEMENT_LOG
    WHERE ${conditions.join(" AND ")}
    ORDER BY request_timestamp DESC
    LIMIT ${filters?.limit || 50}
  `;

  return executeQuery(query);
}

export async function getAgreementStats(): Promise<{
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
  byType: Record<string, number>;
  aiEnabled: number;
}> {
  if (useDemoMode()) {
    const agreements = DEMO_AGREEMENTS;
    return {
      total: agreements.length,
      active: agreements.filter((a) => a.status === "EXECUTED" && a.expirationStatus === "ACTIVE").length,
      expiringSoon: agreements.filter((a) => a.expirationStatus === "EXPIRING_SOON").length,
      expired: agreements.filter((a) => a.status === "EXPIRED" || a.expirationStatus === "EXPIRED").length,
      byType: agreements.reduce((acc, a) => {
        acc[a.agreementType] = (acc[a.agreementType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      aiEnabled: agreements.filter((a) => a.aiProcessingAllowed).length,
    };
  }

  // Would execute multiple queries in production
  return {
    total: 0,
    active: 0,
    expiringSoon: 0,
    expired: 0,
    byType: {},
    aiEnabled: 0,
  };
}

// =============================================================================
// Amendment Request Functions
// =============================================================================

export interface AmendmentRequest {
  requestId: string;
  agreementId: string;
  requestedBy: string;
  requestedAt: string;
  amendmentType: "EXPAND_DOMAINS" | "ENABLE_AI" | "EXTEND_EXPIRATION" | "MODIFY_SHARING" | "OTHER";
  description: string;
  justification: string;
  status: "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED";
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

const DEMO_AMENDMENT_REQUESTS: AmendmentRequest[] = [
  {
    requestId: "AMD-001",
    agreementId: "AGR-DOT-001",
    requestedBy: "dot.analyst@mass.gov",
    requestedAt: "2026-01-15T09:00:00Z",
    amendmentType: "EXTEND_EXPIRATION",
    description: "Extend agreement expiration by 12 months",
    justification: "Ongoing cloud optimization initiative requires continued access to analytics capabilities.",
    status: "IN_REVIEW",
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
  },
];

export async function getAmendmentRequests(agreementId?: string): Promise<AmendmentRequest[]> {
  if (useDemoMode()) {
    if (agreementId) {
      return DEMO_AMENDMENT_REQUESTS.filter((r) => r.agreementId === agreementId);
    }
    return DEMO_AMENDMENT_REQUESTS;
  }

  // Would query from database in production
  return [];
}

export async function createAmendmentRequest(request: Omit<AmendmentRequest, "requestId" | "status" | "reviewedBy" | "reviewedAt" | "reviewNotes">): Promise<AmendmentRequest> {
  const newRequest: AmendmentRequest = {
    ...request,
    requestId: `AMD-${Date.now()}`,
    status: "PENDING",
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
  };

  if (useDemoMode()) {
    DEMO_AMENDMENT_REQUESTS.push(newRequest);
    return newRequest;
  }

  // Would insert into database in production
  return newRequest;
}

// =============================================================================
// Agreement Chat Functions
// =============================================================================

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
}

export async function askAboutAgreement(
  agreementId: string,
  question: string,
  conversationHistory: ChatMessage[]
): Promise<ChatMessage> {
  // In production, this would:
  // 1. Search agreement chunks using SEARCH_AGREEMENTS_BY_QUESTION
  // 2. Build context from relevant clauses
  // 3. Call Cortex COMPLETE with governance context
  // 4. Return response with citations

  if (useDemoMode()) {
    const agreement = DEMO_AGREEMENTS.find((a) => a.agreementId === agreementId);
    const clauses = DEMO_CLAUSES[agreementId] || [];

    // Simulate intelligent responses based on question keywords
    const questionLower = question.toLowerCase();

    if (questionLower.includes("ai") || questionLower.includes("artificial intelligence")) {
      const aiClause = clauses.find((c) => c.clauseType === "AI_USE");
      return {
        role: "assistant",
        content: agreement?.aiProcessingAllowed
          ? `Yes, AI processing is permitted under this agreement. ${aiClause?.clauseText || ""}\n\nKey requirements:\n- Human review required for Executive-level outputs\n- All prompts and outputs must be logged\n- AI-generated insights must cite sources`
          : "AI processing is not permitted under this agreement.",
        citations: aiClause ? [`Clause ${aiClause.sourceSection}: ${aiClause.clauseTitle}`] : [],
      };
    }

    if (questionLower.includes("data") || questionLower.includes("domain")) {
      const dataClause = clauses.find((c) => c.clauseType === "DATA_SCOPE");
      return {
        role: "assistant",
        content: `This agreement covers the following data domains: ${agreement?.dataDomains.join(", ")}.\n\nData classification is limited to ${agreement?.dataClassificationMax}.\n\nPII: ${agreement?.piiAllowed ? "Permitted" : "Not permitted"}\nPHI: ${agreement?.phiAllowed ? "Permitted" : "Not permitted"}`,
        citations: dataClause ? [`Clause ${dataClause.sourceSection}: ${dataClause.clauseTitle}`] : [],
      };
    }

    if (questionLower.includes("share") || questionLower.includes("cross-agency")) {
      const shareClause = clauses.find((c) => c.clauseType === "CROSS_SHARING");
      return {
        role: "assistant",
        content: agreement?.crossAgencySharingAllowed
          ? "Cross-agency data sharing is permitted under this agreement, subject to the conditions outlined in the Cross-Agency Data Sharing clause."
          : `Cross-agency sharing of raw data is not permitted under this agreement. ${shareClause?.clauseText || ""}`,
        citations: shareClause ? [`Clause ${shareClause.sourceSection}: ${shareClause.clauseTitle}`] : [],
      };
    }

    if (questionLower.includes("expire") || questionLower.includes("expiration") || questionLower.includes("renew")) {
      return {
        role: "assistant",
        content: `This agreement ${agreement?.expirationDate ? `expires on ${agreement.expirationDate}` : "has no expiration date (perpetual)"}.\n\nCurrent status: ${agreement?.expirationStatus}\n${agreement?.daysUntilExpiration && agreement.daysUntilExpiration > 0 ? `Days until expiration: ${agreement.daysUntilExpiration}` : ""}`,
        citations: [],
      };
    }

    // Default response
    return {
      role: "assistant",
      content: `This is the ${agreement?.agreementTitle}. It is a ${agreement?.agreementType} between PRISM and ${agreement?.counterpartyName}.\n\nWould you like to know about:\n- AI processing permissions\n- Data domains and restrictions\n- Cross-agency sharing rules\n- Expiration and renewal`,
      citations: [],
    };
  }

  // Production implementation would use Cortex AI
  return {
    role: "assistant",
    content: "I apologize, but I cannot process your question at this time.",
    citations: [],
  };
}

// =============================================================================
// Draft Agreement Functions
// =============================================================================

export interface DraftAgreementParams {
  agreementType: "MOU" | "DULA";
  agencyId: string;
  agencyName: string;
  dataDomains: string[];
  aiEnabled: boolean;
  crossAgencySharing: boolean;
  expirationMonths: number;
}

export async function generateDraftAgreement(params: DraftAgreementParams): Promise<{
  agreementId: string;
  title: string;
  suggestedClauses: AgreementClause[];
}> {
  const agreementId = `AGR-DRAFT-${Date.now()}`;
  const title = `${params.agencyName} ${params.agreementType === "DULA" ? "Data Use and License Agreement" : "Memorandum of Understanding"}`;

  const suggestedClauses: AgreementClause[] = [
    {
      agreementId,
      clauseId: "DRAFT-CLS-001",
      clauseType: "PURPOSE_LIMITATION",
      clauseTitle: "Permitted Purposes",
      clauseText: `Data provided under this Agreement may only be used for: (a) financial operations oversight, (b) spending analysis and forecasting, (c) anomaly detection and alerting${params.aiEnabled ? ", (d) AI-assisted executive reporting" : ""}. Data shall not be used for personnel evaluation, law enforcement purposes, or marketing activities.`,
      clausePriority: 100,
      policyJson: {
        allowed: ["finops_oversight", "spending_analysis", "anomaly_detection", ...(params.aiEnabled ? ["ai_reporting"] : [])],
        prohibited: ["personnel_evaluation", "law_enforcement", "marketing"],
      },
      sourceSection: "4.1",
      extractionMethod: "AI_EXTRACTED",
      validatedBy: null,
      validatedAt: null,
    },
    {
      agreementId,
      clauseId: "DRAFT-CLS-002",
      clauseType: "DATA_SCOPE",
      clauseTitle: "Data Domains and Restrictions",
      clauseText: `This Agreement covers the following data domains: ${params.dataDomains.join(", ")}. Personally identifiable information (PII) is not permitted under this Agreement.`,
      clausePriority: 100,
      policyJson: {
        domains_allowed: params.dataDomains,
        pii_allowed: false,
        phi_allowed: false,
      },
      sourceSection: "4.2",
      extractionMethod: "AI_EXTRACTED",
      validatedBy: null,
      validatedAt: null,
    },
  ];

  if (params.aiEnabled) {
    suggestedClauses.push({
      agreementId,
      clauseId: "DRAFT-CLS-003",
      clauseType: "AI_USE",
      clauseTitle: "Artificial Intelligence Processing",
      clauseText: "AI and machine learning processing is permitted under the following conditions: (1) Human review is required before any AI-generated content is promoted to Executive trust state. (2) All prompts submitted to AI systems and all outputs generated must be logged for audit purposes. (3) AI-generated insights must cite source data and governing agreement clauses.",
      clausePriority: 100,
      policyJson: {
        ai_allowed: true,
        requirements: ["human_in_the_loop_for_executive", "log_prompts_outputs", "cite_sources"],
      },
      sourceSection: "5.1",
      extractionMethod: "AI_EXTRACTED",
      validatedBy: null,
      validatedAt: null,
    });
  }

  suggestedClauses.push({
    agreementId,
    clauseId: "DRAFT-CLS-004",
    clauseType: "CROSS_SHARING",
    clauseTitle: "Cross-Agency Data Sharing",
    clauseText: params.crossAgencySharing
      ? "Cross-agency sharing of aggregated, de-identified data is permitted for government-wide oversight purposes, subject to the data classification requirements of this Agreement."
      : "Cross-agency sharing of raw data is not permitted under this Agreement. Aggregated summaries may be shared with EOTSS for oversight purposes only.",
    clausePriority: 100,
    policyJson: {
      cross_agency_allowed: params.crossAgencySharing,
      aggregation_required: !params.crossAgencySharing,
    },
    sourceSection: "6.1",
    extractionMethod: "AI_EXTRACTED",
    validatedBy: null,
    validatedAt: null,
  });

  return {
    agreementId,
    title,
    suggestedClauses,
  };
}
