import { sql, type SQL } from "drizzle-orm";
import { gameSessions, gameStats } from "@/lib/db/schema";
import { Difficulty, LeaderboardMetric, LeaderboardPeriod } from "@/types";

/**
 * Allow-list for every value that reaches SQL from a query string.
 *
 * `?period=`, `?metric=` and `?difficulty=` are attacker-controlled, so they
 * are never interpolated into a query. They are resolved to one of the
 * constants below, and the SQL fragments come from the two maps at the bottom
 * of this file. There is no `sql.raw()` anywhere in the stats layer (D8).
 *
 * Server-only: it imports the Drizzle schema, so it must never be pulled into
 * a client bundle.
 */

export const LEADERBOARD_PERIODS: readonly LeaderboardPeriod[] = ["all", "weekly", "monthly"];
export const LEADERBOARD_METRICS: readonly LeaderboardMetric[] = [
  "highScore",
  "wins",
  "gamesPlayed",
  "totalScore",
];
export const DIFFICULTIES: readonly Difficulty[] = ["easy", "normal", "hard"];

/** Rolling window length per period. `all` reads the lifetime `game_stats`. */
const PERIOD_DAYS: Record<LeaderboardPeriod, number | null> = {
  all: null,
  weekly: 7,
  monthly: 30,
};

/**
 * Metric a game is ranked by when the URL doesn't ask for one. Kept in code
 * instead of a `games.metric` column to avoid a migration; a community game
 * without an entry falls back to games played, which every game has.
 */
const DEFAULT_METRIC_BY_GAME: Record<string, LeaderboardMetric> = {
  snake: "highScore",
  connect4: "wins",
};

const FALLBACK_METRIC: LeaderboardMetric = "gamesPlayed";

/** Career score across every game: the global board's ranking metric. */
const GLOBAL_METRIC: LeaderboardMetric = "totalScore";

export function isLeaderboardPeriod(value: unknown): value is LeaderboardPeriod {
  return typeof value === "string" && (LEADERBOARD_PERIODS as readonly string[]).includes(value);
}

export function isLeaderboardMetric(value: unknown): value is LeaderboardMetric {
  return typeof value === "string" && (LEADERBOARD_METRICS as readonly string[]).includes(value);
}

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === "string" && (DIFFICULTIES as readonly string[]).includes(value);
}

export function parsePeriod(value: unknown): LeaderboardPeriod {
  return isLeaderboardPeriod(value) ? value : "all";
}

export function parseDifficulty(value: unknown): Difficulty | null {
  return isDifficulty(value) ? value : null;
}

/** Lower bound for the period window, or null when the period is `all`. */
export function periodStart(period: LeaderboardPeriod): Date | null {
  const days = PERIOD_DAYS[period];
  return days === null ? null : new Date(Date.now() - days * 86_400_000);
}

export function defaultMetricFor(gameSlug: string | null): LeaderboardMetric {
  if (gameSlug === null) return GLOBAL_METRIC;
  return DEFAULT_METRIC_BY_GAME[gameSlug] ?? FALLBACK_METRIC;
}

export function resolveMetric(gameSlug: string | null, requested: unknown): LeaderboardMetric {
  return isLeaderboardMetric(requested) ? requested : defaultMetricFor(gameSlug);
}

/** Ranked column from the lifetime `game_stats` table (period `all`). */
export function statsMetricColumn(metric: LeaderboardMetric): SQL<number> {
  switch (metric) {
    case "highScore":
      return sql<number>`${gameStats.highScore}`;
    case "wins":
      return sql<number>`${gameStats.wins}`;
    case "totalScore":
      return sql<number>`${gameStats.totalScore}`;
    default:
      return sql<number>`${gameStats.gamesPlayed}`;
  }
}

/** Ranked aggregate over `game_sessions` (weekly / monthly windows). */
export function sessionMetricColumn(metric: LeaderboardMetric): SQL<number> {
  switch (metric) {
    case "wins":
      return sql<number>`count(*) filter (where ${gameSessions.result} = 'win')::int`;
    case "highScore":
      return sql<number>`coalesce(max(${gameSessions.score}), 0)::int`;
    case "totalScore":
      return sql<number>`coalesce(sum(${gameSessions.score}), 0)::int`;
    default:
      return sql<number>`count(*)::int`;
  }
}
