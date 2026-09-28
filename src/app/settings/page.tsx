"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { locales } from "@/lib/i18n/config";
import { Button } from "@/components/Button";
import { UserAvatar } from "@/components/UserAvatar";
import { useToast } from "@/components/Toast";
import { Field, FormError } from "@/components/forms/Form";
import { useAuth } from "@/lib/auth/client";
import { apiFetch } from "@/lib/api-client";
import { useRouter } from "next/navigation";

const localeLabels: Record<string, string> = { en: "English", es: "Español" };

export default function SettingsPage() {
  const { user, status, signOut, refresh } = useAuth();
  const { t, locale, setLocale } = useLocale();
  const { push } = useToast();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [animations, setAnimations] = useState(true);
  const [sounds, setSounds] = useState(false);
  const [publicProfile, setPublicProfile] = useState(true);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setUsername(user.username);
    setDisplayName(user.displayName);
    setAnimations(user.animationsEnabled);
    setSounds(user.soundEnabled);
    setPublicProfile(user.publicProfile);
  }, [user]);

  async function handleSave() {
    setBusy(true);
    setError(null);
    setFields({});
    const res = await apiFetch<{ user: unknown }>("/api/auth/me", {
      method: "PATCH",
      body: JSON.stringify({ username, displayName, animationsEnabled: animations, soundEnabled: sounds, publicProfile }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? t.common.error);
      setFields(res.fields ?? {});
      return;
    }
    await refresh();
    push(t.settings.saved, "success");
  }

  if (status === "loading") {
    return <div className="mx-auto max-w-2xl px-4 py-24 text-center text-sm text-muted">{t.common.loading}</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-white/70">{t.settings.signInRequired}</p>
        <Button href="/login?next=/settings" variant="primary" className="mt-4">
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
          <UserAvatar src={user.avatar} alt={user.username} size={56} ring />
          <div>
            <p className="text-sm text-white/90">{user.displayName}</p>
            <p className="text-xs text-muted">{user.email}</p>
            <p className="mt-1 text-[11px] text-neon-purple">{t.roles[user.role]}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={t.settings.username} value={username} onChange={setUsername} error={fields.username} />
          <Field label={t.settings.displayName} value={displayName} onChange={setDisplayName} error={fields.displayName} />
        </div>
        <p className="text-[11px] text-muted">{t.settings.emailHint}</p>
      </Section>

      <PasswordSection />

      <Section title={t.settings.appearance}>
        <Toggle label={t.settings.animations} checked={animations} onChange={setAnimations} />
        <Toggle label={t.settings.sounds} checked={sounds} onChange={setSounds} />
      </Section>

      <Section title={t.settings.language}>
        <div className="flex gap-2">
          {locales.map((l) => (
            <button
              key={l}
              onClick={() => {
                setLocale(l);
                void apiFetch("/api/auth/me", { method: "PATCH", body: JSON.stringify({ locale: l }) }).then(refresh);
              }}
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
        <Toggle label={t.settings.showStats} checked={true} onChange={() => {}} />
      </Section>

      {(user.role === "moderator" || user.role === "owner") && (
        <Section title={t.settings.staffLinks}>
          <div className="flex flex-wrap gap-2">
            <Link href="/creator" className="clip-notch-sm border border-surface-border px-4 py-2 text-sm text-white/80">
              {t.nav.creator}
            </Link>
            <Link href="/moderation" className="clip-notch-sm border border-surface-border px-4 py-2 text-sm text-white/80">
              {t.nav.moderation}
            </Link>
            {user.role === "owner" && (
              <Link href="/owner" className="clip-notch-sm border border-neon-purple px-4 py-2 text-sm text-neon-purple">
                {t.nav.owner}
              </Link>
            )}
          </div>
        </Section>
      )}

      <FormError message={error} />

      <div className="mt-8 flex items-center gap-3">
        <Button variant="primary" onClick={handleSave} disabled={busy}>
          {busy ? t.common.loading : t.settings.save}
        </Button>
        <Button variant="ghost" onClick={() => signOut().then(() => router.push("/"))}>
          {t.settings.logout}
        </Button>
      </div>
    </div>
  );
}

function PasswordSection() {
  const { t } = useLocale();
  const { push } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function changePassword() {
    setBusy(true);
    setError(null);
    setFields({});
    const res = await apiFetch("/api/auth/me", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? t.common.error);
      setFields(res.fields ?? {});
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    push(t.settings.passwordChanged, "success");
  }

  return (
    <Section title={t.settings.changePassword}>
      <Field
        label={t.settings.currentPassword}
        type="password"
        value={currentPassword}
        onChange={setCurrentPassword}
        autoComplete="current-password"
        error={fields.currentPassword}
      />
      <Field
        label={t.settings.newPassword}
        type="password"
        value={newPassword}
        onChange={setNewPassword}
        autoComplete="new-password"
        hint={t.auth.passwordHint}
        error={fields.newPassword}
      />
      <FormError message={error} />
      <Button variant="secondary" onClick={changePassword} disabled={busy || !currentPassword || !newPassword}>
        {busy ? t.common.loading : t.settings.updatePassword}
      </Button>
    </Section>
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
