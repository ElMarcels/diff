import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb, isDbConfigured } from "@/lib/db/client";
import { validateScore } from "@/lib/services/validate-score";
import { xpForResult } from "@/lib/xp";
import { games, gameSessions, gameStats, users } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { SubmitScorePayload } from "@/types";

/**
 * POST /api/games/submit
 *
 * The only way stats/leaderboards change. The client never writes stats
 * directly (brief section 25) — it posts a result here, the server
 * re-validates it against the reported match metadata, and only then
 * updates gameStats / awards XP.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let payload: SubmitScorePayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const validation = validateScore(payload);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 422 });
  }

  if (!isDbConfigured()) {
    // No database yet — accept the request so the frontend flow works
    // end-to-end locally, but don't pretend to persist anything.
    return NextResponse.json({ ok: true, persisted: false });
  }

  const db = getDb()!;
  const [game] = await db.select().from(games).where(eq(games.slug, payload.gameSlug));
  if (!game) return NextResponse.json({ error: "Unknown game." }, { status: 400 });

  const xpGain = xpForResult(payload.result);

  await db.transaction(async (tx) => {
    await tx.insert(gameSessions).values({
      userId: session.user.id,
      gameId: game.id,
      score: payload.score,
      result: payload.result,
      difficulty: payload.difficulty,
      durationMs: payload.durationMs,
      metadata: JSON.stringify(payload.metadata ?? {}),
    });

    const existing = await tx
      .select()
      .from(gameStats)
      .where(and(eq(gameStats.userId, session.user.id), eq(gameStats.gameId, game.id)));

    const isWin = payload.result === "win";
    const isLoss = payload.result === "loss";
    const isDraw = payload.result === "draw";

    if (existing.length === 0) {
      await tx.insert(gameStats).values({
        userId: session.user.id,
        gameId: game.id,
        gamesPlayed: 1,
        wins: isWin ? 1 : 0,
        losses: isLoss ? 1 : 0,
        draws: isDraw ? 1 : 0,
        highScore: payload.score,
        totalScore: payload.score,
        winStreak: isWin ? 1 : 0,
        bestWinStreak: isWin ? 1 : 0,
      });
    } else {
      const s = existing[0];
      const newStreak = isWin ? s.winStreak + 1 : 0;
      await tx
        .update(gameStats)
        .set({
          gamesPlayed: s.gamesPlayed + 1,
          wins: s.wins + (isWin ? 1 : 0),
          losses: s.losses + (isLoss ? 1 : 0),
          draws: s.draws + (isDraw ? 1 : 0),
          highScore: Math.max(s.highScore, payload.score),
          totalScore: s.totalScore + payload.score,
          winStreak: newStreak,
          bestWinStreak: Math.max(s.bestWinStreak, newStreak),
        })
        .where(and(eq(gameStats.userId, session.user.id), eq(gameStats.gameId, game.id)));
    }

    await tx
      .update(users)
      .set({ xp: sql`${users.xp} + ${xpGain}` })
      .where(eq(users.id, session.user.id));
  });

  return NextResponse.json({ ok: true, persisted: true, xpGain });
}
