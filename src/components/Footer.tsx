"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { LanguageSelector } from "./LanguageSelector";
import { Logo } from "./Logo";

export function Footer() {
  const { t } = useLocale();
  const discordInvite = process.env.NEXT_PUBLIC_DISCORD_INVITE || "#";

  return (
    <footer className="border-t border-surface-border bg-black">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Logo size={20} />
          <span className="text-xs text-muted">DIFF © 2026</span>
        </div>

        <nav className="flex flex-wrap items-center gap-5 text-sm text-white/70">
          <Link href="/about" className="hover:text-neon-cyan">
            {t.footer.about}
          </Link>
          <Link href="/privacy" className="hover:text-neon-cyan">
            {t.footer.privacy}
          </Link>
          <Link href="/terms" className="hover:text-neon-cyan">
            {t.footer.terms}
          </Link>
          <a href={discordInvite} target="_blank" rel="noreferrer" className="hover:text-neon-cyan">
            {t.footer.discord}
          </a>
        </nav>

        <LanguageSelector />
      </div>
    </footer>
  );
}
