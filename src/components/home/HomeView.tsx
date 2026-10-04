"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Button } from "@/components/Button";
import { GameGrid } from "@/components/GameGrid";
import { DatabaseNotice } from "@/components/games/DatabaseNotice";
import { Leaderboard } from "@/components/Leaderboard";
import { GameMeta, LeaderboardEntry } from "@/types";

export default function HomePage({
  games,
  dbError,
  leaders,
}: {
  games: GameMeta[];
  dbError?: string | null;
  leaders: LeaderboardEntry[];
}) {
  const { t } = useLocale();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-surface-border bg-black">
        <div className="pointer-events-none absolute inset-0 bg-grid-fade" />
        <div className="pointer-events-none absolute inset-0 bg-scanlines opacity-40" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="h-16 w-16 animate-pulse-glow">
              <rect x="2" y="2" width="8" height="8" fill="#FF2E9A" />
              <rect x="14" y="2" width="8" height="8" fill="#00F0FF" />
              <rect x="8" y="8" width="8" height="8" fill="#9D4EDD" />
              <rect x="2" y="14" width="8" height="8" fill="#3D5AFE" />
              <rect x="14" y="14" width="8" height="8" fill="#FF2E9A" />
            </svg>
          </div>
          <h1 className="font-display text-2xl leading-relaxed text-white text-glow-magenta sm:text-3xl md:text-4xl">
            {t.home.title}
          </h1>
          <p className="max-w-lg text-base text-white/70">{t.home.subtitle}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button href="/games" variant="primary">
              {t.home.playNow}
            </Button>
            <Button href="/creator" variant="secondary">
              {t.home.submitGame}
            </Button>
          </div>
        </div>
      </section>

      {/* Featured games */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-6 text-lg font-semibold text-white">{t.home.featuredTitle}</h2>
        {dbError ? <DatabaseNotice message={dbError} /> : null}
        <GameGrid games={games} />
      </section>

      {/* Leaderboard preview */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-6 text-lg font-semibold text-white">{t.home.topPlayers}</h2>
        <Leaderboard entries={leaders} valueLabel={t.leaderboards.totalScore} t={t} />
      </section>

      {/* CTA */}
      <section className="border-t border-surface-border bg-surface">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-4 py-16 text-center">
          <h2 className="text-xl font-semibold text-white">{t.home.ctaTitle}</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button href="/register" variant="primary">
              {t.home.ctaButton}
            </Button>
            <Button href="/login" variant="ghost">
              {t.nav.login}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
