# =============================================================================
# Module: Roles — Outputs
# =============================================================================

output "app_role_name" {
  value       = snowflake_account_role.app.name
  description = "Application role for PRISM services"
}

output "admin_role_name" {
  value       = snowflake_account_role.admin.name
  description = "Admin role for schema DDL operations"
}

output "user_role_name" {
  value       = snowflake_account_role.user.name
  description = "Read-only user role"
}
