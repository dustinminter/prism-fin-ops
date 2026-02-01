# =============================================================================
# Module: Warehouse — Variables
# =============================================================================

variable "warehouse_size" {
  type        = string
  description = "Warehouse size (X-SMALL, SMALL, MEDIUM, etc.)"
}

variable "app_role_name" {
  type        = string
  description = "Application role to grant warehouse USAGE to"
}
