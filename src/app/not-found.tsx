"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Button } from "@/components/Button";

export default function NotFound() {
  const { t } = useLocale();
  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center gap-5 overflow-hidden px-4 text-center">
      <div className="pointer-events-none absolute inset-0 bg-grid-fade" />
      <span className="relative font-display text-5xl text-neon-magenta text-glow-magenta">404</span>
      <h1 className="relative font-display text-lg text-white">{t.notFound.title}</h1>
      <p className="relative text-white/60">{t.notFound.subtitle}</p>
      <Button href="/" variant="primary" className="relative">
        {t.notFound.button}
      </Button>
    </div>
  );
}
