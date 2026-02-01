-- ============================================================================
-- PRISM GOVERNANCE: AGREEMENT MANAGEMENT SCHEMA
-- ============================================================================
-- Version: 1.0.0
-- Purpose: Canonical registry for MOUs, DULAs, and governance enforcement
-- Compliance: Designed for state/federal data sharing governance
-- ============================================================================

USE DATABASE FEDERAL_FINANCIAL_DATA;

-- Create dedicated schema for governance objects
CREATE SCHEMA IF NOT EXISTS GOVERNANCE
    DATA_RETENTION_TIME_IN_DAYS = 90
    COMMENT = 'Agreement metadata, policy enforcement, and audit trail';

USE SCHEMA GOVERNANCE;

-- ============================================================================
-- TABLE A: AGREEMENTS (Master Registry)
-- ============================================================================
-- Purpose: Canonical record for every MOU, DULA, addendum, amendment, appendix
-- ============================================================================

CREATE OR REPLACE TABLE GOVERNANCE.AGREEMENTS (
    -- Primary Key
    agreement_id                VARCHAR(64) NOT NULL PRIMARY KEY
                                COMMENT 'UUID primary key',

    -- Agreement Classification
    agreement_type              VARCHAR(20) NOT NULL
                                COMMENT 'MOU, DULA, ADDENDUM, AMENDMENT, APPENDIX',
    agreement_title             VARCHAR(500) NOT NULL
                                COMMENT 'Human-readable title',

    -- Organizational Context
    agency_id                   VARCHAR(32)
                                COMMENT 'Primary agency identifier',
    secretariat_id              VARCHAR(32)
                                COMMENT 'Secretariat identifier if applicable',
    counterparty_type           VARCHAR(20) NOT NULL
                                COMMENT 'AGENCY, EOTSS, VENDOR, FEDERAL, OTHER',
    counterparty_name           VARCHAR(255) NOT NULL
                                COMMENT 'Name of the other party',

    -- Program/Initiative Linkage
    program_id                  VARCHAR(64)
                                COMMENT 'CIP program or initiative identifier',
    initiative_id               VARCHAR(64)
                                COMMENT 'Specific initiative identifier',

    -- Temporal Boundaries
    effective_date              DATE NOT NULL
                                COMMENT 'Date agreement becomes effective',
    expiration_date             DATE
                                COMMENT 'Date agreement expires (null = perpetual)',

    -- Status and Lifecycle
    status                      VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
                                COMMENT 'DRAFT, IN_REVIEW, EXECUTED, EXPIRED, SUPERSEDED, TERMINATED',

    -- Legal Framework
    jurisdiction                VARCHAR(10) DEFAULT 'MA'
                                COMMENT 'Governing jurisdiction',
    governing_law               VARCHAR(100)
                                COMMENT 'Specific governing law reference',

    -- Ownership and Accountability
    owner_org                   VARCHAR(20) NOT NULL
                                COMMENT 'EOTSS, AGENCY, or JOINT',
    agreement_owner             VARCHAR(255) NOT NULL
                                COMMENT 'Person or role responsible',
    legal_owner                 VARCHAR(255)
                                COMMENT 'Legal counsel name or role mailbox',

    -- Versioning
    version_current             VARCHAR(20) DEFAULT '1.0'
                                COMMENT 'Current version (e.g., 1.0, 2.1)',
    supersedes_agreement_id     VARCHAR(64)
                                COMMENT 'FK to agreement this supersedes',
    parent_agreement_id         VARCHAR(64)
                                COMMENT 'FK to parent (for addenda/amendments)',

    -- Document Storage
    document_format             VARCHAR(10)
                                COMMENT 'PDF, DOCX, TXT, HTML',
    document_uri                VARCHAR(1000)
                                COMMENT 'Snowflake stage path or object store pointer',
    document_hash_sha256        VARCHAR(64)
                                COMMENT 'SHA-256 hash for integrity verification',

    -- Governance Constraints
    data_domains                ARRAY
                                COMMENT 'Allowed data domains (CLOUD_COST, BILLING, ERP_GL, etc.)',
    data_classification_max     VARCHAR(20) DEFAULT 'INTERNAL'
                                COMMENT 'PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED',
    pii_allowed                 BOOLEAN DEFAULT FALSE
                                COMMENT 'Whether PII processing is permitted',
    phi_allowed                 BOOLEAN DEFAULT FALSE
                                COMMENT 'Whether PHI processing is permitted',
    sensitive_programs          ARRAY
                                COMMENT 'Programs requiring elevated handling',
    cross_agency_sharing_allowed BOOLEAN DEFAULT FALSE
                                COMMENT 'Whether cross-agency data sharing is permitted',
    subprocessor_allowed        BOOLEAN DEFAULT FALSE
                                COMMENT 'Whether subprocessors can access data',
    ai_processing_allowed       BOOLEAN DEFAULT TRUE
                                COMMENT 'Whether AI/ML processing is permitted',
    ai_restrictions_summary     VARCHAR(2000)
                                COMMENT 'Plain-language summary of AI restrictions',

    -- Audit Metadata
    created_at                  TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
                                COMMENT 'Record creation timestamp',
    updated_at                  TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
                                COMMENT 'Last update timestamp',
    created_by                  VARCHAR(255) NOT NULL
                                COMMENT 'User who created the record',
    updated_by                  VARCHAR(255)
                                COMMENT 'User who last updated the record',

    -- Constraints
    CONSTRAINT chk_agreement_type CHECK (agreement_type IN ('MOU', 'DULA', 'ADDENDUM', 'AMENDMENT', 'APPENDIX')),
    CONSTRAINT chk_counterparty_type CHECK (counterparty_type IN ('AGENCY', 'EOTSS', 'VENDOR', 'FEDERAL', 'OTHER')),
    CONSTRAINT chk_status CHECK (status IN ('DRAFT', 'IN_REVIEW', 'EXECUTED', 'EXPIRED', 'SUPERSEDED', 'TERMINATED')),
    CONSTRAINT chk_owner_org CHECK (owner_org IN ('EOTSS', 'AGENCY', 'JOINT')),
    CONSTRAINT chk_classification CHECK (data_classification_max IN ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED')),
    CONSTRAINT chk_dates CHECK (expiration_date IS NULL OR expiration_date >= effective_date)
)
CLUSTER BY (agency_id, status)
COMMENT = 'Master registry of all MOUs, DULAs, and related agreements';

-- Self-referential foreign keys (added after table creation)
ALTER TABLE GOVERNANCE.AGREEMENTS ADD CONSTRAINT fk_supersedes
    FOREIGN KEY (supersedes_agreement_id) REFERENCES GOVERNANCE.AGREEMENTS(agreement_id);
ALTER TABLE GOVERNANCE.AGREEMENTS ADD CONSTRAINT fk_parent
    FOREIGN KEY (parent_agreement_id) REFERENCES GOVERNANCE.AGREEMENTS(agreement_id);


-- ============================================================================
-- TABLE B: AGREEMENT_PARTIES (Multi-Party Support)
-- ============================================================================
-- Purpose: Support multi-party agreements with role clarity
-- ============================================================================

CREATE OR REPLACE TABLE GOVERNANCE.AGREEMENT_PARTIES (
    agreement_id                VARCHAR(64) NOT NULL
                                COMMENT 'FK to AGREEMENTS',
    party_id                    VARCHAR(64) NOT NULL
                                COMMENT 'Unique identifier for the party',
    party_name                  VARCHAR(255) NOT NULL
                                COMMENT 'Legal name of the party',
    party_role                  VARCHAR(20) NOT NULL
                                COMMENT 'DATA_PROVIDER, DATA_CONSUMER, PROCESSOR, CONTROLLER, SPONSOR',
    signatory_role              VARCHAR(255)
                                COMMENT 'Title/role of signatory',
    signatory_name              VARCHAR(255)
                                COMMENT 'Name of signatory',
    signatory_date              DATE
                                COMMENT 'Date signed by this party',
    contact_role_mailbox        VARCHAR(255)
                                COMMENT 'Contact email for agreement matters',

    -- Audit
    created_at                  TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),

    -- Constraints
    PRIMARY KEY (agreement_id, party_id),
    CONSTRAINT fk_agreement FOREIGN KEY (agreement_id) REFERENCES GOVERNANCE.AGREEMENTS(agreement_id),
    CONSTRAINT chk_party_role CHECK (party_role IN ('DATA_PROVIDER', 'DATA_CONSUMER', 'PROCESSOR', 'CONTROLLER', 'SPONSOR'))
)
COMMENT = 'Parties to each agreement with roles and signatories';


-- ============================================================================
-- TABLE C: AGREEMENT_CLAUSES (Structured Clause Library)
-- ============================================================================
-- Purpose: Enforceable policy objects extracted from agreement text
-- ============================================================================

CREATE OR REPLACE TABLE GOVERNANCE.AGREEMENT_CLAUSES (
    agreement_id                VARCHAR(64) NOT NULL
                                COMMENT 'FK to AGREEMENTS',
    clause_id                   VARCHAR(64) NOT NULL
                                COMMENT 'UUID for this clause',

    -- Clause Classification
    clause_type                 VARCHAR(30) NOT NULL
                                COMMENT 'Type of clause for policy mapping',
    clause_title                VARCHAR(255)
                                COMMENT 'Section title from document',
    clause_text                 VARCHAR(16000) NOT NULL
                                COMMENT 'Full text of the clause',

    -- Temporal and Priority
    clause_effective_date       DATE
                                COMMENT 'When this clause becomes effective',
    clause_expiration_date      DATE
                                COMMENT 'When this clause expires (if different from agreement)',
    clause_priority             INTEGER DEFAULT 100
                                COMMENT 'Higher value wins in conflicts',

    -- Machine-Readable Policy
    policy_json                 VARIANT
                                COMMENT 'Structured policy constraints (see schema)',

    -- Source Provenance
    source_page                 INTEGER
                                COMMENT 'Page number in source document',
    source_section              VARCHAR(100)
                                COMMENT 'Section reference (e.g., 4.2.1)',

    -- Extraction Metadata
    extraction_method           VARCHAR(20) DEFAULT 'MANUAL'
                                COMMENT 'MANUAL, AI_EXTRACTED, HYBRID',
    extracted_confidence        FLOAT DEFAULT 1.0
                                COMMENT 'Confidence score 0-1 for AI extraction',
    requires_human_validation   BOOLEAN DEFAULT FALSE
                                COMMENT 'Flag for clauses needing review',
    validated_by                VARCHAR(255)
                                COMMENT 'Who validated this clause',
    validated_at                TIMESTAMP_NTZ
                                COMMENT 'When validated',

    -- Audit
    created_at                  TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    updated_at                  TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    created_by                  VARCHAR(255) NOT NULL,

    -- Constraints
    PRIMARY KEY (agreement_id, clause_id),
    CONSTRAINT fk_clause_agreement FOREIGN KEY (agreement_id) REFERENCES GOVERNANCE.AGREEMENTS(agreement_id),
    CONSTRAINT chk_clause_type CHECK (clause_type IN (
        'PURPOSE_LIMITATION', 'DATA_SCOPE', 'RETENTION', 'DISCLOSURE', 'SECURITY',
        'ACCESS_CONTROL', 'AI_USE', 'AUDIT', 'BREACH', 'CROSS_SHARING',
        'EXPORT', 'SUBPROCESSORS', 'TERMINATION', 'INDEMNIFICATION', 'LIABILITY',
        'AMENDMENT', 'GOVERNING_LAW', 'DISPUTE_RESOLUTION', 'GENERAL'
    )),
    CONSTRAINT chk_extraction_method CHECK (extraction_method IN ('MANUAL', 'AI_EXTRACTED', 'HYBRID')),
    CONSTRAINT chk_confidence CHECK (extracted_confidence >= 0 AND extracted_confidence <= 1)
)
CLUSTER BY (agreement_id, clause_type)
COMMENT = 'Structured clause library with machine-readable policy constraints';


-- ============================================================================
-- TABLE D: AGREEMENT_POLICY (Compiled Enforcement Policy)
-- ============================================================================
-- Purpose: Precompiled, validated policy for fast runtime enforcement
-- ============================================================================

CREATE OR REPLACE TABLE GOVERNANCE.AGREEMENT_POLICY (
    agreement_id                VARCHAR(64) NOT NULL
                                COMMENT 'FK to AGREEMENTS',
    policy_version              VARCHAR(20) NOT NULL
                                COMMENT 'Version of compiled policy',

    -- Compiled Policy
    compiled_policy_json        VARIANT NOT NULL
                                COMMENT 'Complete compiled policy object',

    -- Compilation Metadata
    compiled_at                 TIMESTAMP_NTZ NOT NULL
                                COMMENT 'When policy was compiled',
    compiled_by                 VARCHAR(255) NOT NULL
                                COMMENT 'System or user that compiled',
    compilation_notes           VARCHAR(2000)
                                COMMENT 'Notes from compilation process',

    -- Validation Workflow
    validation_status           VARCHAR(20) DEFAULT 'PENDING'
                                COMMENT 'PENDING, VALIDATED, REJECTED',
    validated_by                VARCHAR(255)
                                COMMENT 'Who validated the compiled policy',
    validated_at                TIMESTAMP_NTZ
                                COMMENT 'When validated',
    validation_notes            VARCHAR(2000)
                                COMMENT 'Validation feedback',

    -- Activation
    is_active                   BOOLEAN DEFAULT FALSE
                                COMMENT 'Whether this is the active policy version',
    activated_at                TIMESTAMP_NTZ
                                COMMENT 'When activated for enforcement',

    -- Audit
    created_at                  TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),

    -- Constraints
    PRIMARY KEY (agreement_id, policy_version),
    CONSTRAINT fk_policy_agreement FOREIGN KEY (agreement_id) REFERENCES GOVERNANCE.AGREEMENTS(agreement_id),
    CONSTRAINT chk_validation_status CHECK (validation_status IN ('PENDING', 'VALIDATED', 'REJECTED'))
)
COMMENT = 'Compiled and validated policy objects for runtime enforcement';


-- ============================================================================
-- TABLE E: AGREEMENT_INDEX (Search and Retrieval)
-- ============================================================================
-- Purpose: Chunked text with vector embeddings for semantic search
-- ============================================================================

CREATE OR REPLACE TABLE GOVERNANCE.AGREEMENT_INDEX (
    agreement_id                VARCHAR(64) NOT NULL
                                COMMENT 'FK to AGREEMENTS',
    chunk_id                    VARCHAR(64) NOT NULL
                                COMMENT 'UUID for this chunk',

    -- Chunk Content
    chunk_text                  VARCHAR(8000) NOT NULL
                                COMMENT 'Text content of this chunk',
    chunk_sequence              INTEGER NOT NULL
                                COMMENT 'Order within document',

    -- Vector Embedding
    chunk_vector                VECTOR(FLOAT, 1536)
                                COMMENT 'Embedding vector for semantic search',
    embedding_model             VARCHAR(100) DEFAULT 'e5-base-v2'
                                COMMENT 'Model used for embedding',

    -- Source Provenance
    page_number                 INTEGER
                                COMMENT 'Page number in source document',
    section_label               VARCHAR(100)
                                COMMENT 'Section reference',

    -- Integrity
    chunk_hash                  VARCHAR(64)
                                COMMENT 'SHA-256 hash of chunk text',

    -- Audit
    indexed_at                  TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    indexed_by                  VARCHAR(255),

    -- Constraints
    PRIMARY KEY (agreement_id, chunk_id),
    CONSTRAINT fk_index_agreement FOREIGN KEY (agreement_id) REFERENCES GOVERNANCE.AGREEMENTS(agreement_id)
)
CLUSTER BY (agreement_id)
COMMENT = 'Chunked and embedded agreement text for semantic search';

-- Create vector similarity search index
-- Note: Syntax may vary based on Snowflake version
-- ALTER TABLE GOVERNANCE.AGREEMENT_INDEX ADD SEARCH OPTIMIZATION ON EQUALITY(agreement_id);


-- ============================================================================
-- TABLE F: AGREEMENT_EVENTS (Audit Trail)
-- ============================================================================
-- Purpose: Immutable audit log of all agreement lifecycle events
-- ============================================================================

CREATE OR REPLACE TABLE GOVERNANCE.AGREEMENT_EVENTS (
    event_id                    VARCHAR(64) NOT NULL PRIMARY KEY
                                COMMENT 'UUID for this event',
    agreement_id                VARCHAR(64) NOT NULL
                                COMMENT 'FK to AGREEMENTS',

    -- Event Classification
    event_type                  VARCHAR(30) NOT NULL
                                COMMENT 'Type of event',
    event_subtype               VARCHAR(50)
                                COMMENT 'More specific event classification',

    -- Actor
    actor_id                    VARCHAR(255) NOT NULL
                                COMMENT 'User or system that caused event',
    actor_role                  VARCHAR(100)
                                COMMENT 'Role of actor at time of event',
    actor_ip                    VARCHAR(45)
                                COMMENT 'IP address if applicable',

    -- Event Details
    event_at                    TIMESTAMP_NTZ NOT NULL DEFAULT CURRENT_TIMESTAMP()
                                COMMENT 'When event occurred',
    details_json                VARIANT
                                COMMENT 'Structured event details',

    -- Change Tracking
    field_changed               VARCHAR(100)
                                COMMENT 'Field that changed (for updates)',
    old_value                   VARCHAR(4000)
                                COMMENT 'Previous value',
    new_value                   VARCHAR(4000)
                                COMMENT 'New value',

    -- Constraints
    CONSTRAINT fk_event_agreement FOREIGN KEY (agreement_id) REFERENCES GOVERNANCE.AGREEMENTS(agreement_id),
    CONSTRAINT chk_event_type CHECK (event_type IN (
        'CREATED', 'UPDATED', 'UPLOADED', 'EXTRACTED', 'COMPILED',
        'VALIDATED', 'ACTIVATED', 'DEACTIVATED', 'SUPERSEDED', 'EXPIRED',
        'TERMINATED', 'ACCESSED', 'EXPORTED', 'POLICY_ENFORCED', 'VIOLATION_DETECTED'
    ))
)
CLUSTER BY (agreement_id, event_at)
DATA_RETENTION_TIME_IN_DAYS = 2555  -- 7 years for compliance
COMMENT = 'Immutable audit trail for agreement lifecycle events';


-- ============================================================================
-- TABLE G: POLICY_ENFORCEMENT_LOG (Runtime Enforcement Audit)
-- ============================================================================
-- Purpose: Log every policy check for compliance and debugging
-- ============================================================================

CREATE OR REPLACE TABLE GOVERNANCE.POLICY_ENFORCEMENT_LOG (
    log_id                      VARCHAR(64) NOT NULL PRIMARY KEY
                                COMMENT 'UUID for this log entry',

    -- Request Context
    request_id                  VARCHAR(64) NOT NULL
                                COMMENT 'Correlation ID for the request',
    request_timestamp           TIMESTAMP_NTZ NOT NULL DEFAULT CURRENT_TIMESTAMP()
                                COMMENT 'When request was made',

    -- User Context
    user_id                     VARCHAR(255) NOT NULL
                                COMMENT 'User making the request',
    user_role                   VARCHAR(100)
                                COMMENT 'User role',
    user_agency                 VARCHAR(32)
                                COMMENT 'User agency context',

    -- Query Context
    agency_context              VARCHAR(32)
                                COMMENT 'Agency being queried',
    program_context             VARCHAR(64)
                                COMMENT 'Program being queried',
    secretariat_context         VARCHAR(32)
                                COMMENT 'Secretariat context',

    -- Agreement Resolution
    agreements_considered       ARRAY
                                COMMENT 'All agreement IDs considered',
    agreement_id_selected       VARCHAR(64)
                                COMMENT 'Primary agreement applied',
    policy_version_used         VARCHAR(20)
                                COMMENT 'Version of policy applied',

    -- Request Details
    request_type                VARCHAR(50)
                                COMMENT 'QUERY, GENERATION, PROMOTION, EXPORT',
    question_text               VARCHAR(4000)
                                COMMENT 'User question or request',
    tools_invoked               ARRAY
                                COMMENT 'Tools/functions called',
    queries_executed            ARRAY
                                COMMENT 'SQL queries executed',

    -- Policy Decision
    decision                    VARCHAR(20) NOT NULL
                                COMMENT 'ALLOWED, DENIED, DEGRADED',
    decision_reason             VARCHAR(2000)
                                COMMENT 'Explanation of decision',
    restrictions_applied        ARRAY
                                COMMENT 'Specific restrictions enforced',

    -- Response Details
    response_text               VARCHAR(16000)
                                COMMENT 'AI response (truncated if needed)',
    citations                   ARRAY
                                COMMENT 'Agreement clause citations',
    trust_state_output          VARCHAR(20)
                                COMMENT 'Trust state of output',

    -- Action Taken
    action_taken                VARCHAR(100)
                                COMMENT 'Action if any (create_narrative, notify, escalate)',
    action_details              VARIANT
                                COMMENT 'Details of action taken',

    -- Performance
    processing_time_ms          INTEGER
                                COMMENT 'Time to process request',

    -- Constraints
    CONSTRAINT chk_decision CHECK (decision IN ('ALLOWED', 'DENIED', 'DEGRADED'))
)
CLUSTER BY (request_timestamp, user_id)
DATA_RETENTION_TIME_IN_DAYS = 365
COMMENT = 'Runtime policy enforcement audit log';


-- ============================================================================
-- VIEWS FOR COMMON ACCESS PATTERNS
-- ============================================================================

-- Active executed agreements by agency
CREATE OR REPLACE SECURE VIEW GOVERNANCE.V_ACTIVE_AGREEMENTS AS
SELECT
    a.*,
    DATEDIFF('day', CURRENT_DATE(), a.expiration_date) AS days_until_expiration,
    CASE
        WHEN a.expiration_date IS NULL THEN 'PERPETUAL'
        WHEN DATEDIFF('day', CURRENT_DATE(), a.expiration_date) <= 30 THEN 'EXPIRING_SOON'
        WHEN DATEDIFF('day', CURRENT_DATE(), a.expiration_date) <= 90 THEN 'REVIEW_NEEDED'
        ELSE 'ACTIVE'
    END AS expiration_status
FROM GOVERNANCE.AGREEMENTS a
WHERE a.status = 'EXECUTED'
  AND (a.expiration_date IS NULL OR a.expiration_date >= CURRENT_DATE());

-- Agreement with compiled policy (for enforcement)
CREATE OR REPLACE SECURE VIEW GOVERNANCE.V_ENFORCEABLE_AGREEMENTS AS
SELECT
    a.agreement_id,
    a.agreement_type,
    a.agreement_title,
    a.agency_id,
    a.secretariat_id,
    a.program_id,
    a.status,
    a.effective_date,
    a.expiration_date,
    a.data_domains,
    a.data_classification_max,
    a.pii_allowed,
    a.phi_allowed,
    a.cross_agency_sharing_allowed,
    a.ai_processing_allowed,
    a.ai_restrictions_summary,
    p.policy_version,
    p.compiled_policy_json,
    p.validated_at AS policy_validated_at
FROM GOVERNANCE.AGREEMENTS a
JOIN GOVERNANCE.AGREEMENT_POLICY p
    ON a.agreement_id = p.agreement_id
WHERE a.status = 'EXECUTED'
  AND p.is_active = TRUE
  AND p.validation_status = 'VALIDATED'
  AND (a.expiration_date IS NULL OR a.expiration_date >= CURRENT_DATE());

-- Clause summary by agreement
CREATE OR REPLACE VIEW GOVERNANCE.V_AGREEMENT_CLAUSE_SUMMARY AS
SELECT
    a.agreement_id,
    a.agreement_title,
    a.agency_id,
    COUNT(c.clause_id) AS total_clauses,
    COUNT(CASE WHEN c.clause_type = 'AI_USE' THEN 1 END) AS ai_clauses,
    COUNT(CASE WHEN c.clause_type = 'DATA_SCOPE' THEN 1 END) AS data_scope_clauses,
    COUNT(CASE WHEN c.clause_type = 'CROSS_SHARING' THEN 1 END) AS sharing_clauses,
    COUNT(CASE WHEN c.requires_human_validation AND c.validated_at IS NULL THEN 1 END) AS pending_validation,
    MIN(c.clause_priority) AS min_priority,
    MAX(c.clause_priority) AS max_priority
FROM GOVERNANCE.AGREEMENTS a
LEFT JOIN GOVERNANCE.AGREEMENT_CLAUSES c ON a.agreement_id = c.agreement_id
GROUP BY a.agreement_id, a.agreement_title, a.agency_id;


-- ============================================================================
-- INDEXES AND SEARCH OPTIMIZATION
-- ============================================================================

-- Enable search optimization for common queries
ALTER TABLE GOVERNANCE.AGREEMENTS ADD SEARCH OPTIMIZATION
    ON EQUALITY(agency_id, status, agreement_type);

ALTER TABLE GOVERNANCE.AGREEMENT_CLAUSES ADD SEARCH OPTIMIZATION
    ON EQUALITY(agreement_id, clause_type);

ALTER TABLE GOVERNANCE.POLICY_ENFORCEMENT_LOG ADD SEARCH OPTIMIZATION
    ON EQUALITY(user_id, agreement_id_selected, decision);


-- ============================================================================
-- RBAC: ROLES AND GRANTS
-- ============================================================================

-- Create governance-specific roles
CREATE ROLE IF NOT EXISTS GOVERNANCE_ADMIN
    COMMENT = 'Full access to governance schema';

CREATE ROLE IF NOT EXISTS GOVERNANCE_EDITOR
    COMMENT = 'Can create and edit agreements, cannot validate policies';

CREATE ROLE IF NOT EXISTS GOVERNANCE_VALIDATOR
    COMMENT = 'Can validate compiled policies';

CREATE ROLE IF NOT EXISTS GOVERNANCE_VIEWER
    COMMENT = 'Read-only access to agreements and policies';

CREATE ROLE IF NOT EXISTS GOVERNANCE_ENFORCER
    COMMENT = 'Service account for runtime policy enforcement';

-- Grant schema access
GRANT USAGE ON SCHEMA GOVERNANCE TO ROLE GOVERNANCE_ADMIN;
GRANT USAGE ON SCHEMA GOVERNANCE TO ROLE GOVERNANCE_EDITOR;
GRANT USAGE ON SCHEMA GOVERNANCE TO ROLE GOVERNANCE_VALIDATOR;
GRANT USAGE ON SCHEMA GOVERNANCE TO ROLE GOVERNANCE_VIEWER;
GRANT USAGE ON SCHEMA GOVERNANCE TO ROLE GOVERNANCE_ENFORCER;

-- Admin: full access
GRANT ALL ON ALL TABLES IN SCHEMA GOVERNANCE TO ROLE GOVERNANCE_ADMIN;
GRANT ALL ON ALL VIEWS IN SCHEMA GOVERNANCE TO ROLE GOVERNANCE_ADMIN;
GRANT ALL ON FUTURE TABLES IN SCHEMA GOVERNANCE TO ROLE GOVERNANCE_ADMIN;

-- Editor: create and modify agreements
GRANT SELECT, INSERT, UPDATE ON TABLE GOVERNANCE.AGREEMENTS TO ROLE GOVERNANCE_EDITOR;
GRANT SELECT, INSERT, UPDATE ON TABLE GOVERNANCE.AGREEMENT_PARTIES TO ROLE GOVERNANCE_EDITOR;
GRANT SELECT, INSERT, UPDATE ON TABLE GOVERNANCE.AGREEMENT_CLAUSES TO ROLE GOVERNANCE_EDITOR;
GRANT SELECT, INSERT ON TABLE GOVERNANCE.AGREEMENT_INDEX TO ROLE GOVERNANCE_EDITOR;
GRANT SELECT, INSERT ON TABLE GOVERNANCE.AGREEMENT_EVENTS TO ROLE GOVERNANCE_EDITOR;
GRANT SELECT ON TABLE GOVERNANCE.AGREEMENT_POLICY TO ROLE GOVERNANCE_EDITOR;

-- Validator: can validate policies
GRANT SELECT, UPDATE ON TABLE GOVERNANCE.AGREEMENT_POLICY TO ROLE GOVERNANCE_VALIDATOR;
GRANT SELECT ON TABLE GOVERNANCE.AGREEMENTS TO ROLE GOVERNANCE_VALIDATOR;
GRANT SELECT ON TABLE GOVERNANCE.AGREEMENT_CLAUSES TO ROLE GOVERNANCE_VALIDATOR;
GRANT INSERT ON TABLE GOVERNANCE.AGREEMENT_EVENTS TO ROLE GOVERNANCE_VALIDATOR;

-- Viewer: read-only
GRANT SELECT ON ALL TABLES IN SCHEMA GOVERNANCE TO ROLE GOVERNANCE_VIEWER;
GRANT SELECT ON ALL VIEWS IN SCHEMA GOVERNANCE TO ROLE GOVERNANCE_VIEWER;

-- Enforcer: runtime access for policy checks
GRANT SELECT ON VIEW GOVERNANCE.V_ENFORCEABLE_AGREEMENTS TO ROLE GOVERNANCE_ENFORCER;
GRANT SELECT ON VIEW GOVERNANCE.V_ACTIVE_AGREEMENTS TO ROLE GOVERNANCE_ENFORCER;
GRANT INSERT ON TABLE GOVERNANCE.POLICY_ENFORCEMENT_LOG TO ROLE GOVERNANCE_ENFORCER;

-- Grant roles to PRISM roles
GRANT ROLE GOVERNANCE_VIEWER TO ROLE PRISM_VIEWER;
GRANT ROLE GOVERNANCE_EDITOR TO ROLE PRISM_ANALYST;
GRANT ROLE GOVERNANCE_VALIDATOR TO ROLE PRISM_ANALYST;
GRANT ROLE GOVERNANCE_ADMIN TO ROLE PRISM_ADMIN;
GRANT ROLE GOVERNANCE_ENFORCER TO ROLE PRISM_SERVICE;


-- ============================================================================
-- SAMPLE DATA: Reference Agreement Template
-- ============================================================================

-- Insert a template DULA for reference
INSERT INTO GOVERNANCE.AGREEMENTS (
    agreement_id,
    agreement_type,
    agreement_title,
    agency_id,
    counterparty_type,
    counterparty_name,
    effective_date,
    expiration_date,
    status,
    owner_org,
    agreement_owner,
    legal_owner,
    version_current,
    document_format,
    data_domains,
    data_classification_max,
    pii_allowed,
    phi_allowed,
    cross_agency_sharing_allowed,
    ai_processing_allowed,
    ai_restrictions_summary,
    created_by
) VALUES (
    'AGR-TEMPLATE-001',
    'DULA',
    'PRISM FinOps Intelligence Data Use and License Agreement (Template)',
    NULL,  -- Template, no specific agency
    'EOTSS',
    'Executive Office of Technology Services and Security',
    '2026-01-01',
    '2028-12-31',
    'DRAFT',
    'EOTSS',
    'PRISM Program Office',
    'EOTSS General Counsel',
    '1.0',
    'DOCX',
    ARRAY_CONSTRUCT('CLOUD_COST', 'BILLING', 'CIP_PROGRAM', 'MODERNIZATION_STATUS'),
    'CONFIDENTIAL',
    FALSE,
    FALSE,
    FALSE,
    TRUE,
    'AI processing permitted for forecasting, anomaly detection, and executive narrative generation. Human-in-the-loop required for executive-level outputs. All prompts and outputs must be logged. No automated decision-making without human review.',
    'SYSTEM'
);

-- Insert template clauses
INSERT INTO GOVERNANCE.AGREEMENT_CLAUSES (agreement_id, clause_id, clause_type, clause_title, clause_text, clause_priority, policy_json, created_by)
VALUES
('AGR-TEMPLATE-001', 'CLS-001', 'PURPOSE_LIMITATION', 'Permitted Purposes',
 'Data provided under this Agreement may only be used for: (a) modernization program oversight, (b) financial operations forecasting, (c) spending anomaly detection, (d) executive reporting and narrative generation. Data shall not be used for personnel evaluation, law enforcement purposes, or marketing activities.',
 100,
 PARSE_JSON('{
   "allowed": ["modernization_oversight", "finops_forecasting", "anomaly_detection", "executive_reporting"],
   "prohibited": ["personnel_evaluation", "law_enforcement", "marketing"]
 }'),
 'SYSTEM'),

('AGR-TEMPLATE-001', 'CLS-002', 'DATA_SCOPE', 'Data Domains and Restrictions',
 'This Agreement covers the following data domains: Cloud Cost data, Billing records, CIP Program information, and Modernization Status indicators. Personally identifiable information (PII) is not permitted under this Agreement. Fields including Social Security Number, Date of Birth, and Full Address must be excluded or masked.',
 100,
 PARSE_JSON('{
   "domains_allowed": ["CLOUD_COST", "BILLING", "CIP_PROGRAM", "MODERNIZATION_STATUS"],
   "fields_prohibited": ["SSN", "DOB", "FULL_ADDRESS"],
   "pii_allowed": false
 }'),
 'SYSTEM'),

('AGR-TEMPLATE-001', 'CLS-003', 'AI_USE', 'Artificial Intelligence Processing',
 'AI and machine learning processing is permitted under the following conditions: (1) Human review is required before any AI-generated content is promoted to Executive trust state. (2) All prompts submitted to AI systems and all outputs generated must be logged for audit purposes. (3) AI-generated insights must cite source data and governing agreement clauses. (4) Automated decision-making that affects budget allocations or personnel requires explicit human approval.',
 100,
 PARSE_JSON('{
   "ai_allowed": true,
   "requirements": ["human_in_the_loop_for_executive", "log_prompts_outputs", "cite_sources"],
   "prohibited_actions": ["automated_decision_making_without_approval"]
 }'),
 'SYSTEM'),

('AGR-TEMPLATE-001', 'CLS-004', 'CROSS_SHARING', 'Cross-Agency Data Sharing',
 'Cross-agency sharing of raw data is not permitted under this Agreement. Aggregated, de-identified summaries may be shared with EOTSS FinOps roles for government-wide oversight purposes only.',
 100,
 PARSE_JSON('{
   "cross_agency_allowed": false,
   "allowed_recipients": ["EOTSS_ROLE:FINOPS_ANALYST", "EOTSS_ROLE:CFO"],
   "aggregation_required": true,
   "external_sharing_allowed": false
 }'),
 'SYSTEM'),

('AGR-TEMPLATE-001', 'CLS-005', 'RETENTION', 'Data Retention and Disposal',
 'Data obtained under this Agreement shall be retained for a maximum of ten (10) years from the date of collection. Upon termination of this Agreement, all data shall be securely deleted within ninety (90) days unless retention is required by law.',
 100,
 PARSE_JSON('{
   "max_days": 3650,
   "delete_on_termination": true,
   "deletion_period_days": 90
 }'),
 'SYSTEM');


COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'GOVERNANCE.AGREEMENTS' AS table_name, COUNT(*) AS row_count FROM GOVERNANCE.AGREEMENTS
UNION ALL
SELECT 'GOVERNANCE.AGREEMENT_CLAUSES', COUNT(*) FROM GOVERNANCE.AGREEMENT_CLAUSES
UNION ALL
SELECT 'GOVERNANCE.AGREEMENT_POLICY', COUNT(*) FROM GOVERNANCE.AGREEMENT_POLICY
UNION ALL
SELECT 'GOVERNANCE.AGREEMENT_PARTIES', COUNT(*) FROM GOVERNANCE.AGREEMENT_PARTIES
UNION ALL
SELECT 'GOVERNANCE.AGREEMENT_INDEX', COUNT(*) FROM GOVERNANCE.AGREEMENT_INDEX
UNION ALL
SELECT 'GOVERNANCE.AGREEMENT_EVENTS', COUNT(*) FROM GOVERNANCE.AGREEMENT_EVENTS;

SELECT '=== GOVERNANCE SCHEMA CREATED SUCCESSFULLY ===' AS status;
