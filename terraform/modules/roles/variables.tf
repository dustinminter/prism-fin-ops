# =============================================================================
# Module: Roles — Variables
# =============================================================================

variable "database_name" {
  type        = string
  description = "Name of the PRISM database for grant targets"
}

variable "schema_names" {
  type        = list(string)
  description = "List of schema names to grant access to"
}
