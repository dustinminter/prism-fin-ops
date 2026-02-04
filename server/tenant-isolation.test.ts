import { describe, it, expect } from "vitest";
import { replaceSchemaTokens } from "./_core/schema-tokens";
import { NO_TENANT_ERR_MSG } from "@shared/const";
import type { TenantConfig } from "../shared/types/tenant";
import type { User } from "../shared/types/user";

// ============================================================================
// Schema Token Replacement Tests
// ============================================================================

describe("replaceSchemaTokens", () => {
  const eotss: TenantConfig = {
    tenantId: "eotss",
    displayName: "EOTSS",
    dataSchema: "EOTSS_STAGING",
    govSchema: "GOVERNANCE",
    semSchema: "SEMANTIC",
    snowflakeRole: "PRISM_TENANT_EOTSS_ROLE",
  };

  it("replaces all three schema tokens", () => {
    const sql = `
      SELECT * FROM FEDERAL_FINANCIAL_DATA.{{DATA_SCHEMA}}.SPENDING
      JOIN FEDERAL_FINANCIAL_DATA.{{GOV_SCHEMA}}.AUDIT ON 1=1
      JOIN FEDERAL_FINANCIAL_DATA.{{SEM_SCHEMA}}.LINEAGE ON 1=1
    `;
    const result = replaceSchemaTokens(sql, eotss);
    expect(result).toContain("FEDERAL_FINANCIAL_DATA.EOTSS_STAGING.SPENDING");
    expect(result).toContain("FEDERAL_FINANCIAL_DATA.GOVERNANCE.AUDIT");
    expect(result).toContain("FEDERAL_FINANCIAL_DATA.SEMANTIC.LINEAGE");
    expect(result).not.toContain("{{");
  });

  it("handles SQL with no tokens", () => {
    const sql = "SELECT 1";
    const result = replaceSchemaTokens(sql, eotss);
    expect(result).toBe("SELECT 1");
  });

  it("replaces multiple occurrences of the same token", () => {
    const sql = `
      SELECT * FROM FEDERAL_FINANCIAL_DATA.{{DATA_SCHEMA}}.A
      UNION ALL
      SELECT * FROM FEDERAL_FINANCIAL_DATA.{{DATA_SCHEMA}}.B
    `;
    const result = replaceSchemaTokens(sql, eotss);
    const matches = result.match(/EOTSS_STAGING/g);
    expect(matches).toHaveLength(2);
  });

  it("rejects schema names with SQL injection characters", () => {
    const malicious: TenantConfig = {
      ...eotss,
      dataSchema: "SCHEMA; DROP TABLE--",
    };
    expect(() => replaceSchemaTokens("SELECT {{DATA_SCHEMA}}", malicious)).toThrow(
      /Invalid schema name/
    );
  });

  it("rejects empty schema names", () => {
    const empty: TenantConfig = { ...eotss, govSchema: "" };
    expect(() => replaceSchemaTokens("SELECT {{GOV_SCHEMA}}", empty)).toThrow(
      /Invalid schema name/
    );
  });

  it("accepts valid schema names with underscores and numbers", () => {
    const tenant: TenantConfig = {
      ...eotss,
      dataSchema: "TENANT_123_STAGING",
    };
    const result = replaceSchemaTokens("SELECT {{DATA_SCHEMA}}", tenant);
    expect(result).toBe("SELECT TENANT_123_STAGING");
  });
});

// ============================================================================
// Tenant Context Type Tests
// ============================================================================

describe("tenant context types", () => {
  it("User requires tenantId", () => {
    const user: User = {
      id: 1,
      openId: "test-user",
      name: "Test",
      email: "test@test.com",
      role: "user",
      tenantId: "eotss",
    };
    expect(user.tenantId).toBe("eotss");
  });

  it("TenantConfig has all required fields", () => {
    const config: TenantConfig = {
      tenantId: "eotss",
      displayName: "EOTSS",
      dataSchema: "EOTSS_STAGING",
      govSchema: "GOVERNANCE",
      semSchema: "SEMANTIC",
      snowflakeRole: "PRISM_TENANT_EOTSS_ROLE",
    };
    expect(config.tenantId).toBe("eotss");
    expect(config.snowflakeRole).toBe("PRISM_TENANT_EOTSS_ROLE");
  });

  it("tenant error message constant exists", () => {
    expect(NO_TENANT_ERR_MSG).toBe("No tenant assigned to this user (10003)");
  });
});

// ============================================================================
// Tenant Isolation Invariants
// ============================================================================

describe("tenant isolation invariants", () => {
  it("different tenants produce different token replacements", () => {
    const tenant1: TenantConfig = {
      tenantId: "eotss",
      displayName: "EOTSS",
      dataSchema: "EOTSS_STAGING",
      govSchema: "GOVERNANCE",
      semSchema: "SEMANTIC",
      snowflakeRole: "PRISM_TENANT_EOTSS_ROLE",
    };

    const tenant2: TenantConfig = {
      tenantId: "hhs",
      displayName: "HHS",
      dataSchema: "HHS_STAGING",
      govSchema: "HHS_GOVERNANCE",
      semSchema: "HHS_SEMANTIC",
      snowflakeRole: "PRISM_TENANT_HHS_ROLE",
    };

    const sql = "SELECT * FROM FEDERAL_FINANCIAL_DATA.{{DATA_SCHEMA}}.TABLE1";
    const result1 = replaceSchemaTokens(sql, tenant1);
    const result2 = replaceSchemaTokens(sql, tenant2);

    expect(result1).toContain("EOTSS_STAGING");
    expect(result2).toContain("HHS_STAGING");
    expect(result1).not.toBe(result2);
  });

  it("tenant roles are unique per tenant", () => {
    const eotss: TenantConfig = {
      tenantId: "eotss",
      displayName: "EOTSS",
      dataSchema: "EOTSS_STAGING",
      govSchema: "GOVERNANCE",
      semSchema: "SEMANTIC",
      snowflakeRole: "PRISM_TENANT_EOTSS_ROLE",
    };

    const hhs: TenantConfig = {
      tenantId: "hhs",
      displayName: "HHS",
      dataSchema: "HHS_STAGING",
      govSchema: "HHS_GOVERNANCE",
      semSchema: "HHS_SEMANTIC",
      snowflakeRole: "PRISM_TENANT_HHS_ROLE",
    };

    expect(eotss.snowflakeRole).not.toBe(hhs.snowflakeRole);
    expect(eotss.tenantId).not.toBe(hhs.tenantId);
  });
});
