# PRISM FinOps - Snowflake Container Services (SPCS) Deployment

This directory contains everything needed to deploy PRISM FinOps to Snowflake Container Services.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Snowflake Container Services                     │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    PRISM_COMPUTE_POOL                         │  │
│  │                    (CPU_X64_S, 1-3 nodes)                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │  │
│  │  │   Router    │  │   Backend   │  │  Frontend   │          │  │
│  │  │   (nginx)   │──│  (Node.js)  │  │   (nginx)   │          │  │
│  │  │  port 8080  │  │  port 3000  │  │   port 80   │          │  │
│  │  │   PUBLIC    │  │             │  │             │          │  │
│  │  └──────┬──────┘  └──────▲──────┘  └──────▲──────┘          │  │
│  │         │                │                │                  │  │
│  │         └────────────────┴────────────────┘                  │  │
│  │              SPCS Internal DNS Resolution                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                  Snowflake Data Platform                    │    │
│  │  - FEDERAL_FINANCIAL_DATA database                         │    │
│  │  - Auto-provisioned OAuth tokens                           │    │
│  │  - Cortex AI/ML functions                                  │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
spcs/
├── docker/                    # Dockerfiles and configs
│   ├── backend.Dockerfile     # Backend service image
│   ├── frontend.Dockerfile    # Frontend service image
│   ├── router.Dockerfile      # Router/ingress image
│   ├── nginx-frontend.conf    # Frontend nginx config
│   └── nginx-router.conf      # Router nginx config
├── specs/                     # Service specifications (reference)
│   ├── backend.yaml           # Backend service spec
│   ├── frontend.yaml          # Frontend service spec
│   └── router.yaml            # Router service spec
├── sql/                       # Snowflake SQL scripts
│   ├── 01-infrastructure.sql  # Create compute pool, roles, etc.
│   └── 02-deploy-services.sql # Deploy services with specs
├── scripts/                   # Deployment automation
│   ├── build.sh               # Build Docker images
│   └── deploy.sh              # Deploy to SPCS
└── README.md                  # This file
```

## Prerequisites

1. **Snowflake Account** with SPCS enabled
2. **SnowSQL** installed and configured
3. **Docker** installed locally
4. **ACCOUNTADMIN** or equivalent privileges for initial setup

### SnowSQL Configuration

Add a connection profile to `~/.snowsql/config`:

```ini
[connections.prism]
accountname = <your-snowflake-account>
username = YOUR_USERNAME
authenticator = externalbrowser
```

## Deployment Steps

### 1. Set Up Infrastructure

Run the infrastructure setup to create the compute pool, image repository, and roles:

```bash
cd spcs/scripts
./deploy.sh setup
```

This creates:
- `PRISM_SPCS` database
- `PRISM_COMPUTE_POOL` (1-3 CPU_X64_S nodes)
- `PRISM_SPCS.APP.IMAGES` repository
- `PRISM_APP_ROLE` and `PRISM_USER_ROLE`

### 2. Build and Push Images

Build the Docker images and push to Snowflake's image registry:

```bash
# Build all images
./build.sh all

# Push to registry (requires authentication)
./build.sh push

# Or do both in one step
./build.sh build-push
```

### 3. Deploy Services

Once images are pushed, deploy the services:

```bash
./deploy.sh services
```

### 4. Get the Public URL

After deployment, get the public URL:

```bash
./deploy.sh url
```

The URL will be in the format:
`https://<random>.snowflakecomputing.app`

## Management Commands

```bash
# Check service status
./deploy.sh status

# View service logs
./deploy.sh logs PRISM_BACKEND

# Restart all services
./deploy.sh restart

# Suspend services (stop costs)
./deploy.sh suspend

# Resume services
./deploy.sh resume
```

## Authentication

SPCS automatically provides OAuth tokens for database access:
- Token location: `/snowflake/session/token`
- Token type: Auto-provisioned OAuth
- Token refresh: ~4 hours (handled automatically)

The backend reads this token and uses it for all Snowflake queries. No OAuth configuration needed!

## Service Roles

- `PRISM_APP_ROLE`: Service execution role (owns services)
- `PRISM_USER_ROLE`: End-user access role
- `PRISM_ROUTER!APP_USER`: Service role for public endpoint access

Grant user access:
```sql
GRANT ROLE PRISM_USER_ROLE TO USER your_user;
```

## Costs

SPCS compute costs are based on:
- **Compute Pool**: CPU_X64_S nodes (~$0.07/credit-hour)
- **Auto-suspend**: 5 minutes of inactivity
- **Scaling**: 1-3 nodes based on load

To minimize costs:
- Suspend services when not in use: `./deploy.sh suspend`
- Auto-suspend is configured for the compute pool

## Troubleshooting

### Services not starting

Check logs:
```bash
./deploy.sh logs PRISM_BACKEND
```

### Images not found

Verify images are in the repository:
```sql
SHOW IMAGES IN IMAGE REPOSITORY PRISM_SPCS.APP.IMAGES;
```

### Connection issues

Verify compute pool is running:
```sql
SHOW COMPUTE POOLS LIKE 'PRISM%';
DESCRIBE COMPUTE POOL PRISM_COMPUTE_POOL;
```

### Token errors

In SPCS, tokens are auto-provisioned. If issues occur:
1. Check the token file exists: `/snowflake/session/token`
2. Verify the service role has correct grants
3. Restart the service

## Local Development

For local development, the backend falls back to username/password authentication:

```bash
export SNOWFLAKE_USER=your_username
export SNOWFLAKE_PASSWORD=your_password
pnpm dev
```
