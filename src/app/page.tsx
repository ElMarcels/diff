import type { Metadata } from "next";
import HomeView from "@/components/home/HomeView";
import { getCatalog } from "@/lib/games/catalog";

export const metadata: Metadata = { title: "DIFF — Play. Compete. Differ." };
export const dynamic = "force-dynamic";

export default async function Page() {
  const { games, dbError } = await getCatalog();
  return <HomeView games={games} dbError={dbError} />;
}
