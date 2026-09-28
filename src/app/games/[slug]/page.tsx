import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { games } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { CommunityGame } from "@/components/games/CommunityGame";

export const dynamic = "force-dynamic";

/**
 * Fallback route for any catalogue game that isn't a built-in React game:
 * community submissions and mods added from the owner panel. They open in a
 * tab (they live on their own build URL) and can be reported if broken.
 */
export default async function GamePage({ params }: { params: { slug: string } }) {
  const db = getDb();
  if (!db) notFound();

  const rows = await db.select().from(games).where(eq(games.slug, params.slug)).orderBy(asc(games.createdAt)).limit(1);
  const game = rows[0];
  if (!game || !game.enabled) notFound();

  return (
    <CommunityGame
      slug={game.slug}
      name={game.name}
      description={game.description}
      tagline={game.tagline ?? game.description.slice(0, 120)}
      playUrl={game.playUrl ?? ""}
      source={game.source}
    />
  );
}
