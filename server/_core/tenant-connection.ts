import snowflake from "snowflake-sdk";
import type { TenantConfig } from "../../shared/types/tenant";
import { isSpcsEnvironment, getConnectionOptions } from "../snowflake-spcs";

/**
 * Connection pool keyed by snowflakeRole.
 * Each tenant gets its own persistent connection using its designated role.
 */
const tenantPools = new Map<string, snowflake.Connection>();
const tenantPromises = new Map<string, Promise<snowflake.Connection>>();

/**
 * Get or create a Snowflake connection scoped to a tenant's role.
 */
export async function getTenantConnection(tenant: TenantConfig): Promise<snowflake.Connection> {
  const key = tenant.snowflakeRole;

  // Return existing connection
  const existing = tenantPools.get(key);
  if (existing) {
    return existing;
  }

  // Return in-flight connection
  const pending = tenantPromises.get(key);
  if (pending) {
    return pending;
  }

  const promise = createTenantConnection(tenant);
  tenantPromises.set(key, promise);

  try {
    const conn = await promise;
    tenantPools.set(key, conn);
    return conn;
  } finally {
    tenantPromises.delete(key);
  }
}

/**
 * Create a new connection with the tenant's Snowflake role.
 */
function createTenantConnection(tenant: TenantConfig): Promise<snowflake.Connection> {
  return new Promise((resolve, reject) => {
    try {
      const baseOptions = getConnectionOptions();

      // Override role and default schema for this tenant
      const tenantOptions: snowflake.ConnectionOptions = {
        ...baseOptions,
        role: tenant.snowflakeRole,
        schema: tenant.dataSchema,
      };

      const connection = snowflake.createConnection(tenantOptions);

      connection.connect((err, conn) => {
        if (err) {
          console.error(`[TenantPool] Connection failed for role ${tenant.snowflakeRole}:`, err.message);
          reject(err);
        } else {
          const authType = isSpcsEnvironment() ? "SPCS OAuth" : "password";
          console.log(`[TenantPool] Connected tenant '${tenant.tenantId}' via ${authType} (role: ${tenant.snowflakeRole})`);
          resolve(conn);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Close a specific tenant connection.
 */
export async function closeTenantConnection(snowflakeRole: string): Promise<void> {
  const conn = tenantPools.get(snowflakeRole);
  if (!conn) return;

  return new Promise((resolve, reject) => {
    conn.destroy((err) => {
      if (err) {
        console.error(`[TenantPool] Failed to close connection for role ${snowflakeRole}:`, err.message);
        reject(err);
      } else {
        console.log(`[TenantPool] Closed connection for role ${snowflakeRole}`);
        tenantPools.delete(snowflakeRole);
        resolve();
      }
    });
  });
}

/**
 * Close all tenant connections (for graceful shutdown).
 */
export async function closeAllTenantConnections(): Promise<void> {
  const roles = Array.from(tenantPools.keys());
  await Promise.allSettled(roles.map((role) => closeTenantConnection(role)));
  console.log(`[TenantPool] Closed ${roles.length} tenant connections`);
}
