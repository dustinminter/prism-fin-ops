# =============================================================================
# Module: Warehouse
# PRISM_APP_WH — Application warehouse with aggressive auto-suspend.
# =============================================================================

resource "snowflake_warehouse" "app" {
  name           = "PRISM_APP_WH"
  warehouse_size = var.warehouse_size
  comment        = "PRISM FinOps application warehouse"

  auto_suspend             = 60
  auto_resume              = true
  initially_suspended      = true
  warehouse_type           = "STANDARD"
  enable_query_acceleration = false

  # Prevent runaway queries
  statement_timeout_in_seconds           = 3600
  statement_queued_timeout_in_seconds    = 600
}

# -----------------------------------------------------------------------------
# Grant USAGE to PRISM_APP_ROLE
# -----------------------------------------------------------------------------
resource "snowflake_grant_privileges_to_account_role" "app_wh_usage" {
  account_role_name = var.app_role_name
  privileges        = ["USAGE"]

  on_account_object {
    object_type = "WAREHOUSE"
    object_name = snowflake_warehouse.app.name
  }
}
