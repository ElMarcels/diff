"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { DatabaseNotice } from "@/components/games/DatabaseNotice";
import { Leaderboard } from "@/components/Leaderboard";
import { LeaderboardFilters } from "@/components/LeaderboardFilters";
import { Dictionary } from "@/lib/i18n/config";
import { GameMeta, LeaderboardEntry, LeaderboardMetric, LeaderboardPeriod } from "@/types";

/**
 * Localized wrapper around the server-fetched board. The query runs in the
 * page's Server Component; this renders the result and owns the filters.
 */
export function LeaderboardView({
  games,
  selectedGame,
  period,
  metric,
  entries,
  dbError,
  currentUserId,
}: {
  games: GameMeta[];
  selectedGame: string | null;
  period: LeaderboardPeriod;
  /** Already resolved and allow-listed by the server. */
  metric: LeaderboardMetric;
  entries: LeaderboardEntry[];
  dbError?: string | null;
  currentUserId?: string | null;
}) {
  const { t } = useLocale();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-white">{t.leaderboards.title}</h1>
      <p className="mt-2 text-white/60">{t.leaderboards.subtitle}</p>

      {dbError ? (
        <div className="mt-6">
          <DatabaseNotice message={dbError} />
        </div>
      ) : null}

      <LeaderboardFilters games={games} selectedGame={selectedGame} period={period} t={t} />

      <div className="mt-6">
        <Leaderboard
          entries={entries}
          valueLabel={metricLabel(metric, t)}
          currentUserId={currentUserId}
          t={t}
        />
      </div>
    </div>
  );
}

function metricLabel(metric: LeaderboardMetric, t: Dictionary): string {
  switch (metric) {
    case "highScore":
      return t.leaderboards.highScore;
    case "wins":
      return t.leaderboards.wins;
    case "gamesPlayed":
      return t.leaderboards.gamesPlayed;
    default:
      return t.leaderboards.totalScore;
  }
}
