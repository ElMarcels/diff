import { LeaderboardEntry } from "@/types";
import { UserAvatar } from "./UserAvatar";

const trendGlyph: Record<string, string> = { up: "▲", down: "▼", same: "—" };
const trendColor: Record<string, string> = {
  up: "text-neon-cyan",
  down: "text-neon-magenta",
  same: "text-muted",
};

export function Leaderboard({
  entries,
  valueLabel,
}: {
  entries: LeaderboardEntry[];
  valueLabel: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="clip-notch border border-surface-border bg-surface p-10 text-center text-muted">
        No scores yet. Be the first on the board.
      </div>
    );
  }

  return (
    <div className="clip-notch overflow-hidden border border-surface-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-surface-border text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3 text-right">{valueLabel}</th>
            <th className="px-4 py-3 text-right">Trend</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr
              key={e.userId}
              className={`border-b border-surface-border/60 last:border-0 ${
                e.rank <= 3 ? "bg-surface-raised/60" : ""
              }`}
            >
              <td className="px-4 py-3 font-display text-xs text-neon-purple">{e.rank}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <UserAvatar src={e.avatar} alt={e.username} size={28} />
                  <span className="text-white/90">{e.username}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-right font-medium text-white">{e.value}</td>
              <td className={`px-4 py-3 text-right text-xs ${trendColor[e.trend ?? "same"]}`}>
                {trendGlyph[e.trend ?? "same"]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
