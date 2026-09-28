import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, isDbConfigured } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { getSessionUser, revokeOtherSessions, SessionUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { isOwner } from "@/lib/auth/roles";
import { jsonError, readJson, requireUser, isResponse } from "@/lib/auth/guards";
import { fieldErrors, passwordChangeSchema, profileSchema } from "@/lib/auth/validation";

export const dynamic = "force-dynamic";

/**
 * GET   /api/auth/me   → the signed-in user (or null)
 * PATCH /api/auth/me   → update profile preferences
 * PUT   /api/auth/me/password → change password (revokes other sessions)
 */
export async function GET() {
  const user = await getSessionUser({ syncCookie: true });
  return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(req: Request) {
  const guard = await requireUser();
  if (isResponse(guard)) return guard;
  const user = guard;

  const body = await readJson(req);
  if (!body) return jsonError(400, "Invalid JSON body.");

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "Check the highlighted fields.", { fields: fieldErrors(parsed.error) });
  }

  const db = getDb()!;
  const { username, displayName, locale, publicProfile, soundEnabled, animationsEnabled } = parsed.data;

  if (username && username !== user.username) {
    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
    if (taken) {
      return jsonError(409, "That username is taken.", { fields: { username: "Already in use." } });
    }
  }

  const [updated] = await db
    .update(users)
    .set({
      ...(username ? { username } : {}),
      ...(displayName ? { displayName } : {}),
      ...(locale ? { locale } : {}),
      ...(typeof publicProfile === "boolean" ? { publicProfile } : {}),
      ...(typeof soundEnabled === "boolean" ? { soundEnabled } : {}),
      ...(typeof animationsEnabled === "boolean" ? { animationsEnabled } : {}),
    })
    .where(eq(users.id, user.id))
    .returning();

  return NextResponse.json({ ok: true, user: serialize(updated) });
}

export async function PUT(req: Request) {
  const guard = await requireUser();
  if (isResponse(guard)) return guard;
  const user = guard;

  const body = await readJson(req);
  if (!body) return jsonError(400, "Invalid JSON body.");

  const parsed = passwordChangeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "Check the highlighted fields.", { fields: fieldErrors(parsed.error) });
  }

  if (!isDbConfigured()) return jsonError(503, "Accounts are unavailable: the database is not configured.");

  const db = getDb()!;
  const [row] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (!row) return jsonError(404, "Account not found.");

  if (!verifyPassword(parsed.data.currentPassword, row.passwordHash)) {
    return jsonError(401, "Your current password is not correct.", {
      fields: { currentPassword: "Incorrect password." },
    });
  }

  await db
    .update(users)
    .set({ passwordHash: hashPassword(parsed.data.newPassword), passwordChangedAt: new Date() })
    .where(eq(users.id, user.id));

  await revokeOtherSessions(user.id);
  return NextResponse.json({ ok: true });
}

function serialize(row: typeof users.$inferSelect): SessionUser {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    displayName: row.displayName,
    avatar: row.avatar,
    role: isOwner(row.role) ? "owner" : (row.role as SessionUser["role"]),
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
