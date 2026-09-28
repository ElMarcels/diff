import { getDb, describeDbError } from "@/lib/db/client";
import { games } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { MOCK_GAMES } from "@/lib/mock-data";
import { GameMeta } from "@/types";

/**
 * Public catalogue of playable games. Built-in games always come first (they
 * are React routes in /games/[slug]); mods and published submissions are read
 * from the database.
 *
 * Never throws: a database that is unreachable, misconfigured or not yet
 * migrated degrades to the built-in list instead of taking the whole page
 * down. `status` tells the caller which case happened so the UI can say so.
 */
export interface CatalogResult {
  games: GameMeta[];
  /** Set when the DB was configured but could not be read. */
  dbError: string | null;
  /** True when the listed games came from mocks, not the database. */
  usingFallback: boolean;
}

export async function getCatalog(): Promise<CatalogResult> {
  const db = getDb();
  if (!db) {
    return { games: MOCK_GAMES, dbError: null, usingFallback: true };
  }

  let rows;
  try {
    rows = await db
      .select()
      .from(games)
      .where(eq(games.enabled, true))
      .orderBy(asc(games.createdAt));
  } catch (err) {
    // Most likely: migrations haven't been run yet, or the URL is wrong.
    console.error("[catalog] falling back to built-in games:", describeDbError(err));
    return { games: MOCK_GAMES, dbError: describeDbError(err), usingFallback: true };
  }

  if (rows.length === 0) {
    return { games: MOCK_GAMES, dbError: null, usingFallback: true };
  }

  const builtins: GameMeta[] = [];
  const extras: GameMeta[] = [];

  for (const row of rows) {
    const meta: GameMeta = {
      slug: row.slug as GameMeta["slug"],
      name: row.name,
      description: row.description,
      tagline: row.tagline ?? row.description.slice(0, 120),
      type: row.category,
      difficulty: row.difficulty as GameMeta["difficulty"],
      players: row.players,
      enabled: row.enabled,
      playUrl: row.playUrl,
      source: row.source as GameMeta["source"],
    };
    if (row.source === "builtin") builtins.push(meta);
    else extras.push(meta);
  }

  // Keep the built-in games listed even if the DB has no rows for them yet.
  for (const mock of MOCK_GAMES) {
    if (!builtins.some((game) => game.slug === mock.slug)) builtins.push(mock);
  }

  return { games: [...builtins, ...extras], dbError: null, usingFallback: false };
}

/** Convenience wrapper for callers that only want the list. */
export async function getCatalogGames(): Promise<GameMeta[]> {
  return (await getCatalog()).games;
}

export type { GameMeta };
