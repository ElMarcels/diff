"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { locales } from "@/lib/i18n/config";

const labels: Record<string, string> = { en: "EN", es: "ES" };

export function LanguageSelector() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="flex items-center gap-1 rounded-full border border-surface-border p-1">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`rounded-full px-3 py-1 text-xs transition-colors focus-ring ${
            locale === l ? "bg-neon-purple text-white" : "text-white/60 hover:text-white"
          }`}
        >
          {labels[l]}
        </button>
      ))}
    </div>
  );
}
