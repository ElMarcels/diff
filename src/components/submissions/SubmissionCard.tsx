"use client";

import Link from "next/link";
import { Clock, MessageSquare, Play } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { StatusBadge } from "./StatusBadge";
import { UserAvatar } from "@/components/UserAvatar";
import type { SubmissionSummary } from "@/lib/submissions/service";

export function SubmissionCard({
  submission,
  href,
  showAuthor = true,
}: {
  submission: SubmissionSummary;
  href: string;
  showAuthor?: boolean;
}) {
  const { t } = useLocale();
  return (
    <Link
      href={href}
      className="clip-notch group block border border-surface-border bg-surface p-5 transition-all hover:border-neon-purple hover:shadow-glow-purple animate-rise-in"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-white">{submission.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-white/60">{submission.summary}</p>
        </div>
        <StatusBadge status={submission.status} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted">
        {showAuthor && (
          <span className="flex items-center gap-1.5">
            <UserAvatar alt={submission.authorUsername} size={18} />
            {submission.authorUsername}
          </span>
        )}
        <span className="font-display text-neon-purple">v{submission.version}</span>
        <span>{submission.category}</span>
        <span className="flex items-center gap-1">
          <MessageSquare size={12} /> {submission.commentCount}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {new Date(submission.updatedAt).toLocaleDateString()}
        </span>
        <span className="flex items-center gap-1 text-neon-cyan">
          <Play size={12} /> {t.moderation.play}
        </span>
      </div>
    </Link>
  );
}
