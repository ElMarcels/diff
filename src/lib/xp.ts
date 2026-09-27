/**
 * Simple XP/level curve for v1.0 (brief section 14): each match grants XP,
 * winning grants more, and level is derived from cumulative XP rather than
 * stored redundantly, so the formula can be tuned later without a migration.
 */

const BASE_MATCH_XP = 10;
const WIN_BONUS_XP = 15;
const XP_PER_LEVEL = 150; // flat curve for v1.0; can become progressive later

export function xpForResult(result: "win" | "loss" | "draw" | "n/a"): number {
  if (result === "win") return BASE_MATCH_XP + WIN_BONUS_XP;
  return BASE_MATCH_XP;
}

export function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
}

export function xpProgress(xp: number): { level: number; current: number; needed: number; percent: number } {
  const level = levelFromXp(xp);
  const levelStartXp = (level - 1) * XP_PER_LEVEL;
  const current = xp - levelStartXp;
  return {
    level,
    current,
    needed: XP_PER_LEVEL,
    percent: Math.min(100, Math.round((current / XP_PER_LEVEL) * 100)),
  };
}
