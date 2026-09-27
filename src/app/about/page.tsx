"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Logo } from "@/components/Logo";

export default function AboutPage() {
  const { t } = useLocale();
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-20 text-center">
      <Logo size={32} />
      <h1 className="text-2xl font-semibold text-white">{t.about.title}</h1>
      <p className="text-white/70">{t.about.body}</p>
    </div>
  );
}
