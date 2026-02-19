import type { Request } from "express";
import type { User } from "../../shared/types/user";
import { createRemoteJWKSet, jwtVerify } from "jose";

// =============================================================================
// Authentication SDK
// Supports three modes:
//   1. OIDC/JWT: Validates Bearer tokens against an OIDC provider's JWKS
//   2. SPCS: Pre-authenticated by Snowflake edge (handled in context.ts)
//   3. Dev: Hardcoded DEV_USER when no OIDC_ISSUER is configured
// =============================================================================

// OIDC Configuration from environment
const OIDC_ISSUER = process.env.OIDC_ISSUER || ""; // e.g., https://login.microsoftonline.com/{tenant}/v2.0
const OIDC_AUDIENCE = process.env.OIDC_AUDIENCE || ""; // e.g., api://prism-finops
const OIDC_ADMIN_ROLES = (process.env.OIDC_ADMIN_ROLES || "admin,Admin,GlobalAdmin").split(",");

// JWKS client (lazy-initialized, auto-caches keys)
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks(): ReturnType<typeof createRemoteJWKSet> {
  if (!jwks) {
    const jwksUrl = new URL(`${OIDC_ISSUER}/.well-known/openid-configuration`);
    // jose's createRemoteJWKSet fetches JWKS URI from the OIDC discovery doc
    // and caches the keys with automatic rotation
    const jwksUri = new URL(`${OIDC_ISSUER.replace(/\/$/, "")}/.well-known/jwks.json`);
    jwks = createRemoteJWKSet(jwksUri);
  }
  return jwks;
}

// Dev fallback user (only used when OIDC_ISSUER is not configured)
const DEV_USER: Omit<User, "tenantId"> = {
  id: 1,
  openId: "dev-user-001",
  name: "Dev User",
  email: "dev@prism.local",
  role: "admin",
};

/**
 * Extract and validate a JWT Bearer token from the request.
 * Returns user claims or throws on invalid/missing token.
 */
async function authenticateJwt(req: Request): Promise<Omit<User, "tenantId">> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const token = authHeader.slice(7);

  const { payload } = await jwtVerify(token, getJwks(), {
    issuer: OIDC_ISSUER,
    audience: OIDC_AUDIENCE || undefined,
  });

  // Extract standard OIDC claims
  const openId = (payload.sub || payload.oid || "") as string;
  if (!openId) {
    throw new Error("JWT missing sub or oid claim");
  }

  // Role detection: check roles claim (Azure AD), groups, or realm_access (Keycloak)
  const roles = (payload.roles || payload.groups || []) as string[];
  const realmRoles = ((payload.realm_access as { roles?: string[] })?.roles || []) as string[];
  const allRoles = [...roles, ...realmRoles];
  const isAdmin = allRoles.some((r) => OIDC_ADMIN_ROLES.includes(r));

  return {
    id: typeof payload.sub === "string" ? hashStringToId(payload.sub) : 1,
    openId,
    name: (payload.name as string) || null,
    email: (payload.email || payload.preferred_username || null) as string | null,
    role: isAdmin ? "admin" : "user",
  };
}

/** Deterministic numeric ID from a string (for User.id which expects number) */
function hashStringToId(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export const sdk = {
  /**
   * Authenticate an Express request.
   * - If OIDC_ISSUER is set: validates JWT Bearer token
   * - Otherwise: returns DEV_USER (local development only)
   */
  async authenticateRequest(req: Request): Promise<Omit<User, "tenantId">> {
    if (OIDC_ISSUER) {
      return authenticateJwt(req);
    }
    return DEV_USER;
  },
};
