# =============================================================================
# Module: Automation
# =============================================================================
#
# NOTE ON TASKS:
# Snowflake tasks are deployed via SQL script 09 (sql/09-create-tasks.sql)
# because CREATE TASK involves complex DDL with CRON schedules, predecessor
# chains, warehouse references, and embedded SQL bodies that are better
# maintained as native SQL. Terraform's snowflake_task resource does not
# handle multi-statement task bodies or conditional logic well.
#
# The 5-task monthly retrain DAG:
#   PRISM_MONTHLY_RETRAIN (root, 1st of month 3AM)
#     -> RETRAIN_ANOMALY_MODEL (parallel)
#     -> RETRAIN_FORECAST_MODEL (parallel)
#        -> REFRESH_ANOMALY_RESULTS (downstream)
#        -> REFRESH_FORECAST_RESULTS (downstream)
#
# NOTE ON DYNAMIC TABLES:
# Dynamic tables are deployed via SQL script 10 (sql/10-dynamic-tables.sql).
# The Snowflake Terraform provider does not currently support dynamic tables.
#
# This module creates the event table used for logging from tasks and SPCS
# services.
# =============================================================================

# -----------------------------------------------------------------------------
# Event Table — captures structured log events from tasks and services
# -----------------------------------------------------------------------------
resource "snowflake_event_table" "prism_events" {
  database = var.database_name
  schema   = "EOTSS_STAGING"
  name     = "PRISM_EVENT_LOG"
  comment  = "Structured event log for PRISM tasks, services, and pipelines"

  change_tracking = true
}
