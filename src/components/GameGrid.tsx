import { GameMeta } from "@/types";
import { GameCard } from "./GameCard";

export function GameGrid({ games, highScores = {} }: { games: GameMeta[]; highScores?: Record<string, number> }) {
  if (games.length === 0) {
    return (
      <div className="clip-notch border border-surface-border bg-surface p-10 text-center text-muted">
        No games available right now.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {games.map((g) => (
        <GameCard key={g.slug} game={g} highScore={highScores[g.slug]} />
      ))}
    </div>
  );
}
