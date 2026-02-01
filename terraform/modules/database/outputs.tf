# =============================================================================
# Module: Database — Outputs
# =============================================================================

output "database_name" {
  value       = snowflake_database.prism.name
  description = "Name of the PRISM FinOps database"
}

output "schema_names" {
  value       = [for s in snowflake_schema.schemas : s.name]
  description = "List of all schema names"
}
