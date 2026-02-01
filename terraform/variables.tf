# =============================================================================
# Root Variables — PRISM FinOps Snowflake Infrastructure
# =============================================================================

# -----------------------------------------------------------------------------
# Snowflake Connection
# -----------------------------------------------------------------------------
variable "snowflake_organization" {
  type        = string
  description = "Snowflake organization name"
}

variable "snowflake_account" {
  type        = string
  description = "Snowflake account name within the organization"
}

variable "snowflake_user" {
  type        = string
  description = "Snowflake user for Terraform operations"
}

variable "snowflake_password" {
  type        = string
  sensitive   = true
  description = "Snowflake password for the Terraform service user"
}

variable "snowflake_role" {
  type        = string
  default     = "ACCOUNTADMIN"
  description = "Snowflake role for Terraform operations"
}

# -----------------------------------------------------------------------------
# Environment Configuration
# -----------------------------------------------------------------------------
variable "warehouse_size" {
  type        = string
  default     = "X-SMALL"
  description = "Warehouse size for PRISM_APP_WH (X-SMALL, SMALL, MEDIUM, etc.)"

  validation {
    condition     = contains(["X-SMALL", "SMALL", "MEDIUM", "LARGE", "X-LARGE"], var.warehouse_size)
    error_message = "warehouse_size must be one of: X-SMALL, SMALL, MEDIUM, LARGE, X-LARGE."
  }
}

variable "environment" {
  type        = string
  default     = "prod"
  description = "Deployment environment (dev, staging, prod)"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}
