import { eq } from "drizzle-orm";
import db from "@/db";
import * as schema from "@/db/schema";

export class SessionService {
  public async getByToken(
    table: typeof schema.userSessionTable,
    token: string
  ) {
    const session = await db
      .select()
      .from(table)
      .where(eq(table.token, token))
      .limit(1);

    if (!session.length) {
      return null;
    }
    return session[0];
  }

  public async createOrUpdateSession(
    table: typeof schema.userSessionTable,
    userId: number,
    token: string
  ) {
    //find session by token
    const query = db.select().from(table).where(eq(table.userId, userId));

    const session = await query.limit(1).then((data) => data[0]);

    if (session) {
      await db
        .update(table)
        .set({ userId, token })
        .where(eq(table.userId, userId))
        .returning();
    } else {
      const newSession = await db
        .insert(table)
        .values({ userId, token })
        .returning();
      return newSession[0];
    }

    return session;
  }

  public async deleteSession(
    table: typeof schema.userSessionTable,
    token: string
  ) {
    const data = await db
      .delete(table)
      .where(eq(table.token, token))
      .returning();
    return data;
  }

  public async sessionExists(
    table: typeof schema.userSessionTable,
    filter: { token?: string; userId?: number }
  ) {
    const query = db.select().from(table);

    if (filter.token) {
      query.where(eq(table.token, filter.token));
    }
    if (filter.userId) {
      query.where(eq(table.userId, filter.userId));
    }

    const session = await query.limit(1);
    return session.length > 0;
  }

  public async getAllSessions(table: typeof schema.userSessionTable) {
    const sessions = await db.select().from(table);

    return sessions;
  }

  public async getByUserId(
    table: typeof schema.userSessionTable,
    userId: number
  ) {
    const session = await db
      .select()
      .from(table)
      .where(eq(table.userId, userId))
      .limit(1);

    if (!session.length) {
      return null;
    }
    return session[0];
  }
}
