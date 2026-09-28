import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "./schema";
import { hashPassword } from "../auth/password";
import { normalizeEmail, ownerEmail } from "../auth/roles";

/**
 * Run with: npm run db:owner
 *
 * Creates (or promotes) the platform owner account — the one with exclusive
 * access to /owner, where new mods are added to the platform. Defaults to
 * hola@elmarcels.xyz; override with OWNER_EMAIL.
 *
 *   OWNER_EMAIL=hola@elmarcels.xyz OWNER_PASSWORD='…' OWNER_USERNAME=elmarcels npm run db:owner
 *
 * Without OWNER_PASSWORD it only promotes an account that already exists; it
 * never invents a password. Registering on the site with that address also
 * grants owner + moderator automatically (see lib/auth/roles.ts).
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Add it to .env.local first.");
    process.exit(1);
  }

  const email = normalizeEmail(process.env.OWNER_EMAIL || ownerEmail());
  const password = process.env.OWNER_PASSWORD;
  const username =
    process.env.OWNER_USERNAME || email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 32) || "owner";

  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existing.length > 0) {
    await db.update(users).set({ role: "owner" }).where(eq(users.email, email));
    console.log(`Promoted ${email} to platform owner.`);
  } else if (password) {
    await db
      .insert(users)
      .values({
        email,
        username,
        displayName: username,
        passwordHash: hashPassword(password),
        role: "owner",
      })
      .onConflictDoNothing({ target: users.email });
    console.log(`Created platform owner ${email} (username: ${username}).`);
  } else {
    console.log(
      `${email} doesn't exist yet. Register on the site with that address, or re-run with OWNER_PASSWORD=… to create it here.`
    );
  }

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
