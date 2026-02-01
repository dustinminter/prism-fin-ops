# =============================================================================
# Root Outputs — PRISM FinOps Snowflake Infrastructure
# =============================================================================

output "database_name" {
  value       = module.database.database_name
  description = "Name of the primary PRISM FinOps database"
}

output "warehouse_name" {
  value       = module.warehouse.warehouse_name
  description = "Name of the application warehouse"
}

output "image_repo_url" {
  value       = module.spcs.image_repo_url
  description = "SPCS image repository URL for docker push"
}

output "app_role" {
  value       = module.roles.app_role_name
  description = "Application role for PRISM services"
}

output "admin_role" {
  value       = module.roles.admin_role_name
  description = "Admin role for schema management"
}

output "user_role" {
  value       = module.roles.user_role_name
  description = "Read-only user role"
}

output "schema_names" {
  value       = module.database.schema_names
  description = "List of all schema names created in the database"
}
