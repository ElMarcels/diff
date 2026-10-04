import { LeaderboardEntry } from "@/types";
import { Dictionary } from "@/lib/i18n/config";
import { UserAvatar } from "./UserAvatar";

/**
 * Ranking table. The "Trend" column was removed on purpose: nothing ever
 * filled `LeaderboardEntry.trend`, so it only ever rendered a fake arrow.
 * A missing trend is better than an invented one (D5).
 */
export function Leaderboard({
  entries,
  valueLabel,
  currentUserId,
  t,
}: {
  entries: LeaderboardEntry[];
  valueLabel: string;
  /** Highlights the signed-in player's own row. */
  currentUserId?: string | null;
  t: Dictionary;
}) {
  if (entries.length === 0) {
    return (
      <div className="clip-notch border border-surface-border bg-surface p-10 text-center text-muted">
        {t.leaderboards.empty}
      </div>
    );
  }

  return (
    <div className="clip-notch overflow-hidden border border-surface-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-surface-border text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3">{t.leaderboards.rank}</th>
            <th className="px-4 py-3">{t.leaderboards.player}</th>
            <th className="px-4 py-3 text-right">{t.leaderboards.gamesPlayed}</th>
            <th className="px-4 py-3 text-right">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const isYou = Boolean(currentUserId) && e.userId === currentUserId;
            return (
              <tr
                key={e.userId}
                className={`border-b border-surface-border/60 last:border-0 ${
                  isYou ? "bg-neon-purple/15" : e.rank <= 3 ? "bg-surface-raised/60" : ""
                }`}
              >
                <td className="px-4 py-3 font-display text-xs text-neon-purple">{e.rank}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar src={e.avatar} alt={e.username} size={28} />
                    <span className={isYou ? "font-medium text-neon-cyan" : "text-white/90"}>
                      {e.username}
                      {isYou ? ` (${t.leaderboards.you})` : ""}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-white/60">{e.gamesPlayed}</td>
                <td className="px-4 py-3 text-right font-medium text-white">{e.value}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
