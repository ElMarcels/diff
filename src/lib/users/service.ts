import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { authSessions, gameSubmissions, users } from "@/lib/db/schema";
import { SessionUser } from "@/lib/auth/session";
import { ROLES, UserRole, isModerator, isOwner, ownerEmail } from "@/lib/auth/roles";

/**
 * User administration for the platform owner panel: list accounts, promote
 * moderators, and demote. The OWNER_EMAIL account can never be demoted.
 */

export interface AdminUserRow {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: UserRole;
  xp: number;
  level: number;
  submissions: number;
  createdAt: string;
  lastLogin: string;
}

export async function listUsers(actor: SessionUser, search?: string): Promise<AdminUserRow[]> {
  if (!isOwner(actor.role)) return [];
  const db = getDb()!;

  // Submission totals are aggregated once and left-joined in.
  const counts = db
    .select({
      authorId: gameSubmissions.authorId,
      total: sql<number>`count(*)::int`.as("total"),
    })
    .from(gameSubmissions)
    .groupBy(gameSubmissions.authorId)
    .as("submission_counts");

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      email: users.email,
      role: users.role,
      xp: users.xp,
      level: users.level,
      createdAt: users.createdAt,
      lastLogin: users.lastLogin,
      submissionCount: sql<number>`coalesce(${counts.total}, 0)`,
    })
    .from(users)
    .leftJoin(counts, eq(counts.authorId, users.id))
    .orderBy(desc(users.createdAt));

  const needle = search?.trim().toLowerCase() ?? "";
  const filtered = needle
    ? rows.filter(
        (row) =>
          row.username.toLowerCase().includes(needle) ||
          (row.email ?? "").toLowerCase().includes(needle) ||
          (row.displayName ?? "").toLowerCase().includes(needle)
      )
    : rows;

  return filtered.map((row) => ({
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    email: row.email,
    role: (row.role as UserRole) ?? "user",
    xp: row.xp,
    level: row.level,
    submissions: Number(row.submissionCount ?? 0),
    createdAt: new Date(row.createdAt).toISOString(),
    lastLogin: new Date(row.lastLogin).toISOString(),
  }));
}

export type RoleChangeResult =
  | { ok: true; data: { id: string; role: UserRole } }
  | { ok: false; status: number; error: string };

export async function setUserRole(actor: SessionUser, userId: string, role: UserRole): Promise<RoleChangeResult> {
  const db = getDb()!;
  if (!isOwner(actor.role)) return { ok: false, status: 403, error: "Platform owner access only." };
  if (!ROLES.includes(role)) return { ok: false, status: 400, error: "Unknown role." };

  const [target] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!target) return { ok: false, status: 404, error: "User not found." };

  if (target.email.toLowerCase() === ownerEmail() && role !== "owner") {
    return { ok: false, status: 403, error: "The platform owner account cannot be demoted." };
  }
  if (target.id === actor.id && role !== "owner") {
    return { ok: false, status: 400, error: "You cannot remove your own owner access." };
  }

  const [updated] = await db
    .update(users)
    .set({ role })
    .where(eq(users.id, userId))
    .returning({ id: users.id, role: users.role });

  return { ok: true, data: { id: updated!.id, role: (updated!.role as UserRole) ?? role } };
}

/** Everyone who can be assigned as the reviewer of a submission. */
export async function listModerators(actor: SessionUser): Promise<{ id: string; username: string; role: UserRole }[]> {
  if (!isModerator(actor.role)) return [];
  const db = getDb()!;
  const rows = await db
    .select({ id: users.id, username: users.username, role: users.role })
    .from(users)
    .orderBy(users.username);
  return rows
    .map((row) => ({ id: row.id, username: row.username, role: (row.role as UserRole) ?? "user" }))
    .filter((row) => row.role === "moderator" || row.role === "owner");
}

/** Housekeeping: drop sessions that already expired. */
export async function pruneSessions(actor: SessionUser): Promise<{ ok: boolean; removed: number }> {
  if (!isOwner(actor.role)) return { ok: false, removed: 0 };
  const db = getDb()!;
  const stale = await db
    .select({ id: authSessions.id })
    .from(authSessions)
    .where(sql`${authSessions.expiresAt} < ${new Date()}`);
  if (stale.length === 0) return { ok: true, removed: 0 };
  await db.delete(authSessions).where(
    sql`${authSessions.id} in (${sql.join(stale.map((s) => sql`${s.id}`))})`
  );
  return { ok: true, removed: stale.length };
}
