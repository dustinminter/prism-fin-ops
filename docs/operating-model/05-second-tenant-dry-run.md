# Second Tenant Dry-Run

Validates the multi-tenancy architecture by onboarding a `demo` tenant with zero production risk. All operations are idempotent and scoped to a dedicated schema.

## Prerequisites

- Track A merged and deployed (`18-tenant-config.sql` applied)
- `ACCOUNTADMIN` or `SYSADMIN` access to create roles/schemas
- Local dev environment running (`pnpm dev`)

## Steps

### 1. Deploy demo tenant SQL

```bash
python3 ~/Desktop/maios/scripts/snow_deploy.py prism 19-demo-tenant.sql
```

This creates:
- `FEDERAL_FINANCIAL_DATA.DEMO_STAGING` schema with sample data
- `PRISM_TENANT_DEMO_ROLE` with grants scoped only to `DEMO_STAGING` + governance tables
- Rows in `GOVERNANCE.TENANTS` and `GOVERNANCE.TENANT_USERS`

### 2. Verify cross-tenant isolation

Run in Snowsight or via `snow_deploy.py`:

```sql
-- Under DEMO role: EOTSS data must be invisible
USE ROLE PRISM_TENANT_DEMO_ROLE;
SELECT * FROM FEDERAL_FINANCIAL_DATA.EOTSS_STAGING.V_CIW_SPENDING LIMIT 1;
-- Expected: "Object does not exist or not authorized"

-- Under EOTSS role: DEMO data must be invisible
USE ROLE PRISM_TENANT_EOTSS_ROLE;
SELECT * FROM FEDERAL_FINANCIAL_DATA.DEMO_STAGING.DEMO_SPENDING LIMIT 1;
-- Expected: "Object does not exist or not authorized"
```

Both queries must fail. If either succeeds, there is a grant leak.

### 3. Run app with demo tenant

```bash
# In server/_core/sdk.ts, temporarily change DEV_USER.openId:
# openId: "demo-user-001"
pnpm dev
```

Expected behavior:
- `auth.me` returns user with `tenantId: "demo"`
- All `prism.*` routes execute against `DEMO_STAGING` schema
- All `governance.*` routes execute with `PRISM_TENANT_DEMO_ROLE`
- Queries against EOTSS data are impossible (role lacks grants)

### 4. Verify in app logs

Look for:
```
[tenant-resolver] Resolved tenant 'demo' for user 'demo-user-001'
[snowflake] Using role PRISM_TENANT_DEMO_ROLE for query
```

### 5. Cleanup (optional)

```sql
DROP SCHEMA IF EXISTS FEDERAL_FINANCIAL_DATA.DEMO_STAGING;
DROP ROLE IF EXISTS PRISM_TENANT_DEMO_ROLE;
DELETE FROM FEDERAL_FINANCIAL_DATA.GOVERNANCE.TENANT_USERS WHERE TENANT_ID = 'demo';
DELETE FROM FEDERAL_FINANCIAL_DATA.GOVERNANCE.TENANTS WHERE TENANT_ID = 'demo';
```

## Success Criteria

| Check | Expected |
|-------|----------|
| DEMO role cannot read EOTSS_STAGING | Access denied |
| EOTSS role cannot read DEMO_STAGING | Access denied |
| App resolves demo tenant from TENANT_USERS | `tenantId: "demo"` |
| App uses PRISM_TENANT_DEMO_ROLE for queries | Visible in logs |
| No code changes required for onboarding | Config + SQL only |
