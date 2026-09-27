"use client";

import Link from "next/link";
import { GameMeta } from "@/types";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const gameGlyph: Record<string, string> = {
  snake: "▓▓░",
  connect4: "●○●",
};

export function GameCard({ game, highScore }: { game: GameMeta; highScore?: number }) {
  const { t } = useLocale();
  return (
    <div className="clip-notch group relative flex flex-col justify-between border border-surface-border bg-surface p-6 transition-all duration-200 hover:border-neon-purple hover:shadow-glow-purple animate-rise-in">
      <div>
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded bg-surface-raised font-display text-lg text-neon-cyan">
          {gameGlyph[game.slug] ?? "◆"}
        </div>
        <h3 className="text-xl font-semibold text-white">{game.name}</h3>
        <p className="mt-1 text-sm text-muted">{game.type}</p>
        <p className="mt-3 text-sm text-white/70">{game.tagline}</p>

        <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/60">
          <span>
            {t.games.difficulty}: <span className="text-white/90">{game.difficulty}</span>
          </span>
          <span>
            {t.games.players}: <span className="text-white/90">{game.players}</span>
          </span>
          {typeof highScore === "number" && (
            <span>
              {t.games.bestScore}: <span className="text-neon-cyan">{highScore}</span>
            </span>
          )}
        </div>
      </div>

      <Link
        href={`/games/${game.slug}`}
        className="clip-notch-sm mt-6 inline-flex items-center justify-center bg-neon-magenta py-2.5 text-sm font-semibold text-black transition-shadow hover:shadow-glow-magenta focus-ring"
      >
        {t.games.play}
      </Link>
    </div>
  );
}
