import { and, desc, eq, gte, gt, sql, type SQL } from "drizzle-orm";
import { describeDbError, getDb } from "@/lib/db/client";
import { games, gameSessions, gameStats, users } from "@/lib/db/schema";
import {
  LeaderboardEntry,
  LeaderboardMetric,
  LeaderboardPeriod,
} from "@/types";
import { MOCK_LEADERBOARD_CONNECT4, MOCK_LEADERBOARD_SNAKE } from "@/lib/mock-data";
import {
  periodStart,
  resolveMetric,
  sessionMetricColumn,
  statsMetricColumn,
} from "./metrics";

/**
 * Read side of the platform statistics: leaderboards built from real rows
 * instead of mocks.
 *
 * Follows the same contract as lib/games/catalog.ts — **never throws**. A
 * missing, unconfigured or half-migrated database degrades to the mock board
 * and reports why through `dbError`, so a database outage can't take the page
 * down with a 500.
 *
 * Scope rules:
 * - `period: "all"` reads the lifetime `game_stats` table (D4).
 * - `period: "weekly" | "monthly"` aggregates `game_sessions` by user, which
 *   is the only table with a time dimension.
 * - Users with `public_profile = false` never appear on either path.
 *
 * Server-only: uses the Drizzle schema.
 */

export interface StatsResult<T> {
  data: T;
  /** Set when the DB was configured but could not be read. */
  dbError: string | null;
  /** True when `data` came from mocks rather than the database. */
  usingFallback: boolean;
}

export interface GameLeaderboardQuery {
  gameSlug: string;
  metric?: LeaderboardMetric;
  period?: LeaderboardPeriod;
  limit?: number;
}

export interface GlobalLeaderboardQuery {
  metric?: LeaderboardMetric;
  period?: LeaderboardPeriod;
  limit?: number;
}

const DEFAULT_LIMIT = 25;

/** Board shown when the database can't be read, mirroring `catalog.ts`. */
function mockBoard(gameSlug: string | null): LeaderboardEntry[] {
  if (gameSlug === "connect4") return MOCK_LEADERBOARD_CONNECT4;
  if (gameSlug === "snake") return MOCK_LEADERBOARD_SNAKE;
  if (gameSlug) return [];
  const merged = new Map<string, LeaderboardEntry>();
  for (const entry of [...MOCK_LEADERBOARD_SNAKE, ...MOCK_LEADERBOARD_CONNECT4]) {
    const current = merged.get(entry.userId);
    if (!current) {
      merged.set(entry.userId, { ...entry });
      continue;
    }
    current.value += entry.value;
    current.gamesPlayed += entry.gamesPlayed;
  }
  return [...merged.values()]
    .sort((a, b) => b.value - a.value)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));
}

interface RankedRow {
  userId: string;
  username: string;
  avatar: string | null;
  gamesPlayed: number | null;
  value: number | null;
}

function rank(rows: RankedRow[]): LeaderboardEntry[] {
  return rows.map((row, i) => ({
    rank: i + 1,
    userId: row.userId,
    username: row.username,
    avatar: row.avatar,
    value: Number(row.value ?? 0),
    gamesPlayed: Number(row.gamesPlayed ?? 0),
  }));
}

/**
 * Lifetime board for one game, straight from `game_stats`. Every metric is a
 * stored column here, so the ranking is a single indexed scan per request.
 */
async function lifetimeGameRows(
  db: NonNullable<ReturnType<typeof getDb>>,
  gameSlug: string,
  metric: LeaderboardMetric,
  limit: number
): Promise<RankedRow[]> {
  const value = statsMetricColumn(metric);
  return db
    .select({
      userId: users.id,
      username: users.username,
      avatar: users.avatar,
      gamesPlayed: gameStats.gamesPlayed,
      value,
    })
    .from(gameStats)
    .innerJoin(users, eq(users.id, gameStats.userId))
    .innerJoin(games, eq(games.id, gameStats.gameId))
    .where(and(eq(games.slug, gameSlug), eq(users.publicProfile, true), gt(gameStats.gamesPlayed, 0)))
    .orderBy(desc(value))
    .limit(limit);
}

/**
 * Board for a rolling window. `game_stats` has no time dimension, so weekly
 * and monthly aggregate `game_sessions` on read. The `created_at` index keeps
 * this off a sequential scan; if the volume grows, pre-aggregated daily
 * snapshots become the next step.
 */
async function windowGameRows(
  db: NonNullable<ReturnType<typeof getDb>>,
  gameSlug: string,
  metric: LeaderboardMetric,
  period: LeaderboardPeriod,
  limit: number
): Promise<RankedRow[]> {
  const value = sessionMetricColumn(metric);
  return db
    .select({
      userId: users.id,
      username: users.username,
      avatar: users.avatar,
      gamesPlayed: sql<number>`count(*)::int`,
      value,
    })
    .from(gameSessions)
    .innerJoin(users, eq(users.id, gameSessions.userId))
    .innerJoin(games, eq(games.id, gameSessions.gameId))
    .where(
      and(
        eq(games.slug, gameSlug),
        eq(users.publicProfile, true),
        gte(gameSessions.createdAt, periodStart(period) ?? new Date(0))
      )
    )
    .groupBy(users.id, users.username, users.avatar)
    .orderBy(desc(value))
    .limit(limit);
}

/** Lifetime board across every game: sums the per-game `game_stats` rows. */
async function lifetimeGlobalRows(
  db: NonNullable<ReturnType<typeof getDb>>,
  metric: LeaderboardMetric,
  limit: number
): Promise<RankedRow[]> {
  const value = globalStatsMetric(metric);
  return db
    .select({
      userId: users.id,
      username: users.username,
      avatar: users.avatar,
      gamesPlayed: sql<number>`coalesce(sum(${gameStats.gamesPlayed}), 0)::int`,
      value,
    })
    .from(gameStats)
    .innerJoin(users, eq(users.id, gameStats.userId))
    .where(eq(users.publicProfile, true))
    .groupBy(users.id, users.username, users.avatar)
    .orderBy(desc(value))
    .limit(limit);
}

async function windowGlobalRows(
  db: NonNullable<ReturnType<typeof getDb>>,
  metric: LeaderboardMetric,
  period: LeaderboardPeriod,
  limit: number
): Promise<RankedRow[]> {
  const value = sessionMetricColumn(metric);
  return db
    .select({
      userId: users.id,
      username: users.username,
      avatar: users.avatar,
      gamesPlayed: sql<number>`count(*)::int`,
      value,
    })
    .from(gameSessions)
    .innerJoin(users, eq(users.id, gameSessions.userId))
    .where(and(eq(users.publicProfile, true), gte(gameSessions.createdAt, periodStart(period) ?? new Date(0))))
    .groupBy(users.id, users.username, users.avatar)
    .orderBy(desc(value))
    .limit(limit);
}

/** Summing per-game rows, so the stored columns need wrapping in `sum()`. */
function globalStatsMetric(metric: LeaderboardMetric): SQL<number> {
  switch (metric) {
    case "highScore":
      return sql<number>`coalesce(max(${gameStats.highScore}), 0)::int`;
    case "wins":
      return sql<number>`coalesce(sum(${gameStats.wins}), 0)::int`;
    case "gamesPlayed":
      return sql<number>`coalesce(sum(${gameStats.gamesPlayed}), 0)::int`;
    default:
      return sql<number>`coalesce(sum(${gameStats.totalScore}), 0)::int`;
  }
}

export async function getGameLeaderboard({
  gameSlug,
  metric,
  period = "all",
  limit = DEFAULT_LIMIT,
}: GameLeaderboardQuery): Promise<StatsResult<LeaderboardEntry[]>> {
  const chosen = resolveMetric(gameSlug, metric);
  const db = getDb();
  if (!db) return { data: mockBoard(gameSlug), dbError: null, usingFallback: true };

  try {
    const rows =
      period === "all"
        ? await lifetimeGameRows(db, gameSlug, chosen, limit)
        : await windowGameRows(db, gameSlug, chosen, period, limit);
    return { data: rank(rows), dbError: null, usingFallback: false };
  } catch (err) {
    console.error("[stats] game leaderboard unavailable:", describeDbError(err));
    return { data: mockBoard(gameSlug), dbError: describeDbError(err), usingFallback: true };
  }
}

export async function getGlobalLeaderboard({
  metric = "totalScore",
  period = "all",
  limit = DEFAULT_LIMIT,
}: GlobalLeaderboardQuery): Promise<StatsResult<LeaderboardEntry[]>> {
  const chosen = resolveMetric(null, metric);
  const db = getDb();
  if (!db) return { data: mockBoard(null), dbError: null, usingFallback: true };

  try {
    const rows =
      period === "all"
        ? await lifetimeGlobalRows(db, chosen, limit)
        : await windowGlobalRows(db, chosen, period, limit);
    return { data: rank(rows), dbError: null, usingFallback: false };
  } catch (err) {
    console.error("[stats] global leaderboard unavailable:", describeDbError(err));
    return { data: mockBoard(null), dbError: describeDbError(err), usingFallback: true };
  }
}
