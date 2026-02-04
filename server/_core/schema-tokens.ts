import type { TenantConfig } from "../../shared/types/tenant";

/**
 * Schema name allowlist: only uppercase letters, digits, and underscores.
 * Prevents SQL injection through schema token replacement.
 */
const SCHEMA_NAME_PATTERN = /^[A-Z0-9_]+$/;

/**
 * Validate that a schema name matches the allowlist pattern.
 * Throws if the name is invalid.
 */
function validateSchemaName(name: string, token: string): void {
  if (!SCHEMA_NAME_PATTERN.test(name)) {
    throw new Error(
      `[SchemaTokens] Invalid schema name for ${token}: '${name}' — must match ${SCHEMA_NAME_PATTERN}`
    );
  }
}

/**
 * Replace schema tokens in SQL with tenant-specific schema names.
 *
 * Tokens:
 *   {{DATA_SCHEMA}} → tenant.dataSchema  (e.g. EOTSS_STAGING)
 *   {{GOV_SCHEMA}}  → tenant.govSchema   (e.g. GOVERNANCE)
 *   {{SEM_SCHEMA}}  → tenant.semSchema   (e.g. SEMANTIC)
 *
 * All replacements are validated against an allowlist before substitution.
 */
export function replaceSchemaTokens(sql: string, tenant: TenantConfig): string {
  validateSchemaName(tenant.dataSchema, "{{DATA_SCHEMA}}");
  validateSchemaName(tenant.govSchema, "{{GOV_SCHEMA}}");
  validateSchemaName(tenant.semSchema, "{{SEM_SCHEMA}}");

  return sql
    .replace(/\{\{DATA_SCHEMA\}\}/g, tenant.dataSchema)
    .replace(/\{\{GOV_SCHEMA\}\}/g, tenant.govSchema)
    .replace(/\{\{SEM_SCHEMA\}\}/g, tenant.semSchema);
}
