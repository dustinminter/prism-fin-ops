# PRISM Governance: Enforcement Integration Pseudo-Code

## Overview

This document provides pseudo-code showing how the PRISM application layer integrates with the Snowflake governance procedures to enforce agreement policies at runtime.

---

## 1. Intelligence Panel Integration

### Request Flow

```typescript
// =============================================================================
// File: server/services/intelligence/governanceEnforcement.ts
// Purpose: Enforce agreement policies on Intelligence Panel queries
// =============================================================================

interface UserContext {
  userId: string;
  userAgency: string;
  userRole: string;
  sessionId: string;
}

interface QueryContext {
  agencyId: string;
  programId?: string;
  secretariatId?: string;
  dataDomains: string[];
}

interface EnforcementResult {
  decision: 'ALLOWED' | 'DENIED' | 'DEGRADED';
  decisionReason: string | null;
  restrictionsApplied: string[];
  agreementsConsidered: string[];
  agreementIdSelected: string | null;
  policyVersionUsed: string | null;
  effectivePolicy: EffectivePolicy | null;
  citations: Citation[];
}

interface EffectivePolicy {
  aiAllowed: boolean;
  piiAllowed: boolean;
  phiAllowed: boolean;
  crossAgencyAllowed: boolean;
  domainsAllowed: string[] | null;
  purposesAllowed: string[] | null;
  fieldsProhibited: string[];
  requirements: string[];
  maxClassification: string;
  maxRetentionDays: number;
}

// -----------------------------------------------------------------------------
// Pre-Query Validation
// Called BEFORE sending question to Cortex AI
// -----------------------------------------------------------------------------
async function validateRequestPreQuery(
  snowflake: SnowflakeConnection,
  requestId: string,
  user: UserContext,
  query: QueryContext,
  questionText: string
): Promise<EnforcementResult> {

  const startTime = Date.now();

  // Call Snowflake procedure to validate request
  const result = await snowflake.call('GOVERNANCE.VALIDATE_REQUEST_PRE_QUERY', [
    requestId,
    user.userId,
    user.userAgency,
    user.userRole,
    query.agencyId,
    query.programId || null,
    query.secretariatId || null,
    query.dataDomains,
    'QUERY',
    questionText
  ]);

  // Parse VARIANT result
  const enforcement: EnforcementResult = JSON.parse(result[0].VALIDATE_REQUEST_PRE_QUERY);

  // Log enforcement check
  console.log(`[GOVERNANCE] Pre-query validation: ${enforcement.decision} in ${Date.now() - startTime}ms`);

  return enforcement;
}

// -----------------------------------------------------------------------------
// Post-Generation Validation
// Called AFTER receiving Cortex AI response, BEFORE returning to user
// -----------------------------------------------------------------------------
async function validateResponsePostGeneration(
  snowflake: SnowflakeConnection,
  requestId: string,
  user: UserContext,
  agreementId: string,
  effectivePolicy: EffectivePolicy,
  responseText: string,
  detectedEntities: DetectedEntity[]
): Promise<PostGenerationResult> {

  // Extract data sources from response metadata
  const dataSources = extractDataSources(responseText);

  const result = await snowflake.call('GOVERNANCE.VALIDATE_RESPONSE_POST_GENERATION', [
    requestId,
    user.userId,
    agreementId,
    effectivePolicy,
    responseText,
    detectedEntities,
    dataSources
  ]);

  const validation: PostGenerationResult = JSON.parse(result[0].VALIDATE_RESPONSE_POST_GENERATION);

  // Apply redactions if needed
  if (validation.redactionsApplied.length > 0) {
    responseText = applyRedactions(responseText, validation.redactionsApplied);
  }

  return {
    ...validation,
    responseText
  };
}
```

### Complete Intelligence Panel Query Handler

```typescript
// =============================================================================
// File: server/api/intelligence/query.ts
// Purpose: Handle Intelligence Panel queries with full governance enforcement
// =============================================================================

export async function handleIntelligenceQuery(
  request: IntelligenceQueryRequest,
  user: UserContext
): Promise<IntelligenceQueryResponse> {

  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    // -------------------------------------------------------------------------
    // LAYER 1: Pre-Query Validation (Hard Controls)
    // -------------------------------------------------------------------------
    const preValidation = await validateRequestPreQuery(
      snowflake,
      requestId,
      user,
      {
        agencyId: request.agencyContext,
        programId: request.programContext,
        secretariatId: request.secretariatContext,
        dataDomains: inferDataDomains(request.question)
      },
      request.question
    );

    // Hard denial - return immediately
    if (preValidation.decision === 'DENIED') {
      await logEnforcementEvent(snowflake, requestId, user, preValidation, null, startTime);

      return {
        success: false,
        error: preValidation.decisionReason,
        governanceBlock: true,
        citations: preValidation.citations
      };
    }

    // -------------------------------------------------------------------------
    // LAYER 2: Construct Governed Prompt
    // -------------------------------------------------------------------------
    const systemPrompt = buildGovernedSystemPrompt(
      request.question,
      preValidation.effectivePolicy,
      preValidation.agreementIdSelected
    );

    // -------------------------------------------------------------------------
    // LAYER 3: Execute Cortex AI Query
    // -------------------------------------------------------------------------
    const cortexResponse = await executeCortexQuery(
      systemPrompt,
      request.question,
      request.agencyContext,
      preValidation.effectivePolicy.domainsAllowed
    );

    // -------------------------------------------------------------------------
    // LAYER 4: Entity Detection (PII/PHI scanning)
    // -------------------------------------------------------------------------
    const detectedEntities = await detectEntities(cortexResponse.text);

    // -------------------------------------------------------------------------
    // LAYER 5: Post-Generation Validation
    // -------------------------------------------------------------------------
    const postValidation = await validateResponsePostGeneration(
      snowflake,
      requestId,
      user,
      preValidation.agreementIdSelected,
      preValidation.effectivePolicy,
      cortexResponse.text,
      detectedEntities
    );

    // Block if PHI detected
    if (postValidation.decision === 'DENIED') {
      await logEnforcementEvent(snowflake, requestId, user, preValidation, postValidation, startTime);

      return {
        success: false,
        error: postValidation.decisionReason,
        governanceBlock: true
      };
    }

    // -------------------------------------------------------------------------
    // LAYER 6: Determine Initial Trust State
    // -------------------------------------------------------------------------
    const initialTrustState = determineInitialTrustState(
      postValidation.maxTrustState,
      postValidation.warnings
    );

    // -------------------------------------------------------------------------
    // LAYER 7: Build Response with Citations
    // -------------------------------------------------------------------------
    const response: IntelligenceQueryResponse = {
      success: true,
      answer: postValidation.responseText,
      trustState: initialTrustState,
      citations: buildCitations(
        preValidation.agreementIdSelected,
        postValidation.citationsRequired,
        cortexResponse.sources
      ),
      restrictions: preValidation.restrictionsApplied.concat(
        postValidation.warnings.map(w => `WARNING: ${w}`)
      ),
      canPromoteToExecutive: initialTrustState === 'CLIENT' &&
        !postValidation.warnings.includes('Human review required before EXECUTIVE promotion'),
      governanceMetadata: {
        agreementId: preValidation.agreementIdSelected,
        policyVersion: preValidation.policyVersionUsed,
        enforcementDecision: postValidation.decision
      }
    };

    // -------------------------------------------------------------------------
    // LAYER 8: Log Enforcement Event
    // -------------------------------------------------------------------------
    await logEnforcementEvent(snowflake, requestId, user, preValidation, postValidation, startTime);

    return response;

  } catch (error) {
    // Log error and return safe response
    console.error(`[GOVERNANCE] Error in query handling: ${error.message}`);

    return {
      success: false,
      error: 'An error occurred processing your request. Please try again.',
      governanceBlock: false
    };
  }
}
```

---

## 2. System Prompt Construction

```typescript
// =============================================================================
// File: server/services/intelligence/promptBuilder.ts
// Purpose: Build governed system prompts that enforce policy at generation time
// =============================================================================

function buildGovernedSystemPrompt(
  userQuestion: string,
  policy: EffectivePolicy,
  agreementId: string
): string {

  const constraints: string[] = [];

  // AI processing constraints
  if (!policy.aiAllowed) {
    // This should not happen (blocked in pre-validation)
    throw new Error('AI processing not allowed by policy');
  }

  // Data domain constraints
  if (policy.domainsAllowed && policy.domainsAllowed.length > 0) {
    constraints.push(
      `You may only reference data from these domains: ${policy.domainsAllowed.join(', ')}.`
    );
  }

  // Purpose constraints
  if (policy.purposesAllowed && policy.purposesAllowed.length > 0) {
    constraints.push(
      `Permitted uses: ${policy.purposesAllowed.join(', ')}. ` +
      `Do not provide analysis for other purposes.`
    );
  }

  // PII constraints
  if (!policy.piiAllowed) {
    constraints.push(
      `CRITICAL: Do not include any personally identifiable information (PII) in your response. ` +
      `This includes names, SSNs, dates of birth, addresses, phone numbers, and email addresses. ` +
      `If such information appears in the data, summarize or aggregate instead.`
    );
  }

  // PHI constraints
  if (!policy.phiAllowed) {
    constraints.push(
      `CRITICAL: Do not include any protected health information (PHI) in your response.`
    );
  }

  // Classification constraints
  if (policy.maxClassification === 'PUBLIC') {
    constraints.push(
      `Your response should be suitable for public disclosure.`
    );
  } else if (policy.maxClassification === 'INTERNAL') {
    constraints.push(
      `Your response is for internal government use only.`
    );
  }

  // Cross-agency constraints
  if (!policy.crossAgencyAllowed) {
    constraints.push(
      `Do not compare or reference data from other agencies.`
    );
  }

  // Citation requirements
  if (policy.requirements.includes('cite_sources')) {
    constraints.push(
      `Always cite the data sources and tables used in your analysis.`
    );
  }

  // Prohibited fields
  if (policy.fieldsProhibited && policy.fieldsProhibited.length > 0) {
    constraints.push(
      `Do not reference or display these fields: ${policy.fieldsProhibited.join(', ')}.`
    );
  }

  // Build final system prompt
  return `You are PRISM Intelligence, an AI assistant for government financial operations.

## Governance Constraints

This response is governed by Data Use Agreement: ${agreementId}

${constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}

## Response Guidelines

- Provide clear, actionable insights based on available data
- Use precise numbers with appropriate rounding for financial figures
- Explain trends and anomalies in plain language
- If you cannot answer due to data restrictions, explain what information would be needed
- Always maintain a professional, objective tone appropriate for government leadership

## User Question

${userQuestion}`;
}
```

---

## 3. Trust State Promotion Workflow

```typescript
// =============================================================================
// File: server/services/trustState/promotionHandler.ts
// Purpose: Handle Trust State promotions with governance checks
// =============================================================================

interface PromotionRequest {
  narrativeId: string;
  currentState: TrustState;
  targetState: TrustState;
  userId: string;
  userRole: string;
  promotionReason?: string;
}

interface PromotionResult {
  success: boolean;
  narrativeId: string;
  newState?: TrustState;
  error?: string;
  blockingRequirements?: string[];
  auditChecksPassed?: string[];
}

async function handleTrustStatePromotion(
  request: PromotionRequest
): Promise<PromotionResult> {

  // -------------------------------------------------------------------------
  // Step 1: Load narrative and its governance context
  // -------------------------------------------------------------------------
  const narrative = await getNarrative(request.narrativeId);

  if (!narrative) {
    return { success: false, narrativeId: request.narrativeId, error: 'Narrative not found' };
  }

  // -------------------------------------------------------------------------
  // Step 2: Get effective policy for this narrative's context
  // -------------------------------------------------------------------------
  const effectivePolicy = await snowflake.call('GOVERNANCE.GET_EFFECTIVE_POLICY', [
    request.userId,
    narrative.userAgency,
    request.userRole,
    narrative.agencyContext,
    narrative.programContext,
    narrative.secretariatContext,
    narrative.dataDomains
  ]);

  // -------------------------------------------------------------------------
  // Step 3: Check promotion is allowed
  // -------------------------------------------------------------------------
  const checkResult = await snowflake.call('GOVERNANCE.CHECK_TRUST_STATE_PROMOTION', [
    request.narrativeId,
    request.currentState,
    request.targetState,
    request.userId,
    request.userRole,
    narrative.governanceMetadata.agreementId,
    JSON.parse(effectivePolicy[0].GET_EFFECTIVE_POLICY)
  ]);

  const check: PromotionCheckResult = JSON.parse(checkResult[0].CHECK_TRUST_STATE_PROMOTION);

  // -------------------------------------------------------------------------
  // Step 4: Handle denial
  // -------------------------------------------------------------------------
  if (check.decision === 'DENIED') {
    // Log the attempted promotion
    await logPromotionAttempt(request, check, false);

    return {
      success: false,
      narrativeId: request.narrativeId,
      error: check.decisionReason,
      blockingRequirements: check.blockingRequirements,
      auditChecksPassed: check.auditChecksPassed
    };
  }

  // -------------------------------------------------------------------------
  // Step 5: Execute promotion
  // -------------------------------------------------------------------------
  await updateNarrativeTrustState(
    request.narrativeId,
    request.targetState,
    request.userId,
    request.promotionReason
  );

  // -------------------------------------------------------------------------
  // Step 6: Log successful promotion
  // -------------------------------------------------------------------------
  await logPromotionAttempt(request, check, true);

  // Log agreement event
  await snowflake.execute(`
    INSERT INTO GOVERNANCE.AGREEMENT_EVENTS (
      event_id, agreement_id, event_type, event_subtype,
      actor_id, actor_role, event_at, details_json
    ) VALUES (
      UUID_STRING(),
      '${narrative.governanceMetadata.agreementId}',
      'POLICY_ENFORCED',
      'TRUST_STATE_PROMOTION',
      '${request.userId}',
      '${request.userRole}',
      CURRENT_TIMESTAMP(),
      PARSE_JSON('${JSON.stringify({
        narrativeId: request.narrativeId,
        fromState: request.currentState,
        toState: request.targetState,
        auditChecksPassed: check.auditChecksPassed
      })}')
    )
  `);

  return {
    success: true,
    narrativeId: request.narrativeId,
    newState: request.targetState,
    auditChecksPassed: check.auditChecksPassed
  };
}
```

---

## 4. Agreement-Aware Default Prompts

```typescript
// =============================================================================
// File: server/services/intelligence/defaultPrompts.ts
// Purpose: Generate context-aware default prompts that respect agreements
// =============================================================================

interface DefaultPrompt {
  id: string;
  category: string;
  label: string;
  prompt: string;
  requiredRole?: string;
  requiredDomains?: string[];
}

async function getDefaultPromptsForContext(
  user: UserContext,
  agencyContext: string,
  programContext?: string
): Promise<DefaultPrompt[]> {

  // Get effective policy to determine what prompts are allowed
  const policyResult = await snowflake.call('GOVERNANCE.GET_EFFECTIVE_POLICY', [
    user.userId,
    user.userAgency,
    user.userRole,
    agencyContext,
    programContext || null,
    null,  // secretariat
    ['CLOUD_COST', 'BILLING', 'CIP_PROGRAM', 'MODERNIZATION_STATUS']  // all domains
  ]);

  const policy: EffectivePolicy = JSON.parse(policyResult[0].GET_EFFECTIVE_POLICY);

  // Base prompts available to all users
  const prompts: DefaultPrompt[] = [];

  // Spending Analysis (requires BILLING or CLOUD_COST domain)
  if (domainAllowed(policy, ['BILLING', 'CLOUD_COST'])) {
    prompts.push({
      id: 'spending-ytd',
      category: 'Spending',
      label: 'YTD Spending Summary',
      prompt: `Summarize year-to-date spending for ${agencyContext}, highlighting any significant variances from plan.`,
      requiredDomains: ['BILLING']
    });

    if (policy.aiAllowed) {
      prompts.push({
        id: 'spending-forecast',
        category: 'Spending',
        label: 'Spending Forecast',
        prompt: `Forecast spending for ${agencyContext} through end of fiscal year with confidence intervals.`,
        requiredDomains: ['BILLING', 'CLOUD_COST']
      });
    }
  }

  // Anomaly Detection (requires AI)
  if (policy.aiAllowed && domainAllowed(policy, ['CLOUD_COST', 'BILLING'])) {
    prompts.push({
      id: 'anomaly-recent',
      category: 'Anomalies',
      label: 'Recent Anomalies',
      prompt: `Identify and explain any spending anomalies for ${agencyContext} in the past 30 days.`,
      requiredDomains: ['CLOUD_COST', 'BILLING']
    });
  }

  // Cross-Agency Comparison (only if allowed)
  if (policy.crossAgencyAllowed) {
    prompts.push({
      id: 'benchmark-comparison',
      category: 'Benchmarking',
      label: 'Peer Agency Comparison',
      prompt: `Compare ${agencyContext} cloud spending efficiency against similar-sized agencies.`,
      requiredDomains: ['CLOUD_COST']
    });
  }

  // Program-specific prompts
  if (programContext && domainAllowed(policy, ['CIP_PROGRAM', 'MODERNIZATION_STATUS'])) {
    prompts.push({
      id: 'program-health',
      category: 'Programs',
      label: 'Program Health Summary',
      prompt: `Provide a health summary for program ${programContext}, including budget status, schedule, and risk indicators.`,
      requiredDomains: ['CIP_PROGRAM', 'MODERNIZATION_STATUS']
    });
  }

  // Executive prompts (role-gated)
  if (['PRISM_ADMIN', 'AGENCY_CIO', 'EOTSS_CFO'].includes(user.userRole)) {
    prompts.push({
      id: 'executive-briefing',
      category: 'Executive',
      label: 'Generate Executive Briefing',
      prompt: `Generate an executive briefing for ${agencyContext} suitable for CIO/CFO presentation.`,
      requiredRole: 'EXECUTIVE'
    });
  }

  return prompts;
}

function domainAllowed(policy: EffectivePolicy, requiredDomains: string[]): boolean {
  if (!policy.domainsAllowed) return true;  // null = all allowed
  return requiredDomains.some(d => policy.domainsAllowed.includes(d));
}
```

---

## 5. UI Integration: Governance Indicators

```typescript
// =============================================================================
// File: components/IntelligencePanel/GovernanceIndicator.tsx
// Purpose: Display governance status and restrictions in UI
// =============================================================================

interface GovernanceIndicatorProps {
  governanceMetadata: {
    agreementId: string | null;
    policyVersion: string | null;
    enforcementDecision: 'ALLOWED' | 'DENIED' | 'DEGRADED';
  };
  restrictions: string[];
  trustState: TrustState;
  canPromoteToExecutive: boolean;
}

function GovernanceIndicator({
  governanceMetadata,
  restrictions,
  trustState,
  canPromoteToExecutive
}: GovernanceIndicatorProps) {

  return (
    <div className="governance-indicator">
      {/* Agreement Badge */}
      <Tooltip content={`Governed by: ${governanceMetadata.agreementId}`}>
        <Badge variant="outline" className="governance-badge">
          <ShieldIcon size={14} />
          <span>Policy: {governanceMetadata.policyVersion}</span>
        </Badge>
      </Tooltip>

      {/* Trust State Badge */}
      <TrustStateBadge state={trustState} />

      {/* Restrictions Warning */}
      {restrictions.length > 0 && (
        <Tooltip content={
          <ul>
            {restrictions.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        }>
          <Badge variant="warning">
            <AlertIcon size={14} />
            <span>{restrictions.length} restriction(s)</span>
          </Badge>
        </Tooltip>
      )}

      {/* Promotion Blocker */}
      {trustState === 'CLIENT' && !canPromoteToExecutive && (
        <Tooltip content="Human review required before promoting to EXECUTIVE">
          <Badge variant="info">
            <UserCheckIcon size={14} />
            <span>Review Required</span>
          </Badge>
        </Tooltip>
      )}
    </div>
  );
}
```

---

## 6. Complete Enforcement Flow Diagram

```
User Question
     │
     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    LAYER 1: Pre-Query Validation                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  GOVERNANCE.VALIDATE_REQUEST_PRE_QUERY()                        │   │
│  │  - Resolve applicable agreements                                 │   │
│  │  - Merge policies (most restrictive wins)                        │   │
│  │  - Check hard controls (AI allowed, cross-agency, domains)       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│              ┌───────────────┼───────────────┐                          │
│              ▼               ▼               ▼                          │
│           ALLOWED         DENIED          DEGRADED                      │
│              │               │               │                          │
│              │          Return Error    Continue with                   │
│              │          + Citations     Restrictions                    │
└──────────────┼───────────────────────────────┼──────────────────────────┘
               │                               │
               ▼                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    LAYER 2: Governed Prompt Construction                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  buildGovernedSystemPrompt()                                    │   │
│  │  - Inject policy constraints into system prompt                  │   │
│  │  - Add domain restrictions, PII rules, citation requirements     │   │
│  │  - Reference governing agreement ID                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└──────────────┬─────────────────────────────────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    LAYER 3: Cortex AI Execution                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Snowflake Cortex COMPLETE() / Intelligence                      │   │
│  │  - Execute query with governed prompt                            │   │
│  │  - AI generates response within prompt constraints               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└──────────────┬─────────────────────────────────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    LAYER 4: Entity Detection                            │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  detectEntities() - PII/PHI Scanner                              │   │
│  │  - Scan response for SSN, DOB, addresses, names                  │   │
│  │  - Scan for PHI if applicable                                    │   │
│  │  - Return detected entities with positions                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└──────────────┬─────────────────────────────────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    LAYER 5: Post-Generation Validation                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  GOVERNANCE.VALIDATE_RESPONSE_POST_GENERATION()                  │   │
│  │  - Check for PII (redact if found, policy allows)                │   │
│  │  - Check for PHI (block if found, policy prohibits)              │   │
│  │  - Determine max trust state                                     │   │
│  │  - Identify required citations                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│              ┌───────────────┼───────────────┐                          │
│              ▼               ▼               ▼                          │
│           ALLOWED         DENIED          DEGRADED                      │
│              │               │               │                          │
│              │          Return Error    Apply Redactions                │
│              │          (PHI blocked)   Continue                        │
└──────────────┼───────────────────────────────┼──────────────────────────┘
               │                               │
               ▼                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    LAYER 6: Trust State Assignment                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  determineInitialTrustState()                                    │   │
│  │  - Start at DRAFT                                                │   │
│  │  - Cap at maxTrustState from policy                              │   │
│  │  - Apply human-in-the-loop requirements                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└──────────────┬─────────────────────────────────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    LAYER 7: Response Construction                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Build final response with:                                      │   │
│  │  - Validated/redacted answer text                                │   │
│  │  - Trust state badge                                             │   │
│  │  - Agreement citations                                           │   │
│  │  - Restriction warnings                                          │   │
│  │  - Promotion eligibility flag                                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└──────────────┬─────────────────────────────────────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    LAYER 8: Enforcement Logging                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  GOVERNANCE.LOG_ENFORCEMENT_EVENT()                              │   │
│  │  - Immutable audit record                                        │   │
│  │  - All agreements considered                                     │   │
│  │  - Decision and reasoning                                        │   │
│  │  - Restrictions applied                                          │   │
│  │  - Processing time                                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└──────────────┬─────────────────────────────────────────────────────────┘
               │
               ▼
         Return to User
```

---

## 7. Error Handling and Fallbacks

```typescript
// =============================================================================
// File: server/services/intelligence/errorHandling.ts
// Purpose: Handle governance enforcement errors gracefully
// =============================================================================

async function handleGovernanceError(
  error: Error,
  requestId: string,
  user: UserContext,
  fallbackBehavior: 'DENY' | 'DEGRADE' | 'ALLOW_WITH_WARNING'
): Promise<GovernanceErrorResponse> {

  // Log error for debugging
  console.error(`[GOVERNANCE] Enforcement error: ${error.message}`, {
    requestId,
    userId: user.userId,
    stack: error.stack
  });

  // Attempt to log to enforcement log (best effort)
  try {
    await snowflake.call('GOVERNANCE.LOG_ENFORCEMENT_EVENT', [
      requestId,
      user.userId,
      user.userRole,
      user.userAgency,
      null, null,  // context unknown
      [],  // no agreements resolved
      null, null,  // no policy
      'QUERY',
      null,  // question unknown
      'DENIED',
      `Enforcement error: ${error.message}`,
      ['ERROR_FALLBACK'],
      null, [], null,
      0
    ]);
  } catch (logError) {
    console.error(`[GOVERNANCE] Failed to log enforcement error: ${logError.message}`);
  }

  // Apply fallback behavior
  switch (fallbackBehavior) {
    case 'DENY':
      return {
        decision: 'DENIED',
        error: 'Unable to verify data use permissions. Please try again or contact support.',
        governanceBlock: true
      };

    case 'DEGRADE':
      return {
        decision: 'DEGRADED',
        warning: 'Governance check encountered an error. Response limited to public data only.',
        restrictedDomains: ['PUBLIC'],
        governanceBlock: false
      };

    case 'ALLOW_WITH_WARNING':
      return {
        decision: 'ALLOWED',
        warning: 'Governance check unavailable. Response not governed by agreement policy.',
        governanceBlock: false,
        auditNote: 'GOVERNANCE_BYPASS: Error fallback applied'
      };
  }
}
```

---

## Summary

This pseudo-code demonstrates the complete integration between PRISM's application layer and the Snowflake governance procedures. Key features:

1. **Three-Layer Enforcement**: Pre-query, in-prompt, and post-generation validation
2. **Most Restrictive Wins**: Policy merging ensures the strictest constraints apply
3. **Immutable Audit Trail**: Every enforcement decision is logged
4. **Graceful Degradation**: System fails safely when governance cannot be verified
5. **Trust State Integration**: AI outputs start at DRAFT and require governed promotion
6. **UI Transparency**: Users see governance badges, restrictions, and citations

The governance enforcement is transparent, auditable, and aligned with government compliance requirements.
