// Load environment variables first, before any other imports
import dotenv from "dotenv";
dotenv.config();
import env from "./config/env";

import http from "http";
import { App } from "@/config/app";
import { httpHandle } from "@/core/modules/http/handle";
import { logger } from "@/config/pino";
import { checkDbConnection } from "@/db";

async function bootstrap(): Promise<void> {
  try {
    const port = env.APP_PORT;

    // create express app
    const app = new App();
    const expressApp = await app.create();
    const server = http.createServer(expressApp);

    // Check database connection first
    await checkDbConnection();

    // http handle
    const { onError, onListening } = httpHandle(server, Number(port));

    server.listen(port);
    server.on("error", onError);
    server.on("listening", onListening);

    logger.info(`Server running on port ${port}`);

    // Setup graceful shutdown
    setupGracefulShutdown(server);
  } catch (error) {
    logger.error("Bootstrap error:", error);
    process.exit(1);
  }
}

/**
 * Setup graceful shutdown to clean up resources
 */
function setupGracefulShutdown(server: http.Server): void {
  // Handle SIGTERM signal
  process.on("SIGTERM", () => {
    logger.info("SIGTERM signal received: closing HTTP server");
    shutdown(server);
  });

  // Handle SIGINT signal (Ctrl+C)
  process.on("SIGINT", () => {
    logger.info("SIGINT signal received: closing HTTP server");
    shutdown(server);
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception:", error);
    shutdown(server);
  });
}

/**
 * Perform cleanup and shut down the server
 */
function shutdown(server: http.Server): void {
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  // Force close after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
}

// Start the application
bootstrap();
