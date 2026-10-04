import type { Metadata } from "next";
import HomeView from "@/components/home/HomeView";
import { getCatalog } from "@/lib/games/catalog";
import { getGlobalLeaderboard } from "@/lib/stats/service";

export const metadata: Metadata = { title: "DIFF — Play. Compete. Differ." };
export const dynamic = "force-dynamic";

export default async function Page() {
  const { games, dbError } = await getCatalog();
  // Real top players instead of the old mock board. Reuses the leaderboard
  // service, so a database outage just falls back the same way.
  const leaders = await getGlobalLeaderboard({ limit: 5 });
  return <HomeView games={games} dbError={dbError} leaders={leaders.data} />;
}
