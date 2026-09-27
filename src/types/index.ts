export type GameSlug = "snake" | "connect4";
export type Difficulty = "easy" | "normal" | "hard";
export type GameResult = "win" | "loss" | "draw" | "n/a";

export interface DiffUser {
  id: string;
  discordId: string;
  username: string;
  displayName: string;
  avatar: string | null;
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

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string | null;
  value: number;
  trend?: "up" | "down" | "same";
}

export interface SubmitScorePayload {
  gameSlug: GameSlug;
  score: number;
  result: GameResult;
  difficulty?: Difficulty;
  durationMs: number;
  metadata?: Record<string, unknown>;
}
