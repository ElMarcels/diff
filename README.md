# DIFF — Play. Compete. Differ.

DIFF is a retro-arcade, neon-pixel online minigames platform: fast rounds,
real rankings, and a growing library of games. This repo is the v1.0
scaffold — Home, Games, Snake, Connect 4 (vs a minimax CPU), own email +
password accounts, community game submissions with moderator review,
profiles, stats, leaderboards, achievements, XP, settings, i18n (ES/EN) and a
database schema ready for Postgres/Neon.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **React 18**
- **Tailwind CSS** — DIFF design system (colors, notch-corner cards, glow)
- **Own auth** — scrypt password hashing + revocable hashed session cookies
  (`src/lib/auth/`)
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
anything until `DATABASE_URL` is set. Accounts, submissions, the moderation
queue and the owner panel all return a clear 503 until then, so you can
develop the frontend first.

## Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string (Neon or any Postgres-compatible provider) |
| `OWNER_EMAIL` | The account that becomes platform owner. Defaults to `hola@elmarcels.xyz` |
| `OWNER_PASSWORD` / `OWNER_USERNAME` | Only read by `npm run db:owner`, to create the owner from the CLI |
| `NEXT_PUBLIC_DISCORD_INVITE` | Your community Discord invite link (footer only) |
| `NEXT_PUBLIC_SITE_URL` | Public site URL, used for SEO/Open Graph tags |

There is no `NEXTAUTH_SECRET`, no `DISCORD_CLIENT_ID` and no callback URL to
register anywhere: DIFF handles its own accounts.

## Accounts and roles

Three roles, defined in `src/lib/auth/roles.ts`:

| Role | What it can do |
|---|---|
| `user` | Play, and submit their own games for review |
| `moderator` | Review the queue, comment on submissions, change statuses |
| `owner` | Everything a moderator can do, **plus** the exclusive `/owner` panel |

The `OWNER_EMAIL` address is promoted to `owner` automatically on register and
on every login, so the account can never be demoted by accident. The role is
locked in `setUserRole` as well.

Auth details:

- Passwords are hashed with **scrypt** and a per-user salt (`src/lib/auth/password.ts`).
- Sessions are random 32-byte tokens; the cookie (`diff_session`, httpOnly,
  sameSite=lax, secure in production) carries the raw token and the database
  only ever stores its **SHA-256** hash (`src/lib/auth/session.ts`).
- Sessions expire after 30 days and renew when a user is close to expiry.
- Changing a password revokes every *other* session.
- `middleware.ts` only does a fast cookie-presence redirect. Every API route
  and service re-checks the session and the role server-side, so the client
  can never escalate by editing its own state.

## Community submissions (Modrinth-style)

Submissions are external builds linked by URL (itch.io, GitHub Pages, your own
server) rather than uploaded binaries.

```
draft → pending → in_review → changes_requested → pending → approved → published
```

- Authors edit and version their submission in `/creator`, and can reply in
  the review thread.
- Moderators work the queue in `/moderation`: they can request changes,
  approve or reject, and every transition is written to an audit trail.
- The **owner** publishes approved submissions from `/owner`, which creates
  the `games` row (with the chosen tagline, difficulty and player count) and
  links the play URL.
- The owner panel can also add a mod directly, enable/disable any game, and
  change user roles.

All the rules live in `src/lib/submissions/service.ts`; the API routes stay
thin and the service is the real authorization boundary.

## Setting up Postgres / Neon

1. Create a Neon project (or add the **Neon** integration directly from your Vercel project's **Storage** tab).
2. Copy the connection string into `DATABASE_URL` (locally in `.env.local`, and in your Vercel project's environment variables).
3. Generate and apply the schema:
   ```bash
   npm run db:generate   # creates SQL migration files in /drizzle
   npm run db:migrate    # applies them to DATABASE_URL
   npm run db:seed       # seeds the `games` and `achievements` tables
   ```
4. Create the platform owner account:
   ```bash
   OWNER_PASSWORD='choose-a-strong-one' npm run db:owner
   ```
   Registering on the site with `OWNER_EMAIL` also grants the role, so this
   step is optional.
5. Redeploy — the app will now read/write real data instead of falling back to mocks.

### Upgrading from the Discord-only schema

`drizzle/0001_accounts_and_review_queue.sql` adds `users.email` and
`users.password_hash` as nullable first, backfills any pre-existing rows with
`legacy-<discord_id>@legacy.invalid` and an unusable `disabled` password hash,
then applies `NOT NULL`. Those old accounts therefore cannot log in (the hash
never verifies) and their Discord ids are dropped in
`drizzle/0002_drop_legacy_discord_id.sql`. Users must re-register with a real
email and password.

## Deploying to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket and import it in Vercel.
2. Add all the environment variables above in **Project Settings → Environment Variables**.
3. If you used the Vercel Neon integration, `DATABASE_URL` is added for you automatically.
4. Deploy. Run the migration + seed commands above once against the production `DATABASE_URL` (or via a one-off Vercel CLI command / GitHub Action).

## Project structure

```
src/
  app/                # Routes (App Router): home, games, leaderboards, profile, settings...
    api/auth/         # register, login, logout, me
    api/submissions/  # create, update, comments, status changes, publish
    api/admin/        # owner-only: games and users
    creator/          # author dashboard + new submission
    moderation/       # review queue + review view
    owner/            # owner panel (mods, roles, publishing)
  components/         # Reusable UI: Navbar, Footer, Button, GameCard, Toast...
    forms/            # auth + submission forms
    submissions/      # submission view, review thread, status actions
    owner/            # owner panel components
  games/
    snake/            # Snake game component
    connect4/         # Connect 4 game component + minimax AI (ai.ts)
  lib/
    auth/             # password hashing, sessions, roles, guards, validation
    db/               # Drizzle schema, client, seed + owner bootstrap scripts
    games/            # catalogue, game service
    submissions/      # submission/review service
    users/            # user administration service
    i18n/             # Locale provider + dictionaries (en.json, es.json)
    services/         # Server-side score validation
    xp.ts             # XP/level curve
    mock-data.ts      # Fallback data used until the DB is configured
  middleware.ts       # Fast redirect for private areas (cookie presence only)
  types/              # Shared TypeScript types
```

## Adding a new game

Two options:

**Built-in game (runs inside DIFF):**

1. Add its metadata to `MOCK_GAMES` in `src/lib/mock-data.ts` (and, once the
   DB is live, insert a row into the `games` table with
   `source = 'builtin'` — see `seed.ts`).
2. Create `src/games/<slug>/<Slug>Game.tsx` with the game itself.
3. Create the route `src/app/games/<slug>/page.tsx` that renders it.
4. Add translation strings for it in both `src/lib/i18n/dictionaries/en.json`
   and `es.json`.
5. When the game reports a result, POST it to `/api/games/submit` with
   `{ gameSlug, score, result, difficulty?, durationMs, metadata }` — add a
   plausibility check for it in `src/lib/services/validate-score.ts` so the
   server doesn't blindly trust the client.

**External game or mod (a hosted build):** add it from the owner panel
(`/owner`), giving it a slug, a description, a tagline and the playable URL.
It appears in the catalogue automatically and links straight to the build.

## Adding a new language

1. Duplicate `src/lib/i18n/dictionaries/en.json` as `<locale>.json` with the
   same keys, translated.
2. Register it in `src/lib/i18n/config.ts` (`locales` array and
   `dictionaries` map).
3. It will automatically appear in the language selector in Settings and
   the footer.

## Security notes

- Passwords are never stored or logged in plain text, and the session cookie
  is httpOnly so client JavaScript cannot read it.
- Only SHA-256 hashes of session tokens are persisted, so a database leak
  does not hand out live sessions.
- Role checks live in the service layer and in every route handler, not in
  React components. The owner account cannot be demoted through the API.
- Unpublished submissions are private: only their author and the moderation
  team can read them.
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
- Submitted builds are linked, not uploaded. If you want file uploads you'll
  need object storage (S3/R2) and a new field on `submissionVersions`.

## Roadmap (not built yet, architecture allows for it)

Multiplayer, friends, seasons/tournaments, daily challenges, cosmetics,
chat, currency/battle pass. None of these require reworking the schema
above — `gameSessions.metadata`, a data-driven `games` table and the
`gameSubmissions` pipeline were chosen specifically so these can be added as
new tables/routes later.
