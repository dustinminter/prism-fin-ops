# =============================================================================
# Module: Governance
# Snowflake Horizon tags for data classification.
# =============================================================================
#
# NOTE ON POLICIES AND SHARES:
# Row access policies, masking policies, data shares, and clean rooms are
# deployed via SQL scripts because they reference tables/views that must
# exist first:
#   - Script 13 (sql/13-horizon.sql): Row access policies + tag assignments
#   - Script 15 (sql/15-data-sharing.sql): Internal data share
#   - Script 16 (sql/16-external-sharing.sql): Federal oversight share
#   - Script 17 (sql/17-clean-rooms.sql): Cross-state benchmarking clean room
#
# This module creates the tag objects in the GOVERNANCE schema so they are
# available for assignment by the SQL scripts and dbt models.
# =============================================================================

# -----------------------------------------------------------------------------
# Tag: SENSITIVITY_LEVEL
# Classifies data sensitivity for access control decisions.
# Values: PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED
# -----------------------------------------------------------------------------
resource "snowflake_tag" "sensitivity_level" {
  database = var.database_name
  schema   = "GOVERNANCE"
  name     = "SENSITIVITY_LEVEL"
  comment  = "Data sensitivity classification for access control"

  allowed_values = [
    "PUBLIC",
    "INTERNAL",
    "CONFIDENTIAL",
    "RESTRICTED",
  ]
}

# -----------------------------------------------------------------------------
# Tag: DATA_DOMAIN
# Identifies the business domain that owns the data.
# Values map to EOTSS secretariat and functional areas.
# -----------------------------------------------------------------------------
resource "snowflake_tag" "data_domain" {
  database = var.database_name
  schema   = "GOVERNANCE"
  name     = "DATA_DOMAIN"
  comment  = "Business domain ownership classification"

  allowed_values = [
    "FINANCE",
    "PROCUREMENT",
    "WORKFORCE",
    "INVESTMENT",
    "ANALYTICS",
    "AUDIT",
  ]
}

# -----------------------------------------------------------------------------
# Tag: PII_FLAG
# Marks columns that contain personally identifiable information.
# Used by masking policies to restrict access.
# -----------------------------------------------------------------------------
resource "snowflake_tag" "pii_flag" {
  database = var.database_name
  schema   = "GOVERNANCE"
  name     = "PII_FLAG"
  comment  = "Indicates presence of personally identifiable information"

  allowed_values = [
    "TRUE",
    "FALSE",
  ]
}

# -----------------------------------------------------------------------------
# Tag: DATA_QUALITY_TIER
# Tracks the quality tier of a dataset after DQ validation.
# Used by downstream consumers to assess data trustworthiness.
# -----------------------------------------------------------------------------
resource "snowflake_tag" "data_quality_tier" {
  database = var.database_name
  schema   = "GOVERNANCE"
  name     = "DATA_QUALITY_TIER"
  comment  = "Data quality tier after validation (GOLD > SILVER > BRONZE)"

  allowed_values = [
    "GOLD",
    "SILVER",
    "BRONZE",
    "QUARANTINE",
  ]
}
