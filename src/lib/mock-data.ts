import { Achievement, DiffUser, GameMeta, GameStats, LeaderboardEntry } from "@/types";

/**
 * Mock data used only when DATABASE_URL isn't configured yet, so the
 * frontend is fully browsable during early development. Every service in
 * lib/services swaps this for real Postgres queries the moment
 * isDbConfigured() is true — this file is never used as a persistence layer.
 */

export const MOCK_GAMES: GameMeta[] = [
  {
    slug: "snake",
    name: "Snake",
    description: "Guide the snake, eat the pixels, don't hit the walls.",
    tagline: "How long can you survive?",
    type: "Arcade / Solo",
    difficulty: "Medium",
    players: "1 Player",
    enabled: true,
  },
  {
    slug: "connect4",
    name: "Connect 4",
    description: "Classic 7x6 grid. Get four in a row before the CPU does.",
    tagline: "Four in a row. Can you beat the machine?",
    type: "Strategy / 1v1 vs CPU",
    difficulty: "Hard",
    players: "1v1 vs CPU",
    enabled: true,
  },
];

export const MOCK_ACHIEVEMENTS: Achievement[] = [
  { slug: "first-game", name: "First Game", description: "Play your first match.", icon: "Play" },
  { slug: "snake-master", name: "Snake Master", description: "Score 100+ in Snake.", icon: "Zap" },
  { slug: "four-in-a-row", name: "Four in a Row", description: "Win your first Connect 4 match.", icon: "CircleDot" },
  { slug: "unstoppable", name: "Unstoppable", description: "Win 5 matches in a row.", icon: "Flame" },
  { slug: "arcade-addict", name: "Arcade Addict", description: "Play 25 matches.", icon: "Gamepad2" },
  { slug: "diff-veteran", name: "DIFF Veteran", description: "Play 100 matches.", icon: "Trophy" },
];

export const MOCK_LEADERBOARD_SNAKE: LeaderboardEntry[] = [
  { rank: 1, userId: "1", username: "PlayerOne", avatar: null, value: 340, trend: "same" },
  { rank: 2, userId: "2", username: "PixelMaster", avatar: null, value: 298, trend: "up" },
  { rank: 3, userId: "3", username: "RetroKing", avatar: null, value: 271, trend: "down" },
  { rank: 4, userId: "4", username: "NeonGhost", avatar: null, value: 210, trend: "up" },
  { rank: 5, userId: "5", username: "ByteRunner", avatar: null, value: 198, trend: "same" },
];

export const MOCK_LEADERBOARD_CONNECT4: LeaderboardEntry[] = [
  { rank: 1, userId: "2", username: "PixelMaster", avatar: null, value: 42, trend: "up" },
  { rank: 2, userId: "3", username: "RetroKing", avatar: null, value: 37, trend: "same" },
  { rank: 3, userId: "1", username: "PlayerOne", avatar: null, value: 33, trend: "down" },
  { rank: 4, userId: "6", username: "ArcadeQueen", avatar: null, value: 29, trend: "up" },
  { rank: 5, userId: "4", username: "NeonGhost", avatar: null, value: 22, trend: "same" },
];

export function mockUser(username: string): DiffUser {
  return {
    id: "mock-1",
    email: "player@diff.gg",
    username,
    displayName: username,
    avatar: null,
    role: "user",
    createdAt: "2026-01-12T00:00:00.000Z",
    lastLogin: new Date().toISOString(),
    xp: 1280,
    level: 12,
    locale: "en",
    publicProfile: true,
    soundEnabled: false,
    animationsEnabled: true,
  };
}

export function mockStats(): GameStats[] {
  return [
    { gameSlug: "snake", gamesPlayed: 41, wins: 0, losses: 0, draws: 0, highScore: 156, totalScore: 3210, winStreak: 0, bestWinStreak: 0 },
    { gameSlug: "connect4", gamesPlayed: 28, wins: 19, losses: 8, draws: 1, highScore: 0, totalScore: 0, winStreak: 3, bestWinStreak: 6 },
  ];
}
