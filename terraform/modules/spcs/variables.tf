# =============================================================================
# Module: SPCS — Variables
# =============================================================================

variable "snowflake_account" {
  type        = string
  description = "Snowflake account name (used to build the egress host)"
}

variable "snowflake_organization" {
  type        = string
  description = "Snowflake organization name (used to build the egress host)"
}

variable "app_role_name" {
  type        = string
  description = "Application role to grant SPCS privileges to"
}
