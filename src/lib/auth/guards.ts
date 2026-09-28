import { NextResponse } from "next/server";
import { getDb, isDbConfigured, describeDbError, isActionableDbError } from "@/lib/db/client";
import { getSessionUser, SessionUser } from "./session";
import { isModerator, isOwner } from "./roles";

/**
 * Guards + helpers shared by the API routes. Every mutating endpoint runs one
 * of these first, so authorization is never decided by the client.
 */

export function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

export function dbUnavailable() {
  return jsonError(503, "This feature needs DATABASE_URL to be configured.");
}

/**
 * Wraps a route handler so any unhandled throw becomes a JSON response.
 *
 * Without this, a failing DB query (migrations not applied, wrong URL) produced
 * a bare 500 with no body, and the client showed a useless "Something went
 * wrong." Database failures get an actionable 503; anything else is a 500 that
 * at least says what happened. The real error is always logged server-side.
 *
 * Returns a function, not a promise: Next requires exported handlers to be
 * callable, so `export const POST = withErrorHandling(async (req) => ...)` works.
 */
export function withErrorHandling<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<Response>
): (...args: TArgs) => Promise<Response> {
  return async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (err) {
      if (isDbError(err)) {
        console.error("[api] database error:", describeDbError(err), err);
        const message = isActionableDbError(err)
          ? describeDbError(err)
          : "The database is temporarily unreachable. Try again in a moment.";
        return jsonError(503, message);
      }
      console.error("[api] unhandled error:", err);
      const message = err instanceof Error ? err.message : "Unexpected server error.";
      return jsonError(500, "Something went wrong on our side.", { detail: message });
    }
  };
}

function isDbError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  // postgres.js and the pg protocol both surface failures as errors carrying a
  // SQLSTATE; anything with one came from the database.
  return Boolean((err as { code?: unknown }).code) || /postgres|connect|ECONN/i.test(err.message);
}

type GuardResult = SessionUser | NextResponse;

/** Signed in (any role). */
export async function requireUser(): Promise<GuardResult> {
  const user = await getSessionUser({ syncCookie: true });
  if (!user) return jsonError(401, "You need to be signed in.");
  return user;
}

/** Platform moderator or the owner. */
export async function requireModerator(): Promise<GuardResult> {
  const user = await getSessionUser({ syncCookie: true });
  if (!user) return jsonError(401, "You need to be signed in.");
  if (!isModerator(user.role)) return jsonError(403, "Moderator access only.");
  return user;
}

/** The platform owner account only. */
export async function requireOwner(): Promise<GuardResult> {
  const user = await getSessionUser({ syncCookie: true });
  if (!user) return jsonError(401, "You need to be signed in.");
  if (!isOwner(user.role)) return jsonError(403, "Platform owner access only.");
  return user;
}

export function isResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

/** Parses a JSON body, returning null when it's malformed. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export { isDbConfigured };
