import { NextResponse } from "next/server";
import { getDb, isDbConfigured } from "@/lib/db/client";
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
