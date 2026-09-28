import type { Metadata } from "next";
import { GamesView } from "@/components/games/GamesView";
import { getCatalogGames } from "@/lib/games/catalog";

export const metadata: Metadata = { title: "Games — DIFF" };
export const dynamic = "force-dynamic";

export default async function GamesPage() {
  const games = await getCatalogGames();
  return <GamesView games={games} />;
}
