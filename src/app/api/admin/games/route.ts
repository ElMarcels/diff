import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db/client";
import { dbUnavailable, isResponse, requireOwner, withErrorHandling } from "@/lib/auth/guards";
import { listAllGames } from "@/lib/games/service";

export const dynamic = "force-dynamic";

/** GET /api/admin/games → every game, enabled or not (platform owner only). */
export const GET = withErrorHandling(async () => {
  const guard = await requireOwner();
  if (isResponse(guard)) return guard;
  if (!isDbConfigured()) return dbUnavailable();

  const games = await listAllGames(guard);
  return NextResponse.json({ games: games ?? [] });
});
