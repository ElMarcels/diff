# DIFF — Play. Compete. Differ.

DIFF is a retro-arcade, neon-pixel online minigames platform: fast rounds,
real rankings, and a growing library of games. This repo is the v1.0
scaffold — Home, Games, Snake, Connect 4 (vs a minimax CPU), Discord login,
profiles, stats, leaderboards, achievements, XP, settings, i18n (ES/EN) and
a database schema ready for Postgres/Neon.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **React 18**
- **Tailwind CSS** — DIFF design system (colors, notch-corner cards, glow)
- **NextAuth (Auth.js)** — Discord OAuth
- **Drizzle ORM** + **postgres.js** — Postgres/Neon-ready schema
- **Framer Motion** available for richer motion beyond CSS animations

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values, see below
npm run dev
```

The app **runs without a database configured**: pages fall back to mock
data, and the score-submission API accepts requests but doesn't persist
anything until `DATABASE_URL` is set. This lets you develop the frontend
before wiring up Neon.

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string (Neon or any Postgres-compatible provider) |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | From your Discord application |
| `NEXTAUTH_SECRET` | Random secret, generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Full URL of your app (`http://localhost:3000` locally) |
| `NEXT_PUBLIC_DISCORD_INVITE` | Your community Discord invite link |
| `NEXT_PUBLIC_SITE_URL` | Public site URL, used for SEO/Open Graph tags |

## Setting up Discord OAuth

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and create an application.
2. Under **OAuth2 → General**, copy the Client ID and Client Secret into `.env.local`.
3. Under **OAuth2 → Redirects**, add:
   - `http://localhost:3000/api/auth/callback/discord` (local dev)
   - `https://<your-domain>/api/auth/callback/discord` (production)
4. DIFF only requests the `identify` scope — no email, no guild list.

## Setting up Postgres / Neon

1. Create a Neon project (or add the **Neon** integration directly from your Vercel project's **Storage** tab).
2. Copy the connection string into `DATABASE_URL` (locally in `.env.local`, and in your Vercel project's environment variables).
3. Generate and apply the schema:
   ```bash
   npm run db:generate   # creates SQL migration files in /drizzle
   npm run db:migrate    # applies them to DATABASE_URL
   npx tsx src/lib/db/seed.ts   # seeds the `games` and `achievements` tables
   ```
4. Redeploy — the app will now read/write real data instead of falling back to mocks.

## Deploying to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket and import it in Vercel.
2. Add all the environment variables above in **Project Settings → Environment Variables**.
3. If you used the Vercel Neon integration, `DATABASE_URL` is added for you automatically.
4. Deploy. Run the migration + seed commands above once against the production `DATABASE_URL` (or via a one-off Vercel CLI command / GitHub Action).

## Project structure

```
src/
  app/                # Routes (App Router): home, games, leaderboards, profile, settings, auth...
  components/         # Reusable UI: Navbar, Footer, Button, GameCard, Leaderboard, Toast...
  games/
    snake/            # Snake game component
    connect4/         # Connect 4 game component + minimax AI (ai.ts)
  lib/
    db/               # Drizzle schema, client, migration & seed scripts
    i18n/             # Locale provider + dictionaries (en.json, es.json)
    services/         # Server-side score validation
    auth.ts           # NextAuth + Discord config
    xp.ts             # XP/level curve
    mock-data.ts       # Fallback data used until the DB is configured
  types/              # Shared TypeScript types
```

## Adding a new game

1. Add its metadata to `MOCK_GAMES` in `src/lib/mock-data.ts` (and, once the
   DB is live, insert a row into the `games` table — see `seed.ts`).
2. Create `src/games/<slug>/<Slug>Game.tsx` with the game itself.
3. Create the route `src/app/games/<slug>/page.tsx` that renders it.
4. Add translation strings for it in both `src/lib/i18n/dictionaries/en.json`
   and `es.json`.
5. When the game reports a result, POST it to `/api/games/submit` with
   `{ gameSlug, score, result, difficulty?, durationMs, metadata }` — add a
   plausibility check for it in `src/lib/services/validate-score.ts` so the
   server doesn't blindly trust the client.

## Adding a new language

1. Duplicate `src/lib/i18n/dictionaries/en.json` as `<locale>.json` with the
   same keys, translated.
2. Register it in `src/lib/i18n/config.ts` (`locales` array and
   `dictionaries` map).
3. It will automatically appear in the language selector in Settings and
   the footer.

## Security notes

- All game results are POSTed to a server API route, which independently
  re-validates them (recomputing the Connect 4 winner from the raw board,
  checking Snake's score against reported food eaten) before writing to
  `gameStats`. The client never writes statistics directly.
- Secrets are only ever read from environment variables; nothing is
  hardcoded in the source.

## What's stubbed for v1.0

- Profile lookups by username and the Settings "save" action currently read
  from `lib/mock-data.ts` — swap in real Drizzle queries once
  `DATABASE_URL` is set (the query shapes are already modeled in
  `schema.ts`).
- Achievement unlocking logic (checking stats after each submitted score
  and inserting into `userAchievements`) is modeled in the schema but not
  yet wired into the `/api/games/submit` route — a good next addition.
- Sounds are wired into Settings as a toggle but no audio assets are
  included yet, per the brief.

## Roadmap (not built yet, architecture allows for it)

Multiplayer, friends, seasons/tournaments, daily challenges, cosmetics,
chat, currency/battle pass. None of these require reworking the schema
above — `gameSessions.metadata` and a data-driven `games` table were
chosen specifically so these can be added as new tables/routes later.
