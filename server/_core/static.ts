import express, { type Express } from "express";
import fs from "fs";
import path from "path";

/**
 * Production-only static file serving.
 * This file does NOT import vite to avoid bundling issues.
 */
export function serveStatic(app: Express) {
  // In production Docker container, static files are at /app/dist/public
  // Check multiple possible locations
  const possiblePaths = [
    path.resolve(import.meta.dirname, "public"),          // Relative to dist/index.js
    path.resolve(import.meta.dirname, "..", "public"),    // Up one level
    "/app/dist/public",                                    // Docker absolute path
  ];

  let distPath: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      distPath = p;
      break;
    }
  }

  if (!distPath) {
    console.warn(
      `Could not find the build directory in any of: ${possiblePaths.join(", ")}`
    );
    // Use first path as fallback
    distPath = possiblePaths[0];
  } else {
    console.log(`Serving static files from: ${distPath}`);
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath!, "index.html"));
  });
}
