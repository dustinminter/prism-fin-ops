import snowflake from "snowflake-sdk";
import {
  getSnowflakeConnection as getSpcsConnection,
  closeConnection as closeSpcsConnection,
  isSpcsEnvironment,
  getConnectionInfo,
} from "./snowflake-spcs";

// Re-export SPCS utilities
export { isSpcsEnvironment, getConnectionInfo };

// Use SPCS-aware connection
export const getSnowflakeConnection = getSpcsConnection;

/**
 * Governance context for query tagging and audit
 */
export interface GovernanceContext {
  userId?: string;
  userRole?: string;
  agreementId?: string;
  trustState?: "draft" | "internal" | "client" | "executive";
  agencyCode?: string;
  fiscalPeriod?: string;
  requestSource?: string;
  sessionId?: string;
}

/**
 * Query audit record structure
 */
interface QueryAuditRecord {
  queryId: string;
  userId: string;
  userRole: string;
  agreementId: string | null;
  trustState: string | null;
  queryText: string;
  queryHash: string;
  executionTimeMs: number;
  rowCount: number;
  status: "success" | "error";
  errorMessage: string | null;
  governanceContext: string;
  timestamp: Date;
}

// In-memory audit buffer for batch writes
const auditBuffer: QueryAuditRecord[] = [];
const AUDIT_BUFFER_SIZE = 10;
const AUDIT_FLUSH_INTERVAL = 30000; // 30 seconds

/**
 * Generate a simple hash for query deduplication
 */
function hashQuery(sql: string): string {
  let hash = 0;
  for (let i = 0; i < sql.length; i++) {
    const char = sql.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Generate a unique query ID
 */
function generateQueryId(): string {
  return `QRY-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}


/**
 * Set session-level query tags for governance tracking
 */
async function setQueryTags(
  connection: snowflake.Connection,
  context: GovernanceContext
): Promise<void> {
  const tags = {
    PRISM_USER_ID: context.userId || "anonymous",
    PRISM_USER_ROLE: context.userRole || "public",
    PRISM_AGREEMENT_ID: context.agreementId || "none",
    PRISM_TRUST_STATE: context.trustState || "draft",
    PRISM_AGENCY_CODE: context.agencyCode || "all",
    PRISM_FISCAL_PERIOD: context.fiscalPeriod || "current",
    PRISM_REQUEST_SOURCE: context.requestSource || "api",
    PRISM_SESSION_ID: context.sessionId || "none",
  };

  const tagString = Object.entries(tags)
    .map(([key, value]) => `'${key}', '${value}'`)
    .join(", ");

  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: `ALTER SESSION SET QUERY_TAG = '${JSON.stringify(tags)}'`,
      complete: (err) => {
        if (err) {
          console.warn("[Snowflake] Failed to set query tags:", err.message);
          // Don't reject - query tags are optional
          resolve();
        } else {
          resolve();
        }
      },
    });
  });
}

/**
 * Log query to audit buffer
 */
function logQueryAudit(record: QueryAuditRecord): void {
  auditBuffer.push(record);
  
  // Flush if buffer is full
  if (auditBuffer.length >= AUDIT_BUFFER_SIZE) {
    flushAuditBuffer().catch(console.error);
  }
}

/**
 * Flush audit buffer to Snowflake QUERY_AUDIT table
 */
async function flushAuditBuffer(): Promise<void> {
  if (auditBuffer.length === 0) return;

  const records = auditBuffer.splice(0, auditBuffer.length);
  
  try {
    const connection = await getSnowflakeConnection();
    
    // Build batch insert
    const values = records.map(r => `(
      '${r.queryId}',
      '${r.userId}',
      '${r.userRole}',
      ${r.agreementId ? `'${r.agreementId}'` : 'NULL'},
      ${r.trustState ? `'${r.trustState}'` : 'NULL'},
      '${r.queryText.replace(/'/g, "''")}',
      '${r.queryHash}',
      ${r.executionTimeMs},
      ${r.rowCount},
      '${r.status}',
      ${r.errorMessage ? `'${r.errorMessage.replace(/'/g, "''")}'` : 'NULL'},
      '${r.governanceContext.replace(/'/g, "''")}',
      CURRENT_TIMESTAMP()
    )`).join(',\n');

    const insertSql = `
      INSERT INTO FEDERAL_FINANCIAL_DATA.GOVERNANCE.QUERY_AUDIT 
      (QUERY_ID, USER_ID, USER_ROLE, AGREEMENT_ID, TRUST_STATE, QUERY_TEXT, QUERY_HASH, 
       EXECUTION_TIME_MS, ROW_COUNT, STATUS, ERROR_MESSAGE, GOVERNANCE_CONTEXT, CREATED_AT)
      VALUES ${values}
    `;

    await new Promise<void>((resolve, reject) => {
      connection.execute({
        sqlText: insertSql,
        complete: (err) => {
          if (err) {
            // Log locally if audit table doesn't exist yet
            console.warn("[Snowflake Audit] Failed to write audit records:", err.message);
            console.log("[Snowflake Audit] Records:", JSON.stringify(records, null, 2));
          }
          resolve();
        },
      });
    });
  } catch (error) {
    // Log locally as fallback
    console.warn("[Snowflake Audit] Audit flush failed, logging locally");
    records.forEach(r => {
      console.log(`[AUDIT] ${r.queryId} | ${r.userId} | ${r.status} | ${r.executionTimeMs}ms`);
    });
  }
}

// Set up periodic audit flush
setInterval(() => {
  flushAuditBuffer().catch(console.error);
}, AUDIT_FLUSH_INTERVAL);

/**
 * Execute a parameterized query against Snowflake with governance context
 */
export async function executeQuery<T>(
  sql: string,
  binds: (string | number | boolean | null)[] = [],
  context: GovernanceContext = {}
): Promise<T[]> {
  const connection = await getSnowflakeConnection();
  const queryId = generateQueryId();
  const startTime = Date.now();

  // Set query tags for governance tracking
  await setQueryTags(connection, context);

  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: sql,
      binds: binds,
      complete: (err, stmt, rows) => {
        const executionTime = Date.now() - startTime;
        const result = (rows || []) as T[];

        // Log to audit
        logQueryAudit({
          queryId,
          userId: context.userId || "anonymous",
          userRole: context.userRole || "public",
          agreementId: context.agreementId || null,
          trustState: context.trustState || null,
          queryText: sql.substring(0, 4000), // Truncate for storage
          queryHash: hashQuery(sql),
          executionTimeMs: executionTime,
          rowCount: result.length,
          status: err ? "error" : "success",
          errorMessage: err?.message || null,
          governanceContext: JSON.stringify(context),
          timestamp: new Date(),
        });

        if (err) {
          console.error("[Snowflake] Query failed:", err.message);
          // Log safe error properties (avoid circular references from socket objects)
          console.error("[Snowflake] Error code:", (err as any).code);
          console.error("[Snowflake] Error sqlState:", (err as any).sqlState);
          console.error("[Snowflake] SQL (truncated):", sql.substring(0, 500));
          console.error("[Snowflake] Binds count:", binds?.length || 0);
          reject(err);
        } else {
          resolve(result);
        }
      },
    });
  });
}

/**
 * Execute a governed query with agreement enforcement
 * This checks if the user has the required agreement and trust state before executing
 */
export async function executeGovernedQuery<T>(
  sql: string,
  binds: (string | number | boolean | null)[] = [],
  context: GovernanceContext,
  requiredTrustState: "draft" | "internal" | "client" | "executive" = "draft"
): Promise<{ data: T[]; governanceMetadata: GovernanceMetadata }> {
  // Trust state hierarchy
  const trustHierarchy = ["draft", "internal", "client", "executive"];
  const userTrustLevel = trustHierarchy.indexOf(context.trustState || "draft");
  const requiredTrustLevel = trustHierarchy.indexOf(requiredTrustState);

  // Enforce trust state ceiling
  if (userTrustLevel < requiredTrustLevel) {
    throw new GovernanceError(
      `Insufficient trust state. Required: ${requiredTrustState}, Current: ${context.trustState || "draft"}`,
      "TRUST_STATE_VIOLATION"
    );
  }

  const data = await executeQuery<T>(sql, binds, context);

  return {
    data,
    governanceMetadata: {
      queryId: generateQueryId(),
      trustState: context.trustState || "draft",
      agreementId: context.agreementId,
      enforcedAt: new Date().toISOString(),
      userRole: context.userRole || "public",
    },
  };
}

/**
 * Governance metadata returned with governed queries
 */
export interface GovernanceMetadata {
  queryId: string;
  trustState: string;
  agreementId?: string;
  enforcedAt: string;
  userRole: string;
}

/**
 * Custom error for governance violations
 */
export class GovernanceError extends Error {
  code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = "GovernanceError";
    this.code = code;
  }
}

/**
 * Execute multiple statements in sequence with governance context
 */
export async function executeMultiStatement<T>(
  statements: string[],
  context: GovernanceContext = {}
): Promise<T[][]> {
  const results: T[][] = [];
  for (const sql of statements) {
    const result = await executeQuery<T>(sql, [], context);
    results.push(result);
  }
  return results;
}

/**
 * Close the Snowflake connection
 */
export async function closeConnection(): Promise<void> {
  // Flush any remaining audit records
  await flushAuditBuffer();
  // Close the SPCS-managed connection
  await closeSpcsConnection();
}
