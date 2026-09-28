import { getDb } from "@/lib/db/client";
import { games } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { MOCK_GAMES } from "@/lib/mock-data";
import { GameMeta } from "@/types";

/**
 * Public catalogue of playable games. Built-in games always come first (they
 * are React routes in /games/[slug]); mods and published submissions are read
 * from the database. Falls back to the built-in list when there's no DB.
 */
export async function getCatalogGames(): Promise<GameMeta[]> {
  const db = getDb();
  if (!db) return MOCK_GAMES;

  const rows = await db
    .select()
    .from(games)
    .where(eq(games.enabled, true))
    .orderBy(asc(games.createdAt));

  if (rows.length === 0) return MOCK_GAMES;

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

  return [...builtins, ...extras];
}

export type { GameMeta };
