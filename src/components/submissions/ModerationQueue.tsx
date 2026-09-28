"use client";

import { useCallback, useEffect, useState } from "react";
import { Inbox } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { SubmissionCard } from "@/components/submissions/SubmissionCard";
import { Select } from "@/components/forms/Form";
import { apiFetch } from "@/lib/api-client";
import { SUBMISSION_STATUSES, type SubmissionStatus } from "@/lib/auth/validation";
import type { SubmissionSummary } from "@/lib/submissions/service";

const COUNTS: Record<string, SubmissionSummary["status"][]> = {
  all: ["draft", "pending", "in_review", "changes_requested", "approved", "rejected", "published"],
  pending: ["pending"],
  in_review: ["in_review"],
  changes_requested: ["changes_requested"],
  approved: ["approved"],
  published: ["published"],
  rejected: ["rejected"],
};

/** /moderation — the queue of user submissions waiting to be played and reviewed. */
export function ModerationQueue() {
  const { t } = useLocale();
  const [rows, setRows] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<{ submissions: SubmissionSummary[] }>("/api/submissions?scope=queue");
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

  const visible = rows.filter((row) => COUNTS[filter]?.includes(row.status));
  const waiting = rows.filter((row) => row.status === "pending" || row.status === "in_review").length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">{t.moderation.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/60">{t.moderation.subtitle}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl text-neon-cyan">{waiting}</p>
          <p className="text-[11px] uppercase tracking-wide text-muted">{t.moderation.waiting}</p>
        </div>
      </div>

      <div className="mt-6 max-w-xs">
        <Select
          label={t.moderation.filter}
          value={filter}
          onChange={setFilter}
          options={Object.keys(COUNTS).map((key) => ({
            value: key,
            label: key === "all" ? t.moderation.filterAll : t.status[key as SubmissionStatus],
          }))}
        />
      </div>

      {error && <p className="mt-6 text-sm text-neon-magenta">{error}</p>}

      {loading ? (
        <p className="py-12 text-center text-sm text-muted">{t.common.loading}</p>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Inbox size={28} className="text-muted" />
          <p className="text-sm text-muted">{t.moderation.empty}</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {visible.map((row) => (
            <SubmissionCard key={row.id} submission={row} href={`/moderation/${row.id}`} />
          ))}
        </div>
      )}

      <p className="mt-8 text-xs text-muted">
        {t.moderation.statusesHint}{" "}
        {SUBMISSION_STATUSES.join(" · ")}
      </p>
    </div>
  );
}
