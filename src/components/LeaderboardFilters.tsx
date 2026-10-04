"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dictionary } from "@/lib/i18n/config";
import { GameMeta, LeaderboardPeriod } from "@/types";

/**
 * Query-string driven filters. State lives in the URL so the board itself can
 * stay a Server Component that reads `searchParams`, and so a filtered board
 * is shareable and survives a refresh.
 *
 * The game list comes from the catalogue, never from a hardcoded array: a game
 * published by the community shows up here without touching this file.
 */
export function LeaderboardFilters({
  games,
  selectedGame,
  period,
  t,
}: {
  games: GameMeta[];
  /** Slug of the selected game, or null for the global board. */
  selectedGame: string | null;
  period: LeaderboardPeriod;
  t: Dictionary;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function apply(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap gap-2">
        <FilterButton active={selectedGame === null} onClick={() => apply({ game: null })}>
          {t.leaderboards.global}
        </FilterButton>
        {games.map((game) => (
          <FilterButton
            key={game.slug}
            active={selectedGame === game.slug}
            onClick={() => apply({ game: game.slug })}
          >
            {game.name}
          </FilterButton>
        ))}
      </div>
      <div className="flex gap-2">
        {(["all", "monthly", "weekly"] as LeaderboardPeriod[]).map((p) => (
          <FilterButton key={p} active={period === p} onClick={() => apply({ period: p === "all" ? null : p })} subtle>
            {p === "all" ? t.leaderboards.allTime : p === "monthly" ? t.leaderboards.monthly : t.leaderboards.weekly}
          </FilterButton>
        ))}
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
