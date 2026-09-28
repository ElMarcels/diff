import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db/client";
import { dbUnavailable, isResponse, jsonError, readJson, requireOwner, withErrorHandling } from "@/lib/auth/guards";
import { fieldErrors, gameCreateSchema } from "@/lib/auth/validation";
import { createGame, listPublicGames } from "@/lib/games/service";

export const dynamic = "force-dynamic";

/**
 * GET  /api/games → enabled games (falls back to the built-in catalogue)
 * POST /api/games → platform owner adds a new mod/game to the platform
 */
export const GET = withErrorHandling(async () => {
  if (!isDbConfigured()) return dbUnavailable();
  const games = await listPublicGames();
  return NextResponse.json({ games: games ?? [] });
});

export const POST = withErrorHandling(async (req: Request) => {
  const guard = await requireOwner();
  if (isResponse(guard)) return guard;
  if (!isDbConfigured()) return dbUnavailable();

  const body = await readJson(req);
  if (!body) return jsonError(400, "Invalid JSON body.");

  const parsed = gameCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "Check the highlighted fields.", { fields: fieldErrors(parsed.error) });
  }

  const result = await createGame(guard, parsed.data);
  if (!result.ok) return jsonError(result.status, result.error);
  return NextResponse.json({ ok: true, game: result.data }, { status: 201 });
});
