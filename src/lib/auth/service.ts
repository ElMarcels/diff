import { eq, or } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { UserRole, bootstrappedRole, normalizeEmail } from "./roles";
import { burnPasswordCheck, hashPassword, verifyPassword } from "./password";

/**
 * Account lifecycle for DIFF's own sign-up / sign-in system.
 * Shared by the API routes and by the CLI bootstrap script.
 */

export type AuthFailure = { ok: false; status: number; error: string; fields?: Record<string, string> };
export type AuthSuccess = {
  ok: true;
  userId: string;
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
};
export type AuthResult = AuthSuccess | AuthFailure;

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

export async function registerAccount(input: {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}): Promise<AuthResult> {
  const db = getDb();
  if (!db) {
    return { ok: false, status: 503, error: "Accounts are unavailable: the database is not configured." };
  }

  const email = normalizeEmail(input.email);
  const username = input.username;

  const [byEmail] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (byEmail) {
    return { ok: false, status: 409, error: "An account with that email already exists.", fields: { email: "Already in use." } };
  }
  const [byUsername] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (byUsername) {
    return { ok: false, status: 409, error: "That username is taken.", fields: { username: "Already in use." } };
  }

  // The platform owner address is always created as owner + moderator.
  const role: UserRole = bootstrappedRole(email) ?? "user";

  const [created] = await db
    .insert(users)
    .values({
      email,
      passwordHash: hashPassword(input.password),
      username,
      displayName: input.displayName?.trim() || username,
      role,
      lastLogin: new Date(),
    })
    .returning({ id: users.id, email: users.email, username: users.username, displayName: users.displayName, role: users.role });

  if (!created) {
    return { ok: false, status: 500, error: "Could not create the account." };
  }

  return {
    ok: true,
    userId: created.id,
    email: created.email,
    username: created.username,
    displayName: created.displayName,
    role: (created.role as UserRole) ?? role,
  };
}

export async function authenticate(emailInput: string, password: string): Promise<AuthResult> {
  const db = getDb();
  if (!db) {
    return { ok: false, status: 503, error: "Accounts are unavailable: the database is not configured." };
  }

  const email = normalizeEmail(emailInput);
  const rows = await db
    .select()
    .from(users)
    .where(or(eq(users.email, email)))
    .limit(1);

  const user = rows[0];
  if (!user) {
    burnPasswordCheck(); // keep timing flat between unknown email and wrong password
    return { ok: false, status: 401, error: "Incorrect email or password." };
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return { ok: false, status: 401, error: "Incorrect email or password." };
  }

  await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id));

  return {
    ok: true,
    userId: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    role: (user.role as UserRole) ?? "user",
  };
}
