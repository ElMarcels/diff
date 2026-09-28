import type { Metadata } from "next";
import { GamesView } from "@/components/games/GamesView";
import { getCatalog } from "@/lib/games/catalog";

export const metadata: Metadata = { title: "Games — DIFF" };
export const dynamic = "force-dynamic";

export default async function GamesPage() {
  const { games, dbError } = await getCatalog();
  return <GamesView games={games} dbError={dbError} />;
}
