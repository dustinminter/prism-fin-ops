/**
 * Tenant configuration resolved from GOVERNANCE.TENANTS
 */
export interface TenantConfig {
  tenantId: string;
  displayName: string;
  dataSchema: string;
  govSchema: string;
  semSchema: string;
  snowflakeRole: string;
}
