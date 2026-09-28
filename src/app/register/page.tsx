"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useAuth } from "@/lib/auth/client";
import { Button } from "@/components/Button";
import { Logo } from "@/components/Logo";
import { useToast } from "@/components/Toast";
import { Field, FormError } from "@/components/forms/Form";

export default function RegisterPage() {
  const { t } = useLocale();
  const { signUp, status } = useAuth();
  const { push } = useToast();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    const result = await signUp({ username, email, password });
    setBusy(false);
    if (result.error) {
      setError(result.error);
      setFields(result.fields ?? {});
      return;
    }
    push(t.auth.welcome, "success");
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-[80vh] flex-col items-center justify-center gap-8 overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-grid-fade" />
      <div className="relative w-full max-w-sm">
        <div className="clip-notch mb-6 flex flex-col items-center gap-3 border border-surface-border bg-surface p-8 text-center">
          <Logo size={40} />
          <h1 className="text-lg text-white/90">{t.auth.registerTitle}</h1>
          <p className="text-xs text-muted">{t.auth.registerSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="clip-notch border border-surface-border bg-surface p-6">
          <Field
            label={t.auth.username}
            value={username}
            onChange={setUsername}
            autoComplete="username"
            required
            error={fields.username}
            hint={t.auth.usernameHint}
          />
          <Field
            label={t.auth.email}
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
            error={fields.email}
          />
          <Field
            label={t.auth.password}
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            required
            error={fields.password}
            hint={t.auth.passwordHint}
          />

          <FormError message={error} />

          <Button type="submit" variant="primary" className="mt-5 w-full" disabled={busy}>
            {busy ? t.common.loading : t.auth.createAccount}
          </Button>

          <p className="mt-5 text-center text-xs text-muted">
            {t.auth.hasAccount}{" "}
            <Link href="/login" className="text-neon-cyan hover:underline">
              {t.auth.login}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
