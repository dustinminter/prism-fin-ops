/**
 * Production entry point for SPCS deployment.
 * This file does NOT import vite to avoid bundling issues.
 */
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./static";
import { getConnectionInfo, isSpcsEnvironment } from "../snowflake-spcs";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Health check endpoint for SPCS readiness probes
  app.get("/api/health", (req, res) => {
    const info = getConnectionInfo();
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: info.environment,
      spcs: isSpcsEnvironment(),
      database: info.database,
      warehouse: info.warehouse,
    });
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Serve static files (production mode only)
  serveStatic(app);

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Bind to 0.0.0.0 to accept connections from other containers in SPCS
  const host = "0.0.0.0";
  server.listen(port, host, () => {
    console.log(`PRISM FinOps server running on http://${host}:${port}/`);
    console.log(`Environment: ${isSpcsEnvironment() ? 'SPCS' : 'Standard'}`);

    // Debug: Print auto-injected Snowflake environment variables
    if (isSpcsEnvironment()) {
      console.log('[SPCS Debug] Auto-injected environment variables:');
      console.log(`  SNOWFLAKE_HOST: ${process.env.SNOWFLAKE_HOST || 'NOT SET'}`);
      console.log(`  SNOWFLAKE_ACCOUNT: ${process.env.SNOWFLAKE_ACCOUNT || 'NOT SET'}`);
      console.log(`  SNOWFLAKE_DATABASE: ${process.env.SNOWFLAKE_DATABASE || 'NOT SET'}`);
      console.log(`  SNOWFLAKE_SCHEMA: ${process.env.SNOWFLAKE_SCHEMA || 'NOT SET'}`);
    }
  });
}

startServer().catch(console.error);
