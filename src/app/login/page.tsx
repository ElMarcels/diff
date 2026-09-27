"use client";

import { signIn, useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Button } from "@/components/Button";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const { t } = useLocale();
  const { data: session, status } = useSession();

  if (status === "authenticated" && session) {
    redirect("/");
  }

  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center gap-8 overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-grid-fade" />
      <div className="relative flex flex-col items-center gap-6 text-center">
        <Logo size={40} />
        <h1 className="max-w-sm text-lg text-white/80">{t.home.ctaTitle}</h1>
        <Button variant="primary" onClick={() => signIn("discord")}>
          {t.home.ctaButton}
        </Button>
      </div>
    </div>
  );
}
