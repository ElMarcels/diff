import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt, ne } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/lib/db/client";
import { authSessions, users } from "@/lib/db/schema";
import { UserRole, bootstrappedRole } from "./roles";

/**
 * Cookie-based sessions backed by the `auth_sessions` table.
 *
 * The cookie holds a 32-byte random token; only its SHA-256 hash is stored,
 * so a database dump can't be replayed as a valid login. Sessions are
 * revocable (logout, password change, role changes) and expire on their own.
 */
export const SESSION_COOKIE = "diff_session";
export const SESSION_TTL_DAYS = 30;
const RENEW_THRESHOLD_DAYS = 7;

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar: string | null;
  role: UserRole;
  xp: number;
  level: number;
  locale: string;
  publicProfile: boolean;
  soundEnabled: boolean;
  animationsEnabled: boolean;
  createdAt: string;
  lastLogin: string;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function expiry(days = SESSION_TTL_DAYS): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

export async function createSession(userId: string): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not configured.");

  const token = randomBytes(32).toString("base64url");
  const expiresAt = expiry();

  await db.insert(authSessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  cookies().set(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

export async function destroySession(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    const db = getDb();
    if (db) await db.delete(authSessions).where(eq(authSessions.tokenHash, hashToken(token)));
  }
  cookies().delete(SESSION_COOKIE);
}

/** Log the user out everywhere else (called after a password change). */
export async function revokeOtherSessions(userId: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  const currentToken = cookies().get(SESSION_COOKIE)?.value;
  if (!currentToken) {
    await db.delete(authSessions).where(eq(authSessions.userId, userId));
    return;
  }
  await db
    .delete(authSessions)
    .where(and(eq(authSessions.userId, userId), ne(authSessions.tokenHash, hashToken(currentToken))));
}

/**
 * Resolves the cookie into a live user, or null.
 *
 * `syncCookie` must only be set from Route Handlers / Server Actions: Next
 * hands Server Components a read-only cookie jar, so writing there throws.
 * Pages call this without it and simply see null for a stale token.
 */
export async function getSessionUser(options?: { syncCookie?: boolean }): Promise<SessionUser | null> {
  if (!isDbConfigured()) return null;
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDb()!;
  const rows = await db
    .select({
      sessionId: authSessions.id,
      expiresAt: authSessions.expiresAt,
      id: users.id,
      email: users.email,
      username: users.username,
      displayName: users.displayName,
      avatar: users.avatar,
      role: users.role,
      xp: users.xp,
      level: users.level,
      locale: users.locale,
      publicProfile: users.publicProfile,
      soundEnabled: users.soundEnabled,
      animationsEnabled: users.animationsEnabled,
      createdAt: users.createdAt,
      lastLogin: users.lastLogin,
    })
    .from(authSessions)
    .innerJoin(users, eq(users.id, authSessions.userId))
    .where(and(eq(authSessions.tokenHash, hashToken(token)), gt(authSessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row) {
    if (options?.syncCookie) cookies().delete(SESSION_COOKIE);
    return null;
  }

  // Sliding expiry: keep active users logged in without storing anything.
  const remainingDays = (new Date(row.expiresAt).getTime() - Date.now()) / 86_400_000;
  if (remainingDays < RENEW_THRESHOLD_DAYS) {
    const next = expiry();
    await db.update(authSessions).set({ expiresAt: next }).where(eq(authSessions.id, row.sessionId));
    if (options?.syncCookie) cookies().set(SESSION_COOKIE, token, cookieOptions(next));
  }

  return {
    id: row.id,
    email: row.email,
    username: row.username,
    displayName: row.displayName,
    avatar: row.avatar,
    role: (row.role as UserRole) ?? "user",
    xp: row.xp,
    level: row.level,
    locale: row.locale,
    publicProfile: row.publicProfile,
    soundEnabled: row.soundEnabled,
    animationsEnabled: row.animationsEnabled,
    createdAt: new Date(row.createdAt).toISOString(),
    lastLogin: new Date(row.lastLogin).toISOString(),
  };
}

/** Keeps the OWNER_EMAIL account at owner level even if the role was edited. */
export async function ensureBootstrapRole(userId: string, email: string): Promise<UserRole> {
  const target = bootstrappedRole(email);
  if (!target) return "user";
  const db = getDb();
  if (!db) return target;

  const [row] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row) return target;
  if (row.role !== target) {
    await db.update(users).set({ role: target }).where(eq(users.id, userId));
  }
  return target;
}
