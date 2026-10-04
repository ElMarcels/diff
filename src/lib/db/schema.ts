import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  boolean,
  index,
  primaryKey,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/**
 * DIFF database schema (Drizzle ORM, Postgres dialect).
 * Designed to run unchanged against Neon/Vercel Postgres.
 *
 * Accounts are native to DIFF (email + password), and game submissions go
 * through a Modrinth-style review queue before the platform owner publishes
 * them into `games`.
 *
 * Extensibility notes:
 * - `games` is data-driven so new minigames don't require schema changes.
 * - `gameSessions.metadata` (jsonb-ish text) holds per-game details so we
 *   don't need a new table per game.
 * - `users` has no game-specific columns, keeping it ready for friends,
 *   seasons, cosmetics, etc. as separate tables later.
 */

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 254 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 16 }).default("user").notNull(), // "user" | "moderator" | "owner"
  username: varchar("username", { length: 32 }).notNull().unique(), // DIFF username, editable
  displayName: varchar("display_name", { length: 64 }).notNull(),
  avatar: text("avatar"), // optional avatar URL, initials are used when null
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login").defaultNow().notNull(),
  xp: integer("xp").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  locale: varchar("locale", { length: 5 }).default("en").notNull(),
  publicProfile: boolean("public_profile").default(true).notNull(),
  soundEnabled: boolean("sound_enabled").default(false).notNull(),
  animationsEnabled: boolean("animations_enabled").default(true).notNull(),
  passwordChangedAt: timestamp("password_changed_at").defaultNow().notNull(),
});

/**
 * Opaque server-side sessions. The cookie only carries a random token; the
 * database stores its SHA-256 hash, so a leaked database row can't be used
 * to authenticate.
 */
export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    tokenIdx: index("auth_sessions_token_hash_idx").on(t.tokenHash),
    userIdx: index("auth_sessions_user_id_idx").on(t.userId),
  })
);

export const games = pgTable("games", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 48 }).notNull().unique(), // "snake" | "connect4" | a community mod
  name: varchar("name", { length: 64 }).notNull(),
  description: text("description").notNull(),
  tagline: varchar("tagline", { length: 120 }),
  category: varchar("category", { length: 48 }).default("Arcade").notNull(), // "Arcade / Solo", ...
  difficulty: varchar("difficulty", { length: 16 }).default("Medium").notNull(), // "Easy" | "Medium" | "Hard"
  players: varchar("players", { length: 24 }).default("1 Player").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  source: varchar("source", { length: 16 }).default("builtin").notNull(), // "builtin" | "submission" | "mod"
  playUrl: text("play_url"), // external build for community submissions / mods
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const gameSessions = pgTable(
  "game_sessions",
  {
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
  },
  (t) => ({
    // Weekly/monthly leaderboards filter by time window; without this index
    // that aggregate is a sequential scan.
    createdAtIdx: index("game_sessions_created_at_idx").on(t.createdAt),
  })
);

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

/**
 * Modrinth-style review pipeline for community games.
 *
 * lifecycle: draft -> pending -> in_review -> (changes_requested -> pending)
 *                                                    -> approved -> published
 *                                                      -> rejected
 *
 * The author can edit and resubmit while the platform team (moderators)
 * plays the build at `playUrl` and leaves comments; the platform owner is
 * the only role allowed to publish an approved submission into `games`.
 */
export const gameSubmissions = pgTable(
  "game_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 48 }).notNull().unique(), // url-friendly, like modrinth
    title: varchar("title", { length: 64 }).notNull(),
    summary: varchar("summary", { length: 160 }).notNull(),
    body: text("body"), // long description
    category: varchar("category", { length: 48 }).default("Arcade").notNull(),
    playUrl: text("play_url").notNull(), // build the moderators can actually play
    repositoryUrl: text("repository_url"),
    license: varchar("license", { length: 32 }).default("MIT").notNull(),
    version: varchar("version", { length: 24 }).default("1.0.0").notNull(),
    status: varchar("status", { length: 20 }).default("draft").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "set null" }),
    publishedGameId: uuid("published_game_id").references(() => games.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    submittedAt: timestamp("submitted_at"),
    reviewedAt: timestamp("reviewed_at"),
    publishedAt: timestamp("published_at"),
  },
  (t) => ({
    authorIdx: index("game_submissions_author_id_idx").on(t.authorId),
    statusIdx: index("game_submissions_status_idx").on(t.status),
    submittedAtIdx: index("game_submissions_submitted_at_idx").on(t.submittedAt),
  })
);

export const submissionVersions = pgTable(
  "submission_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => gameSubmissions.id, { onDelete: "cascade" }),
    version: varchar("version", { length: 24 }).notNull(),
    changelog: text("changelog"),
    playUrl: text("play_url").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    submissionIdx: index("submission_versions_submission_id_idx").on(t.submissionId),
  })
);

/** Thread where the author and the moderators talk about a submission. */
export const submissionComments = pgTable(
  "submission_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => gameSubmissions.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    kind: varchar("kind", { length: 16 }).default("comment").notNull(), // "comment" | "review" | "author_reply"
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    submissionIdx: index("submission_comments_submission_id_idx").on(t.submissionId),
  })
);

/** Audit trail of every moderation decision. */
export const submissionEvents = pgTable(
  "submission_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => gameSubmissions.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 32 }).notNull(), // "submitted" | "status_change" | "published" | "version"
    fromStatus: varchar("from_status", { length: 20 }),
    toStatus: varchar("to_status", { length: 20 }),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    submissionIdx: index("submission_events_submission_id_idx").on(t.submissionId),
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  submissions: many(gameSubmissions),
  stats: many(gameStats),
}));

export const gameSubmissionsRelations = relations(gameSubmissions, ({ one, many }) => ({
  author: one(users, { fields: [gameSubmissions.authorId], references: [users.id] }),
  reviewer: one(users, { fields: [gameSubmissions.reviewerId], references: [users.id] }),
  publishedGame: one(games, { fields: [gameSubmissions.publishedGameId], references: [games.id] }),
  versions: many(submissionVersions),
  comments: many(submissionComments),
  events: many(submissionEvents),
}));

export const submissionCommentsRelations = relations(submissionComments, ({ one }) => ({
  submission: one(gameSubmissions, {
    fields: [submissionComments.submissionId],
    references: [gameSubmissions.id],
  }),
  author: one(users, { fields: [submissionComments.authorId], references: [users.id] }),
}));

export const submissionVersionsRelations = relations(submissionVersions, ({ one }) => ({
  submission: one(gameSubmissions, {
    fields: [submissionVersions.submissionId],
    references: [gameSubmissions.id],
  }),
}));

/** Convenience aggregate used by the leaderboard/profile queries. */
export const userLevelFromXp = sql`GREATEST(1, FLOOR(${users.xp} / 500) + 1)`;
