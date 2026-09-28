"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { GameGrid } from "@/components/GameGrid";
import { GameMeta } from "@/types";

/** Localized wrapper around the server-fetched game catalogue. */
export function GamesView({ games }: { games: GameMeta[] }) {
  const { t } = useLocale();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-white">{t.games.title}</h1>
      <p className="mt-2 text-white/60">{t.games.subtitle}</p>
      <div className="mt-8">
        <GameGrid games={games} />
      </div>
    </div>
  );
}
