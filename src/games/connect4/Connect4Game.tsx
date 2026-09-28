"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth/client";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/Button";
import { Difficulty } from "@/types";
import { Board, COLS, ROWS, checkWinner, createBoard, dropPiece, getCpuMove, isBoardFull } from "./ai";

export function Connect4Game() {
  const { t } = useLocale();
  const { user } = useSession();
  const { push } = useToast();

  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [board, setBoard] = useState<Board>(createBoard());
  const [turn, setTurn] = useState<1 | 2>(1); // 1 = human, 2 = CPU
  const [winner, setWinner] = useState<0 | 1 | 2 | null>(null);
  const [cpuThinking, setCpuThinking] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [submitted, setSubmitted] = useState(false);

  function reset(nextDifficulty: Difficulty = difficulty) {
    setBoard(createBoard());
    setTurn(1);
    setWinner(null);
    setSubmitted(false);
    setDifficulty(nextDifficulty);
    setStartTime(Date.now());
  }

  function handleDrop(col: number) {
    if (winner !== null || turn !== 1 || cpuThinking) return;
    const copy = board.map((row) => [...row]);
    const row = dropPiece(copy, col, 1);
    if (row === -1) return; // column full
    setBoard(copy);

    const w = checkWinner(copy);
    if (w || isBoardFull(copy)) {
      setWinner(w || 0);
      return;
    }
    setTurn(2);
  }

  // CPU move
  useEffect(() => {
    if (turn !== 2 || winner !== null) return;
    setCpuThinking(true);
    const timer = setTimeout(() => {
      setBoard((prev) => {
        const copy = prev.map((row) => [...row]);
        const col = getCpuMove(copy, difficulty);
        dropPiece(copy, col, 2);
        const w = checkWinner(copy);
        if (w || isBoardFull(copy)) {
          setWinner(w || 0);
        } else {
          setTurn(1);
        }
        return copy;
      });
      setCpuThinking(false);
    }, 500); // small delay so the CPU move feels intentional, not instant
    return () => clearTimeout(timer);
  }, [turn, winner, difficulty]);

  // Submit result once resolved
  useEffect(() => {
    if (winner === null || submitted) return;
    setSubmitted(true);
    const result = winner === 1 ? "win" : winner === 2 ? "loss" : "draw";
    if (winner === 1) push(t.connect4.youWin, "success");
    else if (winner === 2) push(t.connect4.cpuWins, "error");
    else push(t.connect4.draw, "info");

    if (!user) return;
    fetch("/api/games/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameSlug: "connect4",
        score: winner === 1 ? 1 : 0,
        result,
        difficulty,
        durationMs: Date.now() - startTime,
        metadata: { board, winner },
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.xpGain) push(`+${data.xpGain} XP`, "success");
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner, user]);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">{t.connect4.difficulty}:</span>
        {(["easy", "normal", "hard"] as Difficulty[]).map((d) => (
          <button
            key={d}
            onClick={() => reset(d)}
            className={`clip-notch-sm px-3 py-1 text-xs transition-colors focus-ring ${
              difficulty === d ? "bg-neon-purple text-white" : "border border-surface-border text-white/60"
            }`}
          >
            {t.connect4[d]}
          </button>
        ))}
      </div>

      <div className="text-sm font-medium text-white">
        {winner === null ? (turn === 1 ? t.connect4.yourTurn : t.connect4.cpuTurn) : null}
      </div>

      <div className="clip-notch relative border border-surface-border bg-surface p-3 shadow-glow-soft">
        <div
          className="grid gap-1.5 sm:gap-2"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: COLS }).map((_, c) => (
            <button
              key={c}
              onClick={() => handleDrop(c)}
              disabled={winner !== null || turn !== 1 || cpuThinking}
              className="flex flex-col gap-1.5 sm:gap-2 focus-ring disabled:cursor-not-allowed"
              aria-label={`Drop in column ${c + 1}`}
            >
              {Array.from({ length: ROWS }).map((_, r) => {
                const cell = board[r][c];
                return (
                  <span
                    key={r}
                    className={`h-8 w-8 rounded-full transition-all duration-200 sm:h-10 sm:w-10 ${
                      cell === 0
                        ? "bg-black/60"
                        : cell === 1
                        ? "bg-neon-magenta shadow-glow-magenta animate-rise-in"
                        : "bg-neon-cyan shadow-glow-cyan animate-rise-in"
                    }`}
                  />
                );
              })}
            </button>
          ))}
        </div>

        {winner !== null && (
          <div className="clip-notch absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85">
            <span className="font-display text-base text-white">
              {winner === 1 ? t.connect4.youWin : winner === 2 ? t.connect4.cpuWins : t.connect4.draw}
            </span>
            <Button variant="primary" onClick={() => reset()}>
              {t.connect4.restart}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
