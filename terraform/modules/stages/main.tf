# =============================================================================
# Module: Stages
# Internal stages for ETL data uploads into the PRISM platform.
# =============================================================================

# -----------------------------------------------------------------------------
# Internal Stage — DATA_LOAD
# Used for ETL data uploads (CSV, Parquet, JSON) into EOTSS_STAGING tables.
# Files are uploaded via PUT and loaded via COPY INTO.
# -----------------------------------------------------------------------------
resource "snowflake_stage" "data_load" {
  database = var.database_name
  schema   = "EOTSS_STAGING"
  name     = "DATA_LOAD"
  comment  = "Internal stage for ETL data uploads (CIW, CIP, CommBuys, CTHR)"

  directory = "ENABLE = TRUE"
}

# -----------------------------------------------------------------------------
# Internal Stage — ANALYTICS_EXPORT
# Used for exporting analytics results (anomaly reports, forecasts) as files
# that can be retrieved via GET or served by SPCS services.
# -----------------------------------------------------------------------------
resource "snowflake_stage" "analytics_export" {
  database = var.database_name
  schema   = "ANALYTICS"
  name     = "ANALYTICS_EXPORT"
  comment  = "Internal stage for analytics export files (anomaly reports, forecasts)"

  directory = "ENABLE = TRUE"
}

# -----------------------------------------------------------------------------
# Internal Stage — SEMANTIC_MODELS
# Stores semantic view YAML definitions and Cortex agent configurations.
# -----------------------------------------------------------------------------
resource "snowflake_stage" "semantic_models" {
  database = var.database_name
  schema   = "SEMANTIC"
  name     = "SEMANTIC_MODELS"
  comment  = "Internal stage for semantic view YAML definitions"

  directory = "ENABLE = TRUE"
}
