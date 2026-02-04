import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../shared/types/user";
import type { TenantConfig } from "../../shared/types/tenant";
import { sdk } from "./sdk";
import { isSpcsEnvironment } from "../snowflake-spcs";
import { resolveTenantForUser } from "./tenant-resolver";

// Dev-mode fallback tenant when GOVERNANCE schema doesn't exist yet
const DEV_TENANT: TenantConfig = {
  tenantId: "dev",
  displayName: "Dev Tenant",
  dataSchema: "EOTSS_STAGING",
  govSchema: "GOVERNANCE",
  semSchema: "EOTSS_STAGING",
  snowflakeRole: "ACCOUNTADMIN",
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"] | null;
  res: CreateExpressContextOptions["res"] | null;
  user: User | null;
  tenant: TenantConfig | null;
};

// In SPCS, users are authenticated by Snowflake at the edge before reaching the app
const SPCS_BASE_USER: Omit<User, "tenantId"> = {
  id: 1,
  openId: "spcs-authenticated-user",
  name: "SPCS User",
  email: null,
  role: "user",
};

// Express context creator (for local dev and SPCS)
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let baseUser: Omit<User, "tenantId"> | null = null;

  if (isSpcsEnvironment()) {
    baseUser = SPCS_BASE_USER;
  } else {
    try {
      baseUser = sdk.authenticateRequest(opts.req);
    } catch (error) {
      baseUser = null;
    }
  }

  if (!baseUser) {
    return { req: opts.req, res: opts.res, user: null, tenant: null };
  }

  // Auth-first tenant resolution: resolve tenant BEFORE any data access
  let tenant: TenantConfig | null = null;
  try {
    tenant = await resolveTenantForUser(baseUser.openId);
  } catch (error) {
    console.error("[Context] Tenant resolution failed:", (error as Error).message);
    // In local dev, fall back to dev tenant so routes work without GOVERNANCE schema
    if (!isSpcsEnvironment()) {
      tenant = DEV_TENANT;
      console.log("[Context] Using dev fallback tenant");
    }
  }

  // Build user with tenantId (empty string if no tenant — route middleware will enforce)
  const user: User = {
    ...baseUser,
    tenantId: tenant?.tenantId ?? "",
  };

  return { req: opts.req, res: opts.res, user, tenant };
}
