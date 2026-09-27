import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Lazily-created DB client. When DATABASE_URL isn't set yet (e.g. during
 * local development before Neon is wired up), `getDb()` returns null and
 * callers fall back to mock data (see lib/services/*). This lets the whole
 * frontend run before the database exists, per the brief's requirement,
 * without ever using localStorage as a stand-in for real persistence.
 */
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const client = postgres(url, { max: 1 });
  _db = drizzle(client, { schema });
  return _db;
}

export const isDbConfigured = () => Boolean(process.env.DATABASE_URL);
