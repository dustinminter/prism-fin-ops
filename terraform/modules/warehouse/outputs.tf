# =============================================================================
# Module: Warehouse — Outputs
# =============================================================================

output "warehouse_name" {
  value       = snowflake_warehouse.app.name
  description = "Name of the application warehouse"
}
