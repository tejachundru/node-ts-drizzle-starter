import env from "@/config/env";
import { logger } from "@/config/pino";
import "dotenv/config";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";

const db = drizzle({
  connection: env.DATABASE_URL,
  schema: schema,
});

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const checkDbConnection = async (retries = MAX_RETRIES) => {
  try {
    await db.execute(sql`select 1`);
    logger.info("Database connected");
  } catch (error) {
    if (retries > 0) {
      logger.warn(
        `Database Connection failed, retrying... (${retries} attempts left)`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return checkDbConnection(retries - 1);
    }
    logger.error("Unable to connect to the database:", error);
    throw error;
  }
};

export { checkDbConnection, db };
export default db;
