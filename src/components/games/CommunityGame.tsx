"use client";

import { ExternalLink, Flag, Package } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Button } from "@/components/Button";

/** Landing page for a community game hosted outside DIFF. */
export function CommunityGame({
  slug,
  name,
  description,
  tagline,
  playUrl,
  source,
}: {
  slug: string;
  name: string;
  description: string;
  tagline: string;
  playUrl: string;
  source: string;
}) {
  const { t } = useLocale();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="clip-notch border border-surface-border bg-surface p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded bg-surface-raised font-display text-lg text-neon-cyan">
          <Package size={26} />
        </div>
        <h1 className="font-display text-xl text-white">{name}</h1>
        <p className="mt-3 text-sm text-white/70">{description}</p>
        <p className="mt-1 text-xs text-muted">{tagline}</p>

        <div className="mt-7 flex flex-col items-center gap-3">
          {playUrl ? (
            <a
              href={playUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="clip-notch-sm inline-flex items-center gap-2 bg-neon-magenta px-6 py-3 text-sm font-semibold text-black transition-shadow hover:shadow-glow-magenta focus-ring"
            >
              {t.games.play} <ExternalLink size={15} />
            </a>
          ) : (
            <p className="text-xs text-neon-magenta">{t.games.notPlayable}</p>
          )}
          <Button href="/creator" variant="ghost">
            <Flag size={14} /> {t.games.reportIssue}
          </Button>
        </div>

        <p className="mt-6 border-t border-surface-border pt-4 text-[11px] text-muted">
          {t.games.source}: {source} · /{slug}
        </p>
      </div>
    </div>
  );
}
