import type { TenantConfig } from "../../shared/types/tenant";
import { getSnowflakeConnection } from "../snowflake-spcs";

/**
 * In-memory cache for tenant configs.
 * Keyed by tenantId. TTL enforced via cacheExpiry.
 */
const tenantCache = new Map<string, TenantConfig>();
const userTenantCache = new Map<string, string>(); // userId → tenantId
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Refresh the tenant config cache from GOVERNANCE.TENANTS
 */
async function refreshCache(): Promise<void> {
  const conn = await getSnowflakeConnection();

  const rows = await new Promise<any[]>((resolve, reject) => {
    conn.execute({
      sqlText: `
        SELECT TENANT_ID, DISPLAY_NAME, DATA_SCHEMA, GOV_SCHEMA, SEM_SCHEMA, SNOWFLAKE_ROLE
        FROM FEDERAL_FINANCIAL_DATA.GOVERNANCE.TENANTS
        WHERE IS_ACTIVE = TRUE
      `,
      complete: (err, _stmt, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      },
    });
  });

  tenantCache.clear();
  for (const row of rows) {
    const config: TenantConfig = {
      tenantId: row.TENANT_ID,
      displayName: row.DISPLAY_NAME,
      dataSchema: row.DATA_SCHEMA,
      govSchema: row.GOV_SCHEMA,
      semSchema: row.SEM_SCHEMA,
      snowflakeRole: row.SNOWFLAKE_ROLE,
    };
    tenantCache.set(config.tenantId, config);
  }

  cacheExpiry = Date.now() + CACHE_TTL_MS;
  console.log(`[TenantResolver] Cached ${tenantCache.size} tenant configs`);
}

/**
 * Resolve the tenantId for a given userId from GOVERNANCE.TENANT_USERS.
 * Result is cached per-user until the tenant cache expires.
 */
async function resolveUserTenant(userId: string): Promise<string | null> {
  if (Date.now() < cacheExpiry && userTenantCache.has(userId)) {
    return userTenantCache.get(userId)!;
  }

  const conn = await getSnowflakeConnection();

  const rows = await new Promise<any[]>((resolve, reject) => {
    conn.execute({
      sqlText: `
        SELECT TENANT_ID
        FROM FEDERAL_FINANCIAL_DATA.GOVERNANCE.TENANT_USERS
        WHERE USER_ID = ?
        LIMIT 1
      `,
      binds: [userId],
      complete: (err, _stmt, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      },
    });
  });

  if (rows.length === 0) {
    return null;
  }

  const tenantId = rows[0].TENANT_ID as string;
  userTenantCache.set(userId, tenantId);
  return tenantId;
}

/**
 * Resolve TenantConfig for a user. Fail-closed: returns null if no mapping exists.
 */
export async function resolveTenantForUser(userId: string): Promise<TenantConfig | null> {
  // Ensure cache is warm
  if (Date.now() >= cacheExpiry) {
    await refreshCache();
  }

  const tenantId = await resolveUserTenant(userId);
  if (!tenantId) {
    console.warn(`[TenantResolver] No tenant mapping for user: ${userId}`);
    return null;
  }

  const config = tenantCache.get(tenantId);
  if (!config) {
    console.warn(`[TenantResolver] Tenant '${tenantId}' not found in cache for user: ${userId}`);
    return null;
  }

  return config;
}

/**
 * Get a TenantConfig by tenantId directly (for internal use).
 */
export async function getTenantConfig(tenantId: string): Promise<TenantConfig | null> {
  if (Date.now() >= cacheExpiry) {
    await refreshCache();
  }
  return tenantCache.get(tenantId) || null;
}

/**
 * Invalidate the cache (useful for testing or after config changes).
 */
export function invalidateTenantCache(): void {
  tenantCache.clear();
  userTenantCache.clear();
  cacheExpiry = 0;
}
