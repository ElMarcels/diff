import HomeView from "@/components/home/HomeView";
import { getCatalogGames } from "@/lib/games/catalog";

export const dynamic = "force-dynamic";

export default async function Page() {
  const games = await getCatalogGames();
  return <HomeView games={games} />;
}
