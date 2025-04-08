import {
  pgTable,
  serial,
  text,
  integer,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import { timeStamps } from "./constants";
import { sql } from "drizzle-orm";

export const userTable = pgTable("user", {
  id: serial("id").primaryKey().notNull(),
  name: varchar("first_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  password: varchar({ length: 255 }).default(sql`NULL`),
  passwordToken: varchar("password_token", { length: 255 }).default(sql`NULL`),
  isActive: boolean().default(true).notNull(),
  isEmailVerified: boolean("is_email_verified").default(false).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  ...timeStamps,
});

export const userSessionTable = pgTable("userSession", {
  id: serial().primaryKey().notNull(),
  userId: integer("user_id")
    .notNull()
    .references((): typeof userTable.id => userTable.id, {
      onDelete: "cascade",
    }),
  token: text("token").notNull(),
  ...timeStamps,
});
