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
/** Postgres error codes that mean "the database is up, the query wasn't". */
const FATAL_DB_CODES = new Set([
  "28P01", // invalid_password
  "28000", // invalid_authorization_specification
  "3D000", // invalid_catalog_name (database does not exist)
  "42P01", // undefined_table (migrations not applied)
  "42501", // insufficient_privilege
]);

/**
 * True when a DB failure is worth surfacing to the user. A missing table or
 * bad credentials is actionable; a dropped connection is usually a blip and
 * would only produce a confusing message if reported on every request.
 */
export function isActionableDbError(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return typeof code === "string" && FATAL_DB_CODES.has(code);
}

/** Short, non-leaky summary of a DB error for user-facing copy. */
export function describeDbError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code;
  switch (code) {
    case "42P01":
      return "The database has not been set up yet. Run `npm run db:migrate`.";
    case "28P01":
    case "28000":
    case "42501":
      return "The database rejected the credentials in DATABASE_URL.";
    case "3D000":
      return "DATABASE_URL points to a database that does not exist.";
    default:
      return "The database is unreachable. Check DATABASE_URL.";
  }
}

export function getDb() {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  // Fail fast with a clear message rather than hanging on the first query.
  const client = postgres(url, { max: 1, connect_timeout: 10, idle_timeout: 20 });
  _db = drizzle(client, { schema });
  return _db;
}

export const isDbConfigured = () => Boolean(process.env.DATABASE_URL);
