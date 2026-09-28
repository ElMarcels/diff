/**
 * Platform roles.
 *
 * - `user`      : regular player. Can submit their own games for review.
 * - `moderator` : platform moderator. Plays pending submissions, comments on
 *                 them and moves them through the review queue.
 * - `owner`     : platform owner (single account). Everything a moderator can
 *                 do, plus exclusive access to the owner panel where new mods
 *                 are added to the platform and roles are managed.
 *
 * The owner account is bootstrapped from OWNER_EMAIL (see `bootstrap.ts`), so
 * the very first person to register with that address becomes the owner.
 */
export const ROLES = ["user", "moderator", "owner"] as const;
export type UserRole = (typeof ROLES)[number];

export const DEFAULT_OWNER_EMAIL = "hola@elmarcels.xyz";

export function ownerEmail(): string {
  return (process.env.OWNER_EMAIL || DEFAULT_OWNER_EMAIL).trim().toLowerCase();
}

export function isModerator(role: string | null | undefined): boolean {
  return role === "moderator" || role === "owner";
}

export function isOwner(role: string | null | undefined): boolean {
  return role === "owner";
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Emails that are always promoted to `owner` on register/login. */
export function bootstrappedRole(email: string): UserRole | null {
  return normalizeEmail(email) === ownerEmail() ? "owner" : null;
}
