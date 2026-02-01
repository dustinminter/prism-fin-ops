# =============================================================================
# Module: SPCS — Outputs
# =============================================================================

output "image_repo_url" {
  value       = snowflake_image_repository.prism.repository_url
  description = "SPCS image repository URL for docker push"
}

output "compute_pool_name" {
  value       = snowflake_compute_pool.prism.name
  description = "Name of the SPCS compute pool"
}

output "spcs_database_name" {
  value       = snowflake_database.spcs.name
  description = "Name of the SPCS infrastructure database"
}
