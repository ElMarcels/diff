"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { SnakeGame } from "@/games/snake/SnakeGame";

export default function SnakePage() {
  const { t } = useLocale();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-center font-display text-xl text-white">{t.snake.title}</h1>
      <SnakeGame />
    </div>
  );
}
