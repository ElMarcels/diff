"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Button } from "@/components/Button";
import { SubmissionCard } from "@/components/submissions/SubmissionCard";
import { apiFetch } from "@/lib/api-client";
import type { SubmissionSummary } from "@/lib/submissions/service";

/** /creator — everything the signed-in user has sent to the moderation team. */
export function CreatorDashboard() {
  const { t } = useLocale();
  const [rows, setRows] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<{ submissions: SubmissionSummary[] }>("/api/submissions?scope=mine");
    setLoading(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? t.common.loadError);
      return;
    }
    setError(null);
    setRows(res.data.submissions);
  }, [t.common.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">{t.creator.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/60">{t.creator.subtitle}</p>
        </div>
        <Button href="/creator/new" variant="primary">
          <Plus size={16} /> {t.creator.newSubmission}
        </Button>
      </div>

      <div className="clip-notch mt-6 border border-surface-border bg-surface p-4 text-xs leading-relaxed text-white/70">
        <p className="flex items-center gap-2 font-semibold text-neon-cyan">
          <Upload size={14} /> {t.creator.howItWorks}
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-white/60">
          <li>{t.creator.step1}</li>
          <li>{t.creator.step2}</li>
          <li>{t.creator.step3}</li>
          <li>{t.creator.step4}</li>
        </ol>
      </div>

      {error && <p className="mt-6 text-sm text-neon-magenta">{error}</p>}

      {loading ? (
        <p className="py-12 text-center text-sm text-muted">{t.common.loading}</p>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted">{t.creator.empty}</p>
          <Button href="/creator/new" variant="secondary" className="mt-4">
            {t.creator.newSubmission}
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {rows.map((row) => (
            <SubmissionCard key={row.id} submission={row} href={`/creator/${row.id}`} />
          ))}
        </div>
      )}

      <p className="mt-8 text-xs text-muted">
        {t.creator.footer}{" "}
        <Link href="/games" className="text-neon-cyan hover:underline">
          {t.games.title}
        </Link>
      </p>
    </div>
  );
}
