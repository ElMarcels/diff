"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Leaderboard } from "@/components/Leaderboard";
import { MOCK_LEADERBOARD_CONNECT4, MOCK_LEADERBOARD_SNAKE } from "@/lib/mock-data";

type GameFilter = "global" | "snake" | "connect4";
type TimeFilter = "all" | "monthly" | "weekly";

export default function LeaderboardsPage() {
  const { t } = useLocale();
  const [gameFilter, setGameFilter] = useState<GameFilter>("snake");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  const entries = gameFilter === "connect4" ? MOCK_LEADERBOARD_CONNECT4 : MOCK_LEADERBOARD_SNAKE;
  const valueLabel = gameFilter === "connect4" ? t.leaderboards.wins : t.leaderboards.highScore;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-white">{t.leaderboards.title}</h1>
      <p className="mt-2 text-white/60">{t.leaderboards.subtitle}</p>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {(["global", "snake", "connect4"] as GameFilter[]).map((f) => (
            <FilterButton key={f} active={gameFilter === f} onClick={() => setGameFilter(f)}>
              {f === "global" ? t.leaderboards.global : f === "snake" ? "Snake" : "Connect 4"}
            </FilterButton>
          ))}
        </div>
        <div className="flex gap-2">
          {(["all", "monthly", "weekly"] as TimeFilter[]).map((f) => (
            <FilterButton key={f} active={timeFilter === f} onClick={() => setTimeFilter(f)} subtle>
              {f === "all" ? t.leaderboards.allTime : f === "monthly" ? t.leaderboards.monthly : t.leaderboards.weekly}
            </FilterButton>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <Leaderboard entries={entries} valueLabel={valueLabel} />
      </div>
    </div>
  );
}

function FilterButton({
  children,
  active,
  onClick,
  subtle = false,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  subtle?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`clip-notch-sm px-4 py-1.5 text-xs transition-colors focus-ring ${
        active
          ? subtle
            ? "bg-surface-raised text-neon-cyan"
            : "bg-neon-purple text-white"
          : "border border-surface-border text-white/60 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
