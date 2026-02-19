#!/bin/bash
# ============================================================================
# PRISM FinOps - Build Docker Images for SPCS
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
if [ -z "${SNOWFLAKE_ACCOUNT}" ]; then
    echo -e "${RED}Error: SNOWFLAKE_ACCOUNT environment variable is required${NC}"
    echo "Usage: SNOWFLAKE_ACCOUNT=<org-account> $0 <command>"
    exit 1
fi
# Registry URL must be lowercase (Snowflake requirement)
IMAGE_REGISTRY="$(echo "${SNOWFLAKE_ACCOUNT}" | tr '[:upper:]' '[:lower:]').registry.snowflakecomputing.com"
IMAGE_REPO="prism_spcs/app/images"
TAG="${TAG:-latest}"

# Project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DOCKER_DIR="$SCRIPT_DIR/../docker"

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  PRISM FinOps - SPCS Image Builder${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "Registry:  ${YELLOW}${IMAGE_REGISTRY}${NC}"
echo -e "Repository: ${YELLOW}${IMAGE_REPO}${NC}"
echo -e "Tag:       ${YELLOW}${TAG}${NC}"
echo ""

# Check Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed or not in PATH${NC}"
    exit 1
fi

# Login to Snowflake image registry
login_registry() {
    echo -e "${YELLOW}Logging into Snowflake registry...${NC}"

    # Use snow spcs image-registry login command
    if command -v snow &> /dev/null; then
        echo "Using Snowflake CLI for registry login..."
        snow spcs image-registry login -c "${SNOWFLAKE_CONNECTION:-archetype}"
    else
        echo -e "${RED}Error: Snowflake CLI (snow) not found${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Logged into registry${NC}"
}

# Build an image
build_image() {
    local name=$1
    local dockerfile=$2
    local image_tag="${IMAGE_REGISTRY}/${IMAGE_REPO}/${name}:${TAG}"

    echo ""
    echo -e "${YELLOW}Building ${name}...${NC}"

    docker build \
        -t "$image_tag" \
        -f "$dockerfile" \
        --platform linux/amd64 \
        "$PROJECT_ROOT"

    echo -e "${GREEN}✓ Built ${name}${NC}"
}

# Push an image
push_image() {
    local name=$1
    local image_tag="${IMAGE_REGISTRY}/${IMAGE_REPO}/${name}:${TAG}"

    echo -e "${YELLOW}Pushing ${name}...${NC}"
    docker push "$image_tag"
    echo -e "${GREEN}✓ Pushed ${name}${NC}"
}

# Main build process
main() {
    cd "$PROJECT_ROOT"

    case "${1:-all}" in
        backend)
            build_image "backend" "$DOCKER_DIR/backend.Dockerfile"
            ;;
        frontend)
            build_image "frontend" "$DOCKER_DIR/frontend.Dockerfile"
            ;;
        router)
            build_image "router" "$DOCKER_DIR/router.Dockerfile"
            ;;
        all)
            build_image "backend" "$DOCKER_DIR/backend.Dockerfile"
            build_image "frontend" "$DOCKER_DIR/frontend.Dockerfile"
            build_image "router" "$DOCKER_DIR/router.Dockerfile"
            ;;
        push)
            login_registry
            push_image "backend"
            push_image "frontend"
            push_image "router"
            ;;
        build-push)
            build_image "backend" "$DOCKER_DIR/backend.Dockerfile"
            build_image "frontend" "$DOCKER_DIR/frontend.Dockerfile"
            build_image "router" "$DOCKER_DIR/router.Dockerfile"
            login_registry
            push_image "backend"
            push_image "frontend"
            push_image "router"
            ;;
        *)
            echo "Usage: $0 {backend|frontend|router|all|push|build-push}"
            echo ""
            echo "Commands:"
            echo "  backend    - Build backend image only"
            echo "  frontend   - Build frontend image only"
            echo "  router     - Build router image only"
            echo "  all        - Build all images (default)"
            echo "  push       - Push all images to registry"
            echo "  build-push - Build and push all images"
            exit 1
            ;;
    esac

    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  Build complete!${NC}"
    echo -e "${GREEN}============================================${NC}"
}

main "$@"
