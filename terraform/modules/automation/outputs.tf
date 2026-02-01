# =============================================================================
# Module: Automation — Outputs
# =============================================================================

output "event_table_name" {
  value       = snowflake_event_table.prism_events.name
  description = "Name of the PRISM event log table"
}
