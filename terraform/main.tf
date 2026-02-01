# =============================================================================
# PRISM FinOps Intelligence — Snowflake Infrastructure
# =============================================================================
# Terraform deployment for the PRISM FinOps platform on a greenfield
# Archetype Consulting Snowflake account.
#
# Deployment order:
#   1. database   — FEDERAL_FINANCIAL_DATA + 6 schemas
#   2. roles      — PRISM_APP_ROLE / ADMIN / USER hierarchy
#   3. warehouse  — PRISM_APP_WH (X-SMALL, auto-suspend)
#   4. spcs       — Snowpark Container Services (compute pool, image repo)
#   5. automation — Event table (tasks deployed via SQL script 09)
#   6. governance — Horizon tags (policies deployed via SQL scripts 13-16)
#   7. stages     — Internal stage for ETL data loads
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    snowflake = {
      source  = "Snowflake-Labs/snowflake"
      version = "~> 1.0"
    }
  }

  backend "local" {
    path = "terraform.tfstate"
  }
}

provider "snowflake" {
  organization_name = var.snowflake_organization
  account_name      = var.snowflake_account
  user              = var.snowflake_user
  password          = var.snowflake_password
  role              = var.snowflake_role
}

# -----------------------------------------------------------------------------
# Module: Database
# Creates FEDERAL_FINANCIAL_DATA and all schemas
# -----------------------------------------------------------------------------
module "database" {
  source      = "./modules/database"
  environment = var.environment
}

# -----------------------------------------------------------------------------
# Module: Roles
# RBAC hierarchy: USER -> APP -> ADMIN -> ACCOUNTADMIN
# -----------------------------------------------------------------------------
module "roles" {
  source        = "./modules/roles"
  database_name = module.database.database_name
  schema_names  = module.database.schema_names
  depends_on    = [module.database]
}

# -----------------------------------------------------------------------------
# Module: Warehouse
# PRISM_APP_WH — X-SMALL with aggressive auto-suspend
# -----------------------------------------------------------------------------
module "warehouse" {
  source         = "./modules/warehouse"
  warehouse_size = var.warehouse_size
  app_role_name  = module.roles.app_role_name
  depends_on     = [module.roles]
}

# -----------------------------------------------------------------------------
# Module: SPCS (Snowpark Container Services)
# Compute pool, image repository, network rule, external access
# -----------------------------------------------------------------------------
module "spcs" {
  source                = "./modules/spcs"
  snowflake_account     = var.snowflake_account
  snowflake_organization = var.snowflake_organization
  app_role_name         = module.roles.app_role_name
  depends_on            = [module.roles]
}

# -----------------------------------------------------------------------------
# Module: Automation
# Event table for task/service logging (tasks deployed via SQL)
# -----------------------------------------------------------------------------
module "automation" {
  source        = "./modules/automation"
  database_name = module.database.database_name
  depends_on    = [module.database, module.warehouse]
}

# -----------------------------------------------------------------------------
# Module: Governance
# Horizon tags for data classification
# -----------------------------------------------------------------------------
module "governance" {
  source        = "./modules/governance"
  database_name = module.database.database_name
  depends_on    = [module.database]
}

# -----------------------------------------------------------------------------
# Module: Stages
# Internal stages for ETL data uploads
# -----------------------------------------------------------------------------
module "stages" {
  source        = "./modules/stages"
  database_name = module.database.database_name
  depends_on    = [module.database]
}
