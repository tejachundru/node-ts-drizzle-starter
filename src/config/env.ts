import { validate } from "@/utils/validate";
import { green } from "colorette";
import { config } from "dotenv";
import fs from "fs";
import path from "path";
import { logger } from "./pino";

config();

const ENV_FILE = ".env";
const ENV_EXAMPLE_FILE = ".env.example";

export function checkEnv(): void {
  const envPath = path.resolve(ENV_FILE);

  if (!fs.existsSync(envPath)) {
    const envExample = green(ENV_EXAMPLE_FILE);
    const env = green(ENV_FILE);

    console.error(
      `Missing ${env} file! Please copy ${envExample} to ${env} in the root directory.`
    );
    process.exit(1);
  }
}

checkEnv();

/**
 *
 * @param key
 * @param fallback
 * @returns
 */
function _getEnv(key: string, fallback?: string | number | undefined): string {
  const value = process.env[key];

  if (!value && !fallback) {
    throw new Error(`Required environment variable ${key} is missing`);
  }

  if (!value && fallback !== undefined) {
    logger.warn(`Environment variable ${key} is missing, using fallback`);
    return String(fallback);
  }

  return value ?? "";
}

const appEnv = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 8000,
  APP_NAME: process.env.APP_NAME || "my-app",
  APP_PORT: process.env.APP_PORT || 8000,

  RATE_LIMIT: validate.number(_getEnv("RATE_LIMIT", 100)),
  RATE_DELAY: _getEnv("RATE_DELAY", "5m"),

  JWT_SECRET_ACCESS_TOKEN: _getEnv("JWT_SECRET_ACCESS_TOKEN"),
  // API Documentation settings
  ENABLE_API_DOCS: _getEnv("ENABLE_API_DOCS", "true"),
};

const DATABASE_URL = _getEnv("DATABASE_URL");

const mailEnv = {
  SMTP_HOST: _getEnv("SMTP_HOST"),
  SMTP_PORT: _getEnv("SMTP_PORT"),
  SMTP_SECURE: _getEnv("SMTP_SECURE", "false"),
  SMTP_USER: _getEnv("SMTP_USER"),
  SMTP_PASS: _getEnv("SMTP_PASS"),
  SMTP_FROM: _getEnv("SMTP_FROM"),
};

const env = {
  ...appEnv,
  ...mailEnv,
  DATABASE_URL,
};

export default env;
