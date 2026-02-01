# =============================================================================
# Module: SPCS (Snowpark Container Services)
# Compute pool, image repository, network rule, and external access
# integration for the PRISM FinOps containerized application.
# =============================================================================

# -----------------------------------------------------------------------------
# SPCS Database and Schema
# Separate database to isolate container infrastructure from analytics data.
# -----------------------------------------------------------------------------
resource "snowflake_database" "spcs" {
  name    = "PRISM_SPCS"
  comment = "PRISM FinOps — Snowpark Container Services infrastructure"
}

resource "snowflake_schema" "app" {
  database = snowflake_database.spcs.name
  name     = "APP"
  comment  = "SPCS application schema — services, image repo, stages"
}

# -----------------------------------------------------------------------------
# Compute Pool
# CPU_X64_S with 1-3 nodes for the PRISM web application.
# -----------------------------------------------------------------------------
resource "snowflake_compute_pool" "prism" {
  name                   = "PRISM_COMPUTE_POOL"
  instance_family        = "CPU_X64_S"
  min_nodes              = 1
  max_nodes              = 3
  auto_suspend_secs      = 300
  auto_resume            = true
  initially_suspended    = true
  comment                = "PRISM FinOps application compute pool"
}

# -----------------------------------------------------------------------------
# Image Repository
# Container images are pushed here via docker push.
# -----------------------------------------------------------------------------
resource "snowflake_image_repository" "prism" {
  database = snowflake_database.spcs.name
  schema   = snowflake_schema.app.name
  name     = "PRISM_IMAGES"
  comment  = "Container images for PRISM FinOps services"
}

# -----------------------------------------------------------------------------
# Network Rule
# Allows outbound HTTPS to the Snowflake account host (required for
# Snowflake SDK connections from within the container).
# -----------------------------------------------------------------------------
resource "snowflake_network_rule" "spcs_egress" {
  database  = snowflake_database.spcs.name
  schema    = snowflake_schema.app.name
  name      = "PRISM_SPCS_EGRESS"
  comment   = "Allow outbound HTTPS from SPCS containers"
  type      = "HOST_PORT"
  mode      = "EGRESS"
  value_list = [
    "${var.snowflake_organization}-${var.snowflake_account}.snowflakecomputing.com",
  ]
}

# -----------------------------------------------------------------------------
# External Access Integration
# Binds the network rule to an integration that SPCS services can reference.
# -----------------------------------------------------------------------------
resource "snowflake_external_access_integration" "spcs" {
  name             = "PRISM_SPCS_ACCESS"
  comment          = "External access for PRISM SPCS containers"
  enabled          = true
  allowed_network_rules = [
    "\"${snowflake_database.spcs.name}\".\"${snowflake_schema.app.name}\".\"${snowflake_network_rule.spcs_egress.name}\""
  ]
}

# -----------------------------------------------------------------------------
# Grants — PRISM_APP_ROLE
# -----------------------------------------------------------------------------

# Database USAGE
resource "snowflake_grant_privileges_to_account_role" "spcs_db_usage" {
  account_role_name = var.app_role_name
  privileges        = ["USAGE"]

  on_account_object {
    object_type = "DATABASE"
    object_name = snowflake_database.spcs.name
  }
}

# Schema USAGE
resource "snowflake_grant_privileges_to_account_role" "spcs_schema_usage" {
  account_role_name = var.app_role_name
  privileges        = ["USAGE"]

  on_schema {
    schema_name = "\"${snowflake_database.spcs.name}\".\"${snowflake_schema.app.name}\""
  }
}

# Compute Pool USAGE
resource "snowflake_grant_privileges_to_account_role" "spcs_pool_usage" {
  account_role_name = var.app_role_name
  privileges        = ["USAGE", "MONITOR"]

  on_account_object {
    object_type = "COMPUTE POOL"
    object_name = snowflake_compute_pool.prism.name
  }
}

# Image Repository READ
resource "snowflake_grant_privileges_to_account_role" "spcs_image_read" {
  account_role_name = var.app_role_name
  privileges        = ["READ"]

  on_schema_object {
    object_type = "IMAGE REPOSITORY"
    object_name = "\"${snowflake_database.spcs.name}\".\"${snowflake_schema.app.name}\".\"${snowflake_image_repository.prism.name}\""
  }
}

# Bind service endpoint (account-level privilege)
resource "snowflake_grant_privileges_to_account_role" "spcs_bind_endpoint" {
  account_role_name = var.app_role_name
  privileges        = ["BIND SERVICE ENDPOINT"]

  on_account {
  }
}

# CREATE SERVICE on schema
resource "snowflake_grant_privileges_to_account_role" "spcs_create_service" {
  account_role_name = var.app_role_name
  privileges        = ["CREATE SERVICE"]

  on_schema {
    schema_name = "\"${snowflake_database.spcs.name}\".\"${snowflake_schema.app.name}\""
  }
}
