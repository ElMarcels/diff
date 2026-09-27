"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { locales } from "@/lib/i18n/config";
import { Button } from "@/components/Button";
import { UserAvatar } from "@/components/UserAvatar";
import { useToast } from "@/components/Toast";

const localeLabels: Record<string, string> = { en: "English", es: "Español" };

export default function SettingsPage() {
  const { data: session } = useSession();
  const { t, locale, setLocale } = useLocale();
  const { push } = useToast();

  const [username, setUsername] = useState((session?.user as any)?.username || "");
  const [animations, setAnimations] = useState(true);
  const [sounds, setSounds] = useState(false);
  const [publicProfile, setPublicProfile] = useState(true);
  const [showStats, setShowStats] = useState(true);

  function handleSave() {
    // TODO: wire to PATCH /api/users/me once DATABASE_URL is configured.
    push(t.settings.save, "success");
  }

  if (!session?.user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-white/70">{t.nav.login}</p>
        <Button href="/login" variant="primary" className="mt-4">
          {t.nav.login}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-white">{t.settings.title}</h1>

      <Section title={t.settings.account}>
        <div className="flex items-center gap-4">
          <UserAvatar src={session.user.image} alt={session.user.name ?? "player"} size={56} />
          <div>
            <p className="text-sm text-white/90">{session.user.name}</p>
            <p className="text-xs text-muted">Discord account connected</p>
          </div>
        </div>
        <label className="mt-4 block">
          <span className="mb-1 block text-xs text-muted">{t.settings.username}</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="clip-notch-sm w-full border border-surface-border bg-surface-raised px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan"
            maxLength={32}
          />
        </label>
      </Section>

      <Section title={t.settings.appearance}>
        <Toggle label={t.settings.animations} checked={animations} onChange={setAnimations} />
        <Toggle label={t.settings.sounds} checked={sounds} onChange={setSounds} />
      </Section>

      <Section title={t.settings.language}>
        <div className="flex gap-2">
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              className={`clip-notch-sm px-4 py-2 text-sm transition-colors focus-ring ${
                locale === l ? "bg-neon-purple text-white" : "border border-surface-border text-white/70"
              }`}
            >
              {localeLabels[l]}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t.settings.privacy}>
        <Toggle label={t.settings.publicProfile} checked={publicProfile} onChange={setPublicProfile} />
        <Toggle label={t.settings.showStats} checked={showStats} onChange={setShowStats} />
      </Section>

      <div className="mt-8 flex items-center gap-3">
        <Button variant="primary" onClick={handleSave}>
          {t.settings.save}
        </Button>
        <Button variant="ghost" onClick={() => signOut()}>
          {t.settings.logout}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="clip-notch mt-6 border border-surface-border bg-surface p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neon-cyan">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-white/85">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`h-6 w-11 rounded-full p-0.5 transition-colors focus-ring ${
          checked ? "bg-neon-magenta" : "bg-surface-raised"
        }`}
        aria-pressed={checked}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
