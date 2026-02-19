import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Request } from "express";
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

/**
 * Extract user identity from SPCS edge auth.
 * Snowflake injects Sf-Context-Current-User header with the authenticated username.
 * If an IdP is configured, the header contains the IdP user identity.
 * Falls back to a generic SPCS user if no identity header is present.
 */
function resolveSpcsUser(req: Request): Omit<User, "tenantId"> {
  // Snowflake SPCS injects these headers after edge authentication
  const sfUser = req.headers["sf-context-current-user"] as string | undefined;
  const sfRole = req.headers["sf-context-current-role"] as string | undefined;

  if (sfUser) {
    return {
      id: hashStringToId(sfUser),
      openId: sfUser,
      name: sfUser,
      email: sfUser.includes("@") ? sfUser : null,
      role: sfRole === "ACCOUNTADMIN" ? "admin" : "user",
    };
  }

  // Fallback: no identity header (public endpoint or header not forwarded)
  return {
    id: 1,
    openId: "spcs-authenticated-user",
    name: "SPCS User",
    email: null,
    role: "user",
  };
}

function hashStringToId(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// Express context creator (for local dev and SPCS)
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let baseUser: Omit<User, "tenantId"> | null = null;

  if (isSpcsEnvironment()) {
    // SPCS: user pre-authenticated at Snowflake edge
    // Extract identity from injected headers when available
    baseUser = resolveSpcsUser(opts.req);
  } else {
    // Local / external: validate JWT if OIDC configured, else dev user
    try {
      baseUser = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      console.warn("[Context] Authentication failed:", (error as Error).message);
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
