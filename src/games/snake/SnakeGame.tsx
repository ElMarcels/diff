"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/Button";

const GRID_SIZE = 20;
const CELL = 20; // px
const INITIAL_SPEED_MS = 140;
const MIN_SPEED_MS = 60;
const SPEED_STEP_MS = 4; // gets faster every food eaten

type Point = { x: number; y: number };
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

const OPPOSITE: Record<Direction, Direction> = {
  UP: "DOWN",
  DOWN: "UP",
  LEFT: "RIGHT",
  RIGHT: "LEFT",
};

function randomFood(snake: Point[]): Point {
  let food: Point;
  do {
    food = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
  } while (snake.some((s) => s.x === food.x && s.y === food.y));
  return food;
}

const HIGH_SCORE_KEY = "diff_snake_high_score"; // per-viewer convenience only; source of truth is the server

export function SnakeGame() {
  const { t } = useLocale();
  const { data: session } = useSession();
  const { push } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 14, y: 10 });
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [speed, setSpeed] = useState(INITIAL_SPEED_MS);

  const directionRef = useRef(direction);
  const nextDirectionRef = useRef(direction);
  const startTimeRef = useRef<number>(0);
  directionRef.current = direction;

  useEffect(() => {
    const stored = Number(localStorage.getItem(HIGH_SCORE_KEY) ?? 0);
    setBest(stored);
  }, []);

  const resetGame = useCallback(() => {
    const initialSnake = [{ x: 10, y: 10 }];
    setSnake(initialSnake);
    setFood(randomFood(initialSnake));
    setDirection("RIGHT");
    nextDirectionRef.current = "RIGHT";
    setStarted(false);
    setPaused(false);
    setGameOver(false);
    setScore(0);
    setSpeed(INITIAL_SPEED_MS);
  }, []);

  const submitScore = useCallback(
    async (finalScore: number) => {
      if (!session?.user) return;
      const durationMs = Date.now() - startTimeRef.current;
      try {
        const res = await fetch("/api/games/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameSlug: "snake",
            score: finalScore,
            result: "n/a",
            durationMs,
            metadata: { foodEaten: finalScore / 10 },
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.xpGain) push(`+${data.xpGain} XP`, "success");
      } catch {
        // Network errors here shouldn't block the player from seeing Game Over.
      }
    },
    [session, push]
  );

  const endGame = useCallback(
    (finalScore: number) => {
      setGameOver(true);
      if (finalScore > best) {
        setBest(finalScore);
        localStorage.setItem(HIGH_SCORE_KEY, String(finalScore));
        push(t.snake.newBest, "achievement");
      }
      submitScore(finalScore);
    },
    [best, push, submitScore, t.snake.newBest]
  );

  // Game loop
  useEffect(() => {
    if (!started || paused || gameOver) return;
    const interval = setInterval(() => {
      setSnake((prev) => {
        const dir = nextDirectionRef.current;
        setDirection(dir);
        const head = prev[0];
        const newHead: Point = {
          x: head.x + (dir === "LEFT" ? -1 : dir === "RIGHT" ? 1 : 0),
          y: head.y + (dir === "UP" ? -1 : dir === "DOWN" ? 1 : 0),
        };

        const hitWall = newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE;
        const hitSelf = prev.some((s) => s.x === newHead.x && s.y === newHead.y);
        if (hitWall || hitSelf) {
          endGame(score);
          return prev;
        }

        const ateFood = newHead.x === food.x && newHead.y === food.y;
        const newSnake = [newHead, ...prev];
        if (ateFood) {
          setScore((s) => s + 10);
          setFood(randomFood(newSnake));
          setSpeed((s) => Math.max(MIN_SPEED_MS, s - SPEED_STEP_MS));
        } else {
          newSnake.pop();
        }
        return newSnake;
      });
    }, speed);
    return () => clearInterval(interval);
  }, [started, paused, gameOver, speed, food, score, endGame]);

  // Keyboard controls
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const map: Record<string, Direction> = {
        ArrowUp: "UP",
        ArrowDown: "DOWN",
        ArrowLeft: "LEFT",
        ArrowRight: "RIGHT",
        w: "UP",
        s: "DOWN",
        a: "LEFT",
        d: "RIGHT",
        W: "UP",
        S: "DOWN",
        A: "LEFT",
        D: "RIGHT",
      };
      const newDir = map[e.key];
      if (!newDir) {
        if (e.key === " ") togglePause();
        return;
      }
      e.preventDefault();
      if (!started) {
        setStarted(true);
        startTimeRef.current = Date.now();
      }
      if (newDir !== OPPOSITE[directionRef.current]) {
        nextDirectionRef.current = newDir;
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  function togglePause() {
    if (!started || gameOver) return;
    setPaused((p) => !p);
  }

  function handleDirectionTap(dir: Direction) {
    if (!started) {
      setStarted(true);
      startTimeRef.current = Date.now();
    }
    if (dir !== OPPOSITE[directionRef.current]) {
      nextDirectionRef.current = dir;
    }
  }

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#0A0A0F";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL, 0);
      ctx.lineTo(i * CELL, GRID_SIZE * CELL);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL);
      ctx.lineTo(GRID_SIZE * CELL, i * CELL);
      ctx.stroke();
    }

    // Food
    ctx.fillStyle = "#00F0FF";
    ctx.shadowColor = "#00F0FF";
    ctx.shadowBlur = 14;
    ctx.fillRect(food.x * CELL + 3, food.y * CELL + 3, CELL - 6, CELL - 6);
    ctx.shadowBlur = 0;

    // Snake
    snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? "#FF2E9A" : "#9D4EDD";
      ctx.shadowColor = i === 0 ? "#FF2E9A" : "transparent";
      ctx.shadowBlur = i === 0 ? 10 : 0;
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    });
    ctx.shadowBlur = 0;
  }, [snake, food]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-[400px] items-center justify-between font-display text-xs">
        <span className="text-white">
          {t.snake.score}: <span className="text-neon-magenta">{score}</span>
        </span>
        <span className="text-white">
          {t.snake.best}: <span className="text-neon-cyan">{best}</span>
        </span>
      </div>

      <div className="clip-notch relative border border-surface-border bg-black p-1 shadow-glow-soft">
        <canvas ref={canvasRef} width={GRID_SIZE * CELL} height={GRID_SIZE * CELL} className="block" />

        {!started && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-center text-sm text-white/80">
            {t.snake.start}
          </div>
        )}

        {paused && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 font-display text-sm text-neon-cyan">
            {t.snake.pause.toUpperCase()}
          </div>
        )}

        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 text-center">
            <span className="font-display text-lg text-neon-magenta text-glow-magenta">{t.snake.gameOver}</span>
            <span className="text-sm text-white/80">
              {t.snake.score}: {score}
            </span>
            <Button variant="primary" onClick={resetGame}>
              {t.snake.restart}
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={togglePause} disabled={!started || gameOver}>
          {paused ? t.snake.resume : t.snake.pause}
        </Button>
        <Button variant="ghost" onClick={resetGame}>
          {t.snake.restart}
        </Button>
      </div>

      {/* Touch controls */}
      <div className="mt-2 grid w-40 grid-cols-3 gap-2 md:hidden">
        <div />
        <TouchBtn label="▲" onTap={() => handleDirectionTap("UP")} />
        <div />
        <TouchBtn label="◀" onTap={() => handleDirectionTap("LEFT")} />
        <TouchBtn label="▼" onTap={() => handleDirectionTap("DOWN")} />
        <TouchBtn label="▶" onTap={() => handleDirectionTap("RIGHT")} />
      </div>
    </div>
  );
}

function TouchBtn({ label, onTap }: { label: string; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="clip-notch-sm flex h-12 items-center justify-center border border-surface-border bg-surface-raised text-white active:bg-neon-purple/40 focus-ring"
    >
      {label}
    </button>
  );
}
