import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  boolean,
  primaryKey,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * DIFF database schema (Drizzle ORM, Postgres dialect).
 * Designed to run unchanged against Neon/Vercel Postgres.
 *
 * Extensibility notes (see section 40 of the product brief):
 * - `games` is data-driven so new minigames don't require schema changes.
 * - `gameSessions.metadata` (jsonb-ish text) holds per-game details so we
 *   don't need a new table per game.
 * - `users` has no game-specific columns, keeping it ready for friends,
 *   seasons, cosmetics, etc. as separate tables later.
 */

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  discordId: varchar("discord_id", { length: 32 }).notNull().unique(),
  username: varchar("username", { length: 32 }).notNull().unique(), // DIFF username, editable
  displayName: varchar("display_name", { length: 64 }).notNull(),
  avatar: text("avatar"), // Discord avatar URL
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login").defaultNow().notNull(),
  xp: integer("xp").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  locale: varchar("locale", { length: 5 }).default("en").notNull(),
  publicProfile: boolean("public_profile").default(true).notNull(),
  soundEnabled: boolean("sound_enabled").default(false).notNull(),
  animationsEnabled: boolean("animations_enabled").default(true).notNull(),
});

export const games = pgTable("games", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 32 }).notNull().unique(), // "snake" | "connect4"
  name: varchar("name", { length: 64 }).notNull(),
  description: text("description").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
});

export const gameStats = pgTable(
  "game_stats",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    gamesPlayed: integer("games_played").default(0).notNull(),
    wins: integer("wins").default(0).notNull(),
    losses: integer("losses").default(0).notNull(),
    draws: integer("draws").default(0).notNull(),
    highScore: integer("high_score").default(0).notNull(),
    totalScore: integer("total_score").default(0).notNull(),
    winStreak: integer("win_streak").default(0).notNull(),
    bestWinStreak: integer("best_win_streak").default(0).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.gameId] }),
  })
);

export const gameSessions = pgTable("game_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  score: integer("score").default(0).notNull(),
  result: varchar("result", { length: 8 }).notNull(), // "win" | "loss" | "draw" | "n/a"
  difficulty: varchar("difficulty", { length: 8 }), // "easy" | "normal" | "hard"
  durationMs: integer("duration_ms").default(0).notNull(),
  metadata: text("metadata"), // JSON-encoded, game-specific
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const achievements = pgTable("achievements", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 64 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 32 }).notNull(), // lucide icon name
});

export const userAchievements = pgTable(
  "user_achievements",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    achievementId: uuid("achievement_id")
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),
    unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.achievementId] }),
  })
);
