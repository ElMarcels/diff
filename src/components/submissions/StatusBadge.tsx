"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { SubmissionStatus } from "@/lib/auth/validation";

const styles: Record<SubmissionStatus, string> = {
  draft: "border-surface-border text-white/70",
  pending: "border-neon-cyan text-neon-cyan",
  in_review: "border-neon-purple text-neon-purple",
  changes_requested: "border-neon-magenta text-neon-magenta",
  approved: "border-emerald-400 text-emerald-400",
  rejected: "border-red-500 text-red-500",
  published: "border-neon-cyan bg-neon-cyan/10 text-neon-cyan",
};

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  const { t } = useLocale();
  return (
    <span
      className={`clip-notch-sm inline-flex items-center border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${styles[status]}`}
    >
      {t.status[status]}
    </span>
  );
}
