import { DiffUser, GameStats } from "@/types";
import { UserAvatar } from "./UserAvatar";
import { XPBar } from "./XPBar";
import { xpProgress } from "@/lib/xp";

export function PlayerCard({ user, stats, t }: { user: DiffUser; stats: GameStats[]; t: any }) {
  const snake = stats.find((s) => s.gameSlug === "snake");
  const connect4 = stats.find((s) => s.gameSlug === "connect4");
  const progress = xpProgress(user.xp);
  const totalGames = stats.reduce((acc, s) => acc + s.gamesPlayed, 0);
  const totalWins = stats.reduce((acc, s) => acc + s.wins, 0);
  const totalLosses = stats.reduce((acc, s) => acc + s.losses, 0);
  const totalScore = stats.reduce((acc, s) => acc + s.totalScore, 0);

  return (
    <div className="clip-notch relative overflow-hidden border border-surface-border bg-surface p-6 shadow-glow-soft sm:p-8">
      <div className="pointer-events-none absolute inset-0 bg-grid-fade opacity-60" />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
        <UserAvatar src={user.avatar} alt={user.displayName} size={88} ring />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-white">{user.displayName}</h1>
          <p className="text-sm text-muted">
            @{user.username} · {t.profile.joined} {new Date(user.createdAt).toLocaleDateString()}
          </p>
          <div className="mt-3 max-w-xs">
            <XPBar level={progress.level} percent={progress.percent} />
          </div>
        </div>
      </div>

      <div className="relative mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label={t.profile.gamesPlayed} value={totalGames} />
        <Stat label={t.profile.wins} value={totalWins} />
        <Stat label={t.profile.losses} value={totalLosses} />
        <Stat label={t.profile.totalScore} value={totalScore} />
        <Stat label={t.profile.snakeHighScore} value={snake?.highScore ?? 0} />
        <Stat label={t.profile.connect4Wins} value={connect4?.wins ?? 0} />
        <Stat label={t.profile.currentStreak} value={connect4?.winStreak ?? 0} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="clip-notch-sm border border-surface-border bg-surface-raised p-3">
      <div className="font-display text-lg text-neon-magenta">{value}</div>
      <div className="mt-1 text-[11px] text-muted">{label}</div>
    </div>
  );
}
