# =============================================================================
# Module: Governance — Outputs
# =============================================================================

output "sensitivity_level_tag" {
  value       = snowflake_tag.sensitivity_level.fully_qualified_name
  description = "Fully qualified name of the SENSITIVITY_LEVEL tag"
}

output "data_domain_tag" {
  value       = snowflake_tag.data_domain.fully_qualified_name
  description = "Fully qualified name of the DATA_DOMAIN tag"
}

output "pii_flag_tag" {
  value       = snowflake_tag.pii_flag.fully_qualified_name
  description = "Fully qualified name of the PII_FLAG tag"
}

output "data_quality_tier_tag" {
  value       = snowflake_tag.data_quality_tier.fully_qualified_name
  description = "Fully qualified name of the DATA_QUALITY_TIER tag"
}
