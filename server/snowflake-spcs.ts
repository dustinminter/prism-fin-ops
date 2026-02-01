import snowflake from "snowflake-sdk";
import fs from "fs";
import path from "path";

// ============================================================================
// SPCS (Snowflake Container Services) Authentication Module
// Handles both SPCS environment (auto-provisioned OAuth) and local development
// ============================================================================

// SPCS token location (auto-provisioned by Snowflake)
const SPCS_TOKEN_PATH = "/snowflake/session/token";

// Environment detection
const IS_SPCS_ENVIRONMENT = fs.existsSync(SPCS_TOKEN_PATH);

// Configuration from environment — no hardcoded credentials
const SNOWFLAKE_CONFIG = {
  get account() {
    const val = process.env.SNOWFLAKE_ACCOUNT;
    if (!val && !IS_SPCS_ENVIRONMENT) {
      throw new Error("[Snowflake] SNOWFLAKE_ACCOUNT environment variable is required");
    }
    return val || "";
  },
  get host() {
    return process.env.SNOWFLAKE_HOST || `${process.env.SNOWFLAKE_ACCOUNT}.snowflakecomputing.com`;
  },
  warehouse: process.env.SNOWFLAKE_WAREHOUSE || "PRISM_APP_WH",
  database: process.env.SNOWFLAKE_DATABASE || "FEDERAL_FINANCIAL_DATA",
  schema: process.env.SNOWFLAKE_SCHEMA || "USASPENDING",
  role: process.env.SNOWFLAKE_ROLE || "PRISM_APP_ROLE",
  username: process.env.SNOWFLAKE_USER || "",
  password: process.env.SNOWFLAKE_PASSWORD || "",
};

// Connection pool management
let connectionPool: snowflake.Connection | null = null;
let connectionPromise: Promise<snowflake.Connection> | null = null;
let tokenRefreshTimer: NodeJS.Timeout | null = null;

/**
 * Read the SPCS auto-provisioned OAuth token
 */
function readSpcsToken(): string {
  try {
    const token = fs.readFileSync(SPCS_TOKEN_PATH, "utf-8").trim();
    console.log("[SPCS] Read OAuth token successfully");
    return token;
  } catch (error) {
    throw new Error(`[SPCS] Failed to read token from ${SPCS_TOKEN_PATH}: ${error}`);
  }
}

/**
 * Create connection options based on environment
 */
function getConnectionOptions(): snowflake.ConnectionOptions {
  const baseOptions = {
    account: SNOWFLAKE_CONFIG.account,
    warehouse: SNOWFLAKE_CONFIG.warehouse,
    database: SNOWFLAKE_CONFIG.database,
    schema: SNOWFLAKE_CONFIG.schema,
    role: SNOWFLAKE_CONFIG.role,
  };

  if (IS_SPCS_ENVIRONMENT) {
    // SPCS: Use OAuth with auto-provisioned token
    // IMPORTANT: Snowflake auto-injects SNOWFLAKE_HOST with the correct internal hostname
    // We MUST use this auto-injected value, not our own
    const token = readSpcsToken();
    const spcsHost = process.env.SNOWFLAKE_HOST;
    const spcsAccount = process.env.SNOWFLAKE_ACCOUNT;

    if (!spcsHost) {
      throw new Error("[SPCS] SNOWFLAKE_HOST environment variable not found - this should be auto-injected by Snowflake");
    }

    console.log("[SPCS] Using OAuth authentication with auto-provisioned token");
    console.log(`[SPCS] Auto-injected SNOWFLAKE_HOST: ${spcsHost}`);
    console.log(`[SPCS] Auto-injected SNOWFLAKE_ACCOUNT: ${spcsAccount}`);

    return {
      ...baseOptions,
      account: spcsAccount || SNOWFLAKE_CONFIG.account,
      host: spcsHost,
      authenticator: "OAUTH",
      token: token,
    };
  } else {
    // Local development: Use username/password
    console.log("[Snowflake] Using password authentication (local dev)");
    if (!SNOWFLAKE_CONFIG.username || !SNOWFLAKE_CONFIG.password) {
      throw new Error(
        "[Snowflake] SNOWFLAKE_USER and SNOWFLAKE_PASSWORD required for local development"
      );
    }
    return {
      ...baseOptions,
      username: SNOWFLAKE_CONFIG.username,
      password: SNOWFLAKE_CONFIG.password,
    };
  }
}

/**
 * Get or create a Snowflake connection with SPCS support
 */
export async function getSnowflakeConnection(): Promise<snowflake.Connection> {
  if (connectionPool) {
    return connectionPool;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = new Promise((resolve, reject) => {
    try {
      const options = getConnectionOptions();
      const connection = snowflake.createConnection(options);

      connection.connect((err, conn) => {
        if (err) {
          console.error("[Snowflake] Connection failed:", err.message);
          connectionPromise = null;
          reject(err);
        } else {
          const authType = IS_SPCS_ENVIRONMENT ? "SPCS OAuth" : "password";
          console.log(`[Snowflake] Connected successfully via ${authType}`);
          connectionPool = conn;

          // Set up token refresh for SPCS (tokens expire after ~4 hours)
          if (IS_SPCS_ENVIRONMENT) {
            setupTokenRefresh();
          }

          resolve(conn);
        }
      });
    } catch (error) {
      connectionPromise = null;
      reject(error);
    }
  });

  return connectionPromise;
}

/**
 * Set up periodic token refresh for SPCS environment
 * Tokens are refreshed every 3 hours (before 4-hour expiry)
 */
function setupTokenRefresh(): void {
  const REFRESH_INTERVAL = 3 * 60 * 60 * 1000; // 3 hours

  if (tokenRefreshTimer) {
    clearInterval(tokenRefreshTimer);
  }

  tokenRefreshTimer = setInterval(async () => {
    console.log("[SPCS] Refreshing connection with new token...");
    try {
      await closeConnection();
      await getSnowflakeConnection();
      console.log("[SPCS] Token refresh successful");
    } catch (error) {
      console.error("[SPCS] Token refresh failed:", error);
    }
  }, REFRESH_INTERVAL);
}

/**
 * Close the Snowflake connection
 */
export async function closeConnection(): Promise<void> {
  if (tokenRefreshTimer) {
    clearInterval(tokenRefreshTimer);
    tokenRefreshTimer = null;
  }

  if (connectionPool) {
    return new Promise((resolve, reject) => {
      connectionPool!.destroy((err) => {
        if (err) {
          console.error("[Snowflake] Failed to close connection:", err.message);
          reject(err);
        } else {
          console.log("[Snowflake] Connection closed");
          connectionPool = null;
          connectionPromise = null;
          resolve();
        }
      });
    });
  }
}

/**
 * Check if running in SPCS environment
 */
export function isSpcsEnvironment(): boolean {
  return IS_SPCS_ENVIRONMENT;
}

/**
 * Get connection info for debugging
 */
export function getConnectionInfo(): {
  environment: string;
  account: string;
  database: string;
  warehouse: string;
  schema: string;
} {
  return {
    environment: IS_SPCS_ENVIRONMENT ? "SPCS" : "local",
    account: SNOWFLAKE_CONFIG.account,
    database: SNOWFLAKE_CONFIG.database,
    warehouse: SNOWFLAKE_CONFIG.warehouse,
    schema: SNOWFLAKE_CONFIG.schema,
  };
}

// Graceful shutdown
process.on("SIGINT", async () => {
  await closeConnection();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeConnection();
  process.exit(0);
});
