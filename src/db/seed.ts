import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as dotenv from "dotenv";
dotenv.config({ path: "./.env.development" });

if (!("DATABASE_URL" in process.env))
  throw new Error("DATABASE_URL not found on .env.development");

const main = async () => {
  const client = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const db = drizzle(client);
  console.log("🚀 ~ main ~ db:", db);

  console.log("Seed start");
  // give your insert query here
  // await db.insert(usersTable).values(data);
  console.log("Seed done");
};

main();
