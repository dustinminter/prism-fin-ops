#!/bin/bash
# ============================================================================
# PRISM FinOps - Deploy Services to SPCS
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SNOWFLAKE_CONNECTION="${SNOWFLAKE_CONNECTION:-prism}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_DIR="$SCRIPT_DIR/../sql"

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  PRISM FinOps - SPCS Deployment${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# Check for Snowflake CLI (prefer 'snow' over legacy 'snowsql')
if command -v snow &> /dev/null; then
    SNOW_CMD="snow"
    USE_NEW_CLI=true
    echo -e "${BLUE}Using Snowflake CLI (snow)${NC}"
elif command -v snowsql &> /dev/null; then
    SNOW_CMD="snowsql"
    USE_NEW_CLI=false
    echo -e "${BLUE}Using SnowSQL (legacy)${NC}"
else
    echo -e "${RED}Error: Neither 'snow' nor 'snowsql' is installed${NC}"
    echo "Install Snowflake CLI: brew install snowflake-cli"
    exit 1
fi

# Run SQL file via Snowflake CLI
run_sql() {
    local sql_file=$1
    local description=$2

    echo -e "${YELLOW}Running: ${description}${NC}"
    echo -e "${BLUE}  File: ${sql_file}${NC}"

    if [ "$USE_NEW_CLI" = true ]; then
        snow sql -f "$sql_file" -c "$SNOWFLAKE_CONNECTION"
    else
        snowsql -c "$SNOWFLAKE_CONNECTION" -f "$sql_file" --option exit_on_error=true
    fi

    echo -e "${GREEN}✓ ${description} complete${NC}"
    echo ""
}

# Check service status
check_services() {
    echo -e "${YELLOW}Checking service status...${NC}"

    local sql="
        USE ROLE PRISM_APP_ROLE;
        USE DATABASE PRISM_SPCS;
        USE SCHEMA APP;
        SHOW SERVICES;
        SHOW ENDPOINTS IN SERVICE PRISM_ROUTER;
    "

    if [ "$USE_NEW_CLI" = true ]; then
        snow sql -q "$sql" -c "$SNOWFLAKE_CONNECTION"
    else
        snowsql -c "$SNOWFLAKE_CONNECTION" -q "$sql" -o output_format=plain
    fi

    echo ""
}

# Get service logs
get_logs() {
    local service=$1
    echo -e "${YELLOW}Getting logs for ${service}...${NC}"

    local sql="
        USE ROLE PRISM_APP_ROLE;
        USE DATABASE PRISM_SPCS;
        USE SCHEMA APP;
        CALL SYSTEM\$GET_SERVICE_LOGS('${service}', 0, 'backend', 100);
    "

    if [ "$USE_NEW_CLI" = true ]; then
        snow sql -q "$sql" -c "$SNOWFLAKE_CONNECTION"
    else
        snowsql -c "$SNOWFLAKE_CONNECTION" -q "$sql" -o output_format=plain
    fi
}

# Main deployment process
main() {
    case "${1:-deploy}" in
        setup)
            echo -e "${BLUE}Setting up SPCS infrastructure...${NC}"
            echo ""
            run_sql "$SQL_DIR/01-infrastructure.sql" "Infrastructure setup"
            echo -e "${GREEN}Infrastructure setup complete!${NC}"
            echo ""
            echo "Next steps:"
            echo "  1. Build and push Docker images: ./build.sh build-push"
            echo "  2. Deploy services: ./deploy.sh services"
            ;;

        services)
            echo -e "${BLUE}Deploying services to SPCS...${NC}"
            echo ""
            run_sql "$SQL_DIR/02-deploy-services.sql" "Service deployment"
            echo ""
            check_services
            ;;

        deploy)
            echo -e "${BLUE}Full deployment (infrastructure + services)...${NC}"
            echo ""
            run_sql "$SQL_DIR/01-infrastructure.sql" "Infrastructure setup"
            run_sql "$SQL_DIR/02-deploy-services.sql" "Service deployment"
            echo ""
            check_services
            ;;

        status)
            check_services
            ;;

        logs)
            if [ -z "$2" ]; then
                echo "Usage: $0 logs {PRISM_BACKEND|PRISM_FRONTEND|PRISM_ROUTER}"
                exit 1
            fi
            get_logs "$2"
            ;;

        restart)
            echo -e "${YELLOW}Restarting services...${NC}"
            local sql="
                USE ROLE PRISM_APP_ROLE;
                USE DATABASE PRISM_SPCS;
                USE SCHEMA APP;
                ALTER SERVICE PRISM_BACKEND SUSPEND;
                ALTER SERVICE PRISM_FRONTEND SUSPEND;
                ALTER SERVICE PRISM_ROUTER SUSPEND;
                ALTER SERVICE PRISM_BACKEND RESUME;
                ALTER SERVICE PRISM_FRONTEND RESUME;
                ALTER SERVICE PRISM_ROUTER RESUME;
            "
            if [ "$USE_NEW_CLI" = true ]; then
                snow sql -q "$sql" -c "$SNOWFLAKE_CONNECTION"
            else
                snowsql -c "$SNOWFLAKE_CONNECTION" -q "$sql" -o output_format=plain
            fi
            echo -e "${GREEN}Services restarted${NC}"
            ;;

        suspend)
            echo -e "${YELLOW}Suspending services...${NC}"
            local sql="
                USE ROLE PRISM_APP_ROLE;
                USE DATABASE PRISM_SPCS;
                USE SCHEMA APP;
                ALTER SERVICE PRISM_BACKEND SUSPEND;
                ALTER SERVICE PRISM_FRONTEND SUSPEND;
                ALTER SERVICE PRISM_ROUTER SUSPEND;
            "
            if [ "$USE_NEW_CLI" = true ]; then
                snow sql -q "$sql" -c "$SNOWFLAKE_CONNECTION"
            else
                snowsql -c "$SNOWFLAKE_CONNECTION" -q "$sql" -o output_format=plain
            fi
            echo -e "${GREEN}Services suspended${NC}"
            ;;

        resume)
            echo -e "${YELLOW}Resuming services...${NC}"
            local sql="
                USE ROLE PRISM_APP_ROLE;
                USE DATABASE PRISM_SPCS;
                USE SCHEMA APP;
                ALTER SERVICE PRISM_BACKEND RESUME;
                ALTER SERVICE PRISM_FRONTEND RESUME;
                ALTER SERVICE PRISM_ROUTER RESUME;
            "
            if [ "$USE_NEW_CLI" = true ]; then
                snow sql -q "$sql" -c "$SNOWFLAKE_CONNECTION"
            else
                snowsql -c "$SNOWFLAKE_CONNECTION" -q "$sql" -o output_format=plain
            fi
            echo -e "${GREEN}Services resumed${NC}"
            ;;

        url)
            echo -e "${YELLOW}Getting public URL...${NC}"
            local sql="
                USE ROLE PRISM_APP_ROLE;
                USE DATABASE PRISM_SPCS;
                USE SCHEMA APP;
                SHOW ENDPOINTS IN SERVICE PRISM_ROUTER;
            "
            if [ "$USE_NEW_CLI" = true ]; then
                snow sql -q "$sql" -c "$SNOWFLAKE_CONNECTION"
            else
                snowsql -c "$SNOWFLAKE_CONNECTION" -q "$sql" -o output_format=plain
            fi
            ;;

        *)
            echo "Usage: $0 {setup|services|deploy|status|logs|restart|suspend|resume|url}"
            echo ""
            echo "Commands:"
            echo "  setup     - Create SPCS infrastructure (compute pool, roles, etc.)"
            echo "  services  - Deploy services (after images are pushed)"
            echo "  deploy    - Full deployment (setup + services)"
            echo "  status    - Check service status"
            echo "  logs      - Get service logs (requires service name)"
            echo "  restart   - Restart all services"
            echo "  suspend   - Suspend all services"
            echo "  resume    - Resume all services"
            echo "  url       - Get public endpoint URL"
            exit 1
            ;;
    esac
}

main "$@"
