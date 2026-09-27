"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Connect4Game } from "@/games/connect4/Connect4Game";

export default function Connect4Page() {
  const { t } = useLocale();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-center font-display text-xl text-white">{t.connect4.title}</h1>
      <Connect4Game />
    </div>
  );
}
