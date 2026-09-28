import { aliasedTable, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { games, users } from "@/lib/db/schema";
import { SessionUser } from "@/lib/auth/session";
import { isOwner } from "@/lib/auth/roles";
import { GameMeta } from "@/types";

/**
 * Catalogue of playable games. Built-in games are React routes; mods added by
 * the platform owner (or published submissions) carry an external `playUrl`.
 */

export type GameSource = "builtin" | "submission" | "mod";

export interface GameRecord extends GameMeta {
  id: string;
  source: GameSource;
  playUrl: string | null;
  enabled: boolean;
  createdAt: string;
}

const gameColumns = {
  id: games.id,
  slug: games.slug,
  name: games.name,
  description: games.description,
  tagline: games.tagline,
  category: games.category,
  difficulty: games.difficulty,
  players: games.players,
  enabled: games.enabled,
  source: games.source,
  playUrl: games.playUrl,
  createdAt: games.createdAt,
};

type GameRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  tagline: string | null;
  category: string;
  difficulty: string;
  players: string;
  enabled: boolean;
  source: string;
  playUrl: string | null;
  createdAt: Date;
};

function toRecord(row: GameRow): GameRecord {
  return {
    id: row.id,
    slug: row.slug as GameMeta["slug"],
    name: row.name,
    description: row.description,
    tagline: row.tagline ?? row.description.slice(0, 120),
    type: row.category,
    difficulty: row.difficulty as GameMeta["difficulty"],
    players: row.players,
    enabled: row.enabled,
    source: row.source as GameSource,
    playUrl: row.playUrl,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

/** Enabled games for the public catalogue; null when there's no database. */
export async function listPublicGames(): Promise<GameRecord[] | null> {
  const db = getDb();
  if (!db) return null;
  const rows = await db
    .select(gameColumns)
    .from(games)
    .where(eq(games.enabled, true))
    .orderBy(desc(games.createdAt));
  return (rows as GameRow[]).map(toRecord);
}

export interface AdminGameRow extends GameRecord {
  creatorUsername: string | null;
}

/** Every game, including disabled ones, for the owner panel. */
export async function listAllGames(owner: SessionUser): Promise<AdminGameRow[] | null> {
  if (!isOwner(owner.role)) return null;
  const db = getDb();
  if (!db) return null;
  const creator = aliasedTable(users, "creator");
  const rows = await db
    .select({ ...gameColumns, creatorUsername: creator.username })
    .from(games)
    .leftJoin(creator, eq(creator.id, games.createdBy))
    .orderBy(desc(games.createdAt));
  return (rows as (GameRow & { creatorUsername: string | null })[]).map((row) => ({
    ...toRecord(row),
    creatorUsername: row.creatorUsername,
  }));
}

export type CreateGameInput = {
  slug: string;
  name: string;
  description: string;
  tagline?: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  players: string;
  playUrl?: string;
  source: GameSource;
  enabled: boolean;
};

export type GameServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string };

export async function createGame(owner: SessionUser, input: CreateGameInput): Promise<GameServiceResult<GameRecord>> {
  if (!isOwner(owner.role)) return { ok: false, status: 403, error: "Platform owner access only." };

  const db = getDb()!;
  const [existing] = await db.select({ id: games.id }).from(games).where(eq(games.slug, input.slug)).limit(1);
  if (existing) {
    return { ok: false, status: 409, error: "A game with that slug already exists." };
  }

  const [created] = await db
    .insert(games)
    .values({
      slug: input.slug,
      name: input.name,
      description: input.description,
      tagline: input.tagline ?? input.description.slice(0, 120),
      category: input.category,
      difficulty: input.difficulty,
      players: input.players,
      playUrl: input.playUrl || null,
      source: input.source,
      enabled: input.enabled,
      createdBy: owner.id,
    })
    .returning();

  if (!created) return { ok: false, status: 500, error: "Could not create the game." };
  return { ok: true, data: toRecord(created as GameRow) };
}

export async function updateGame(
  owner: SessionUser,
  id: string,
  input: Partial<Omit<CreateGameInput, "slug">>
): Promise<GameServiceResult<GameRecord>> {
  if (!isOwner(owner.role)) return { ok: false, status: 403, error: "Platform owner access only." };
  const db = getDb()!;

  const [updated] = await db
    .update(games)
    .set({
      ...(input.name ? { name: input.name } : {}),
      ...(input.description ? { description: input.description } : {}),
      ...(input.tagline !== undefined ? { tagline: input.tagline } : {}),
      ...(input.category ? { category: input.category } : {}),
      ...(input.difficulty ? { difficulty: input.difficulty } : {}),
      ...(input.players ? { players: input.players } : {}),
      ...(input.playUrl !== undefined ? { playUrl: input.playUrl || null } : {}),
      ...(typeof input.enabled === "boolean" ? { enabled: input.enabled } : {}),
    })
    .where(eq(games.id, id))
    .returning();

  if (!updated) return { ok: false, status: 404, error: "Game not found." };
  return { ok: true, data: toRecord(updated as GameRow) };
}
