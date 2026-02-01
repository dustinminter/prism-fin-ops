# =============================================================================
# Module: Database
# Creates the FEDERAL_FINANCIAL_DATA database and all PRISM schemas.
# =============================================================================

locals {
  schemas = [
    "EOTSS_POC",
    "EOTSS_STAGING",
    "GOVERNANCE",
    "ANALYTICS",
    "SEMANTIC",
    "USASPENDING",
  ]
}

# -----------------------------------------------------------------------------
# Database
# -----------------------------------------------------------------------------
resource "snowflake_database" "prism" {
  name                        = "FEDERAL_FINANCIAL_DATA"
  comment                     = "PRISM FinOps Intelligence — ${var.environment}"
  data_retention_time_in_days = 7
}

# -----------------------------------------------------------------------------
# Schemas
# -----------------------------------------------------------------------------
resource "snowflake_schema" "schemas" {
  for_each = toset(local.schemas)

  database                    = snowflake_database.prism.name
  name                        = each.value
  comment                     = "PRISM FinOps — ${each.value} schema"
  data_retention_time_in_days = 7
}
