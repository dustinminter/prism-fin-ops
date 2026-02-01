# =============================================================================
# Module: Roles
# RBAC hierarchy for PRISM FinOps:
#   PRISM_USER_ROLE  -> PRISM_APP_ROLE  -> PRISM_ADMIN_ROLE  -> ACCOUNTADMIN
#   (read-only)         (app services)     (schema DDL)         (platform)
# =============================================================================

# -----------------------------------------------------------------------------
# Role Definitions
# -----------------------------------------------------------------------------
resource "snowflake_account_role" "admin" {
  name    = "PRISM_ADMIN_ROLE"
  comment = "PRISM FinOps admin — schema DDL, table management"
}

resource "snowflake_account_role" "app" {
  name    = "PRISM_APP_ROLE"
  comment = "PRISM FinOps application — read/write for services"
}

resource "snowflake_account_role" "user" {
  name    = "PRISM_USER_ROLE"
  comment = "PRISM FinOps end user — read-only access"
}

# -----------------------------------------------------------------------------
# Role Hierarchy
# PRISM_USER_ROLE -> PRISM_APP_ROLE -> PRISM_ADMIN_ROLE -> ACCOUNTADMIN
# -----------------------------------------------------------------------------
resource "snowflake_grant_account_role" "user_to_app" {
  role_name        = snowflake_account_role.user.name
  parent_role_name = snowflake_account_role.app.name
}

resource "snowflake_grant_account_role" "app_to_admin" {
  role_name        = snowflake_account_role.app.name
  parent_role_name = snowflake_account_role.admin.name
}

resource "snowflake_grant_account_role" "admin_to_accountadmin" {
  role_name        = snowflake_account_role.admin.name
  parent_role_name = "ACCOUNTADMIN"
}

# -----------------------------------------------------------------------------
# Database-Level Grants — PRISM_APP_ROLE
# -----------------------------------------------------------------------------
resource "snowflake_grant_privileges_to_account_role" "app_db_usage" {
  account_role_name = snowflake_account_role.app.name
  privileges        = ["USAGE"]

  on_account_object {
    object_type = "DATABASE"
    object_name = var.database_name
  }
}

# -----------------------------------------------------------------------------
# Schema-Level Grants — PRISM_APP_ROLE (USAGE on all schemas)
# -----------------------------------------------------------------------------
resource "snowflake_grant_privileges_to_account_role" "app_schema_usage" {
  for_each = toset(var.schema_names)

  account_role_name = snowflake_account_role.app.name
  privileges        = ["USAGE"]

  on_schema {
    schema_name = "\"${var.database_name}\".\"${each.value}\""
  }
}

# -----------------------------------------------------------------------------
# Table Grants — PRISM_APP_ROLE (SELECT on all existing tables)
# -----------------------------------------------------------------------------
resource "snowflake_grant_privileges_to_account_role" "app_select_tables" {
  for_each = toset(var.schema_names)

  account_role_name = snowflake_account_role.app.name
  privileges        = ["SELECT"]

  on_schema_object {
    all {
      object_type_plural = "TABLES"
      in_schema          = "\"${var.database_name}\".\"${each.value}\""
    }
  }
}

# -----------------------------------------------------------------------------
# Future Table Grants — PRISM_APP_ROLE (SELECT on future tables)
# -----------------------------------------------------------------------------
resource "snowflake_grant_privileges_to_account_role" "app_select_future_tables" {
  for_each = toset(var.schema_names)

  account_role_name = snowflake_account_role.app.name
  privileges        = ["SELECT"]

  on_schema_object {
    future {
      object_type_plural = "TABLES"
      in_schema          = "\"${var.database_name}\".\"${each.value}\""
    }
  }
}

# -----------------------------------------------------------------------------
# View Grants — PRISM_APP_ROLE (SELECT on all existing views)
# -----------------------------------------------------------------------------
resource "snowflake_grant_privileges_to_account_role" "app_select_views" {
  for_each = toset(var.schema_names)

  account_role_name = snowflake_account_role.app.name
  privileges        = ["SELECT"]

  on_schema_object {
    all {
      object_type_plural = "VIEWS"
      in_schema          = "\"${var.database_name}\".\"${each.value}\""
    }
  }
}

# -----------------------------------------------------------------------------
# Future View Grants — PRISM_APP_ROLE (SELECT on future views)
# -----------------------------------------------------------------------------
resource "snowflake_grant_privileges_to_account_role" "app_select_future_views" {
  for_each = toset(var.schema_names)

  account_role_name = snowflake_account_role.app.name
  privileges        = ["SELECT"]

  on_schema_object {
    future {
      object_type_plural = "VIEWS"
      in_schema          = "\"${var.database_name}\".\"${each.value}\""
    }
  }
}

# -----------------------------------------------------------------------------
# Database-Level Grants — PRISM_ADMIN_ROLE
# -----------------------------------------------------------------------------
resource "snowflake_grant_privileges_to_account_role" "admin_db_usage" {
  account_role_name = snowflake_account_role.admin.name
  privileges        = ["USAGE"]

  on_account_object {
    object_type = "DATABASE"
    object_name = var.database_name
  }
}

# -----------------------------------------------------------------------------
# Schema-Level Grants — PRISM_ADMIN_ROLE (DDL privileges)
# -----------------------------------------------------------------------------
resource "snowflake_grant_privileges_to_account_role" "admin_schema_ddl" {
  for_each = toset(var.schema_names)

  account_role_name = snowflake_account_role.admin.name
  privileges = [
    "USAGE",
    "CREATE TABLE",
    "CREATE VIEW",
    "CREATE SEQUENCE",
    "CREATE FUNCTION",
    "CREATE PROCEDURE",
    "CREATE STAGE",
    "CREATE STREAM",
    "CREATE TASK",
  ]

  on_schema {
    schema_name = "\"${var.database_name}\".\"${each.value}\""
  }
}

# -----------------------------------------------------------------------------
# Table Grants — PRISM_ADMIN_ROLE (full DML on all existing tables)
# -----------------------------------------------------------------------------
resource "snowflake_grant_privileges_to_account_role" "admin_all_tables" {
  for_each = toset(var.schema_names)

  account_role_name = snowflake_account_role.admin.name
  privileges        = ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"]

  on_schema_object {
    all {
      object_type_plural = "TABLES"
      in_schema          = "\"${var.database_name}\".\"${each.value}\""
    }
  }
}

# -----------------------------------------------------------------------------
# Future Table Grants — PRISM_ADMIN_ROLE (full DML on future tables)
# -----------------------------------------------------------------------------
resource "snowflake_grant_privileges_to_account_role" "admin_future_tables" {
  for_each = toset(var.schema_names)

  account_role_name = snowflake_account_role.admin.name
  privileges        = ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"]

  on_schema_object {
    future {
      object_type_plural = "TABLES"
      in_schema          = "\"${var.database_name}\".\"${each.value}\""
    }
  }
}
