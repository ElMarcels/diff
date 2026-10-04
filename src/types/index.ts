export type GameSlug = "snake" | "connect4" | (string & {});
export type Difficulty = "easy" | "normal" | "hard";
export type GameResult = "win" | "loss" | "draw" | "n/a";

export type UserRole = "user" | "moderator" | "owner";

export interface DiffUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar: string | null;
  role: UserRole;
  createdAt: string;
  lastLogin: string;
  xp: number;
  level: number;
  locale: "en" | "es";
  publicProfile: boolean;
  soundEnabled: boolean;
  animationsEnabled: boolean;
}

export interface GameStats {
  gameSlug: GameSlug;
  /** Display name of the game, so the UI never hardcodes "Snake"/"Connect 4". */
  gameName: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  highScore: number;
  totalScore: number;
  winStreak: number;
  bestWinStreak: number;
}

export interface GameMeta {
  slug: GameSlug;
  name: string;
  description: string;
  tagline: string;
  type: string; // "Arcade / Solo", "Strategy / 1v1 vs CPU"
  difficulty: "Easy" | "Medium" | "Hard";
  players: string; // "1 Player", "1v1 vs CPU"
  enabled: boolean;
  /** External build, set for community submissions and owner-added mods. */
  playUrl?: string | null;
  /** Where the game comes from: a built-in React route or an external build. */
  source?: "builtin" | "submission" | "mod";
}

export interface Achievement {
  slug: string;
  name: string;
  description: string;
  icon: string;
}

export interface UnlockedAchievement extends Achievement {
  unlockedAt: string;
}

/** Rolling windows the leaderboard can rank. `all` reads lifetime `game_stats`. */
export type LeaderboardPeriod = "all" | "weekly" | "monthly";

/** Columns/aggregates a leaderboard can rank by. See lib/stats/metrics.ts. */
export type LeaderboardMetric = "highScore" | "wins" | "gamesPlayed" | "totalScore";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string | null;
  value: number;
  /** Matches played in the queried scope, shown next to the ranked value. */
  gamesPlayed: number;
  trend?: "up" | "down" | "same";
}

export type SubmissionStatus =
  | "draft"
  | "pending"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "published";

export interface SubmitScorePayload {
  gameSlug: GameSlug;
  score: number;
  result: GameResult;
  difficulty?: Difficulty;
  durationMs: number;
  metadata?: Record<string, unknown>;
}
