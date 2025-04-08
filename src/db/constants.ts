import { sql } from "drizzle-orm";
import { timestamp } from "drizzle-orm/pg-core";

export const timeStamps = {
  createdAt: timestamp("created_at", { mode: "string" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull()
    .$onUpdateFn(() => sql`CURRENT_TIMESTAMP`),
};
