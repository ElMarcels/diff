import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { achievements, games } from "./schema";
import { MOCK_ACHIEVEMENTS, MOCK_GAMES } from "../mock-data";

/**
 * Run with: npx tsx src/lib/db/seed.ts
 * Populates the `games` and `achievements` reference tables. Safe to
 * re-run — uses onConflictDoNothing keyed on the unique slug column.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Add it to .env.local first.");
    process.exit(1);
  }
  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);

  for (const g of MOCK_GAMES) {
    await db
      .insert(games)
      .values({ slug: g.slug, name: g.name, description: g.description, enabled: g.enabled })
      .onConflictDoNothing({ target: games.slug });
  }

  for (const a of MOCK_ACHIEVEMENTS) {
    await db
      .insert(achievements)
      .values({ slug: a.slug, name: a.name, description: a.description, icon: a.icon })
      .onConflictDoNothing({ target: achievements.slug });
  }

  await sql.end();
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
