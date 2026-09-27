"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { GameGrid } from "@/components/GameGrid";
import { MOCK_GAMES } from "@/lib/mock-data";

export default function GamesPage() {
  const { t } = useLocale();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-white">{t.games.title}</h1>
      <p className="mt-2 text-white/60">{t.games.subtitle}</p>
      <div className="mt-8">
        <GameGrid games={MOCK_GAMES} />
      </div>
    </div>
  );
}
