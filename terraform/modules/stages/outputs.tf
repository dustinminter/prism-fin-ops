# =============================================================================
# Module: Stages — Outputs
# =============================================================================

output "data_load_stage" {
  value       = "@${var.database_name}.EOTSS_STAGING.${snowflake_stage.data_load.name}"
  description = "Fully qualified stage reference for ETL data uploads"
}

output "analytics_export_stage" {
  value       = "@${var.database_name}.ANALYTICS.${snowflake_stage.analytics_export.name}"
  description = "Fully qualified stage reference for analytics exports"
}

output "semantic_models_stage" {
  value       = "@${var.database_name}.SEMANTIC.${snowflake_stage.semantic_models.name}"
  description = "Fully qualified stage reference for semantic model YAML files"
}
