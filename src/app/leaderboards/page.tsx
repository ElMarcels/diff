import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth/session";
import { getCatalogGames } from "@/lib/games/catalog";
import { parsePeriod, resolveMetric } from "@/lib/stats/metrics";
import { getGameLeaderboard, getGlobalLeaderboard } from "@/lib/stats/service";
import { LeaderboardView } from "@/components/LeaderboardView";

export const metadata: Metadata = { title: "Leaderboards — DIFF" };
/** Rankings depend on the session and on live rows, so never cache this. */
export const dynamic = "force-dynamic";

/** `?game=<slug>` selects a single game; absent or unknown means the global board. */
export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const requestedGame = first(searchParams.game);
  const period = parsePeriod(first(searchParams.period));

  // The catalogue decides which slugs exist, so a community game gets a board
  // as soon as it's published and an unknown slug can't reach the query.
  const catalog = await getCatalogGames();
  const selectedGame = catalog.some((game) => game.slug === requestedGame) ? requestedGame : null;

  const metric = resolveMetric(selectedGame, first(searchParams.metric));
  const board = selectedGame
    ? await getGameLeaderboard({ gameSlug: selectedGame, metric, period })
    : await getGlobalLeaderboard({ metric, period });

  // Only used to highlight the signed-in player's own row.
  const user = await getSessionUser();

  return (
    <LeaderboardView
      games={catalog}
      selectedGame={selectedGame}
      period={period}
      metric={metric}
      entries={board.data}
      dbError={board.dbError}
      currentUserId={user?.id ?? null}
    />
  );
}

function first(value: string | string[] | undefined): string | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}
