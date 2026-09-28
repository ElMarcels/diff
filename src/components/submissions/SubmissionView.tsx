"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  History,
  MessageSquare,
  Package,
  Play,
  Rocket,
  Send,
  XCircle,
} from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useToast } from "@/components/Toast";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/Button";
import { Field, FormError, Select } from "@/components/forms/Form";
import { StatusBadge } from "./StatusBadge";
import { apiFetch } from "@/lib/api-client";
import { isModerator as checkModerator, isOwner as checkOwner } from "@/lib/auth/roles";
import type { SessionUser } from "@/lib/auth/session";
import type { SubmissionStatus } from "@/lib/auth/validation";
import type { SubmissionDetail } from "@/lib/submissions/service";

/**
 * The review screen, shared by the author's own view (/creator/[id]) and the
 * moderation queue (/moderation/[id]). It renders the same thread, plus the
 * moderation controls when the viewer is staff.
 */
export function SubmissionView({ id, viewer }: { id: string; viewer: SessionUser }) {
  const { t } = useLocale();
  const { push } = useToast();
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isModerator = checkModerator(viewer.role);
  const isOwner = checkOwner(viewer.role);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<{ submission: SubmissionDetail }>(`/api/submissions/${id}`);
    setLoading(false);
    if (!res.ok || !res.data) {
      setLoadError(res.error ?? t.common.loadError);
      return;
    }
    setLoadError(null);
    setSubmission(res.data.submission);
  }, [id, t.common.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="py-16 text-center text-sm text-muted">{t.common.loading}</p>;
  if (loadError || !submission) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-neon-magenta">{loadError}</p>
        <Button href={isModerator ? "/moderation" : "/creator"} variant="ghost" className="mt-4">
          {t.common.back}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-6">
        <header className="clip-notch border border-surface-border bg-surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-white">{submission.title}</h1>
              <p className="mt-1 text-sm text-white/70">{submission.summary}</p>
            </div>
            <StatusBadge status={submission.status} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <UserAvatar alt={submission.authorUsername} size={20} />
              {submission.authorUsername}
            </span>
            <span className="font-display text-neon-purple">v{submission.version}</span>
            <span>{submission.category}</span>
            <span>{submission.license}</span>
            {submission.reviewerUsername && (
              <span>
                {t.moderation.reviewedBy}: <span className="text-white/80">{submission.reviewerUsername}</span>
              </span>
            )}
          </div>

          {submission.body && (
            <p className="mt-4 whitespace-pre-line border-t border-surface-border pt-4 text-sm leading-relaxed text-white/70">
              {submission.body}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href={submission.playUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="clip-notch-sm inline-flex items-center gap-2 bg-neon-magenta px-4 py-2 text-sm font-semibold text-black transition-shadow hover:shadow-glow-magenta focus-ring"
            >
              <Play size={15} /> {t.moderation.playBuild}
            </a>
            {submission.repositoryUrl && (
              <a
                href={submission.repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="clip-notch-sm inline-flex items-center gap-2 border border-neon-cyan px-4 py-2 text-sm text-neon-cyan transition-shadow hover:shadow-glow-cyan focus-ring"
              >
                <ExternalLink size={15} /> {t.creator.repository}
              </a>
            )}
          </div>
        </header>

        <CommentThread submission={submission} viewer={viewer} onChanged={load} />
      </div>

      <aside className="space-y-4">
        {submission.permissions.canReview && (
          <ModerationPanel submission={submission} onChanged={load} />
        )}
        {isOwner && submission.status === "approved" && (
          <PublishPanel submission={submission} onChanged={load} />
        )}
        {submission.permissions.canEdit && <EditPanel submission={submission} onChanged={load} />}
        <HistoryPanel submission={submission} />
      </aside>
    </div>
  );
}

function CommentThread({
  submission,
  viewer,
  onChanged,
}: {
  submission: SubmissionDetail;
  viewer: SessionUser;
  onChanged: () => Promise<void>;
}) {
  const { t } = useLocale();
  const { push } = useToast();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const res = await apiFetch(`/api/submissions/${submission.id}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? t.common.error);
      return;
    }
    setBody("");
    push(t.creator.commentSent, "success");
    await onChanged();
  }

  return (
    <section className="clip-notch border border-surface-border bg-surface p-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neon-cyan">
        <MessageSquare size={15} /> {t.creator.reviewThread} ({submission.comments.length})
      </h2>

      {submission.comments.length === 0 ? (
        <p className="text-sm text-muted">{t.creator.noComments}</p>
      ) : (
        <ul className="space-y-3">
          {submission.comments.map((comment) => {
            const staff = comment.authorRole === "moderator" || comment.authorRole === "owner";
            return (
              <li
                key={comment.id}
                className={`border p-4 ${
                  staff ? "border-neon-purple/40 bg-neon-purple/5" : "border-surface-border bg-surface-raised"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <UserAvatar alt={comment.authorUsername} size={22} />
                  <span className="font-semibold text-white/90">{comment.authorUsername}</span>
                  {staff && (
                    <span className="border border-neon-purple px-1.5 py-0.5 text-[10px] uppercase text-neon-purple">
                      {t.moderation.staff}
                    </span>
                  )}
                  <span className="ml-auto text-muted">{new Date(comment.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-white/80">{comment.body}</p>
              </li>
            );
          })}
        </ul>
      )}

      {submission.permissions.canComment && (
        <form onSubmit={submit} className="mt-5">
          <Field
            label={checkModerator(viewer.role) ? t.moderation.writeReview : t.creator.replyPlaceholder}
            type="textarea"
            value={body}
            onChange={setBody}
            placeholder={checkModerator(viewer.role) ? t.moderation.reviewPlaceholder : t.creator.replyPlaceholder}
            required
          />
          <FormError message={error} />
          <Button type="submit" variant="primary" className="mt-3" disabled={busy || !body.trim()}>
            <Send size={15} /> {busy ? t.common.loading : t.creator.send}
          </Button>
        </form>
      )}
    </section>
  );
}

function ModerationPanel({
  submission,
  onChanged,
}: {
  submission: SubmissionDetail;
  onChanged: () => Promise<void>;
}) {
  const { t } = useLocale();
  const { push } = useToast();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function move(status: SubmissionStatus) {
    setBusy(status);
    const res = await apiFetch(`/api/submissions/${submission.id}/status`, {
      method: "POST",
      body: JSON.stringify({ status, note: note || undefined }),
    });
    setBusy(null);
    if (!res.ok) {
      push(res.error ?? t.common.error, "error");
      return;
    }
    setNote("");
    push(t.moderation.statusUpdated, "success");
    await onChanged();
  }

  const transitions = submission.permissions.allowedTransitions.filter((s) => s !== "published");

  return (
    <section className="clip-notch border border-surface-border bg-surface p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neon-purple">{t.moderation.review}</h2>
      <p className="text-xs text-muted">{t.moderation.reviewHelp}</p>

      <Field
        label={t.moderation.decisionNote}
        type="textarea"
        value={note}
        onChange={setNote}
        placeholder={t.moderation.decisionNotePlaceholder}
        className="mt-3"
      />

      <div className="mt-4 flex flex-col gap-2">
        {transitions.length === 0 && <p className="text-xs text-muted">{t.moderation.noTransitions}</p>}
        {transitions.map((status) => (
          <button
            key={status}
            onClick={() => move(status)}
            disabled={busy !== null}
            className={`clip-notch-sm flex items-center gap-2 border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide transition-colors disabled:opacity-50 ${actionStyles(status)}`}
          >
            {statusIcon(status)}
            {busy === status ? t.common.loading : t.status[status]}
          </button>
        ))}
      </div>
    </section>
  );
}

function PublishPanel({ submission, onChanged }: { submission: SubmissionDetail; onChanged: () => Promise<void> }) {
  const { t } = useLocale();
  const { push } = useToast();
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [players, setPlayers] = useState("1 Player");
  const [busy, setBusy] = useState(false);

  async function publish() {
    setBusy(true);
    const res = await apiFetch(`/api/submissions/${submission.id}/publish`, {
      method: "POST",
      body: JSON.stringify({ difficulty, players, enabled: true }),
    });
    setBusy(false);
    if (!res.ok) {
      push(res.error ?? t.common.error, "error");
      return;
    }
    push(t.owner.published, "success");
    await onChanged();
  }

  return (
    <section className="clip-notch border border-neon-cyan/50 bg-surface p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neon-cyan">
        <Rocket size={15} /> {t.owner.publish}
      </h2>
      <p className="text-xs text-muted">{t.owner.publishHelp}</p>
      <Select
        label={t.games.difficulty}
        value={difficulty}
        onChange={(v) => setDifficulty(v as "Easy" | "Medium" | "Hard")}
        options={[
          { value: "Easy", label: t.connect4.easy },
          { value: "Medium", label: t.connect4.normal },
          { value: "Hard", label: t.connect4.hard },
        ]}
        className="mt-3"
      />
      <Select
        label={t.games.players}
        value={players}
        onChange={setPlayers}
        options={[
          { value: "1 Player", label: "1 Player" },
          { value: "1v1 vs CPU", label: "1v1 vs CPU" },
          { value: "2 Players", label: "2 Players" },
        ]}
        className="mt-3"
      />
      <Button variant="primary" className="mt-4 w-full" onClick={publish} disabled={busy}>
        <Package size={15} /> {busy ? t.common.loading : t.owner.publish}
      </Button>
    </section>
  );
}

function EditPanel({ submission, onChanged }: { submission: SubmissionDetail; onChanged: () => Promise<void> }) {
  const { t } = useLocale();
  const { push } = useToast();
  const editable = ["draft", "changes_requested", "rejected"].includes(submission.status);

  const [playUrl, setPlayUrl] = useState(submission.playUrl);
  const [version, setVersion] = useState(submission.version);
  const [changelog, setChangelog] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(submit: boolean) {
    setBusy(true);
    const res = await apiFetch(`/api/submissions/${submission.id}`, {
      method: "PATCH",
      body: JSON.stringify({ playUrl, version, changelog: changelog || undefined, submit }),
    });
    setBusy(false);
    if (!res.ok) {
      push(res.error ?? t.common.error, "error");
      return;
    }
    setChangelog("");
    push(submit ? t.creator.resubmitted : t.creator.saved, "success");
    await onChanged();
  }

  return (
    <section className="clip-notch border border-surface-border bg-surface p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/80">{t.creator.updateBuild}</h2>
      {!editable && <p className="text-xs text-muted">{t.creator.lockedWhileReview}</p>}
      <Field label={t.creator.playUrl} value={playUrl} onChange={setPlayUrl} type="url" className="mt-3" disabled={!editable} />
      <Field label={t.creator.version} value={version} onChange={setVersion} className="mt-3" />
      <Field
        label={t.creator.changelog}
        type="textarea"
        value={changelog}
        onChange={setChangelog}
        placeholder={t.creator.changelogPlaceholder}
        className="mt-3"
      />
      <div className="mt-4 flex flex-col gap-2">
        <Button variant="secondary" onClick={() => save(false)} disabled={busy || !editable} className="w-full">
          {busy ? t.common.loading : t.creator.saveDraft}
        </Button>
        <Button variant="primary" onClick={() => save(true)} disabled={busy} className="w-full">
          <ArrowUpRight size={15} /> {submission.status === "pending" || submission.status === "in_review" ? t.creator.resubmit : t.creator.sendForReview}
        </Button>
      </div>
    </section>
  );
}

function HistoryPanel({ submission }: { submission: SubmissionDetail }) {
  const { t } = useLocale();
  return (
    <section className="clip-notch border border-surface-border bg-surface p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-white/80">
        <History size={15} /> {t.creator.history}
      </h2>

      {submission.versions.length > 0 && (
        <ul className="mb-4 space-y-2">
          {submission.versions.map((v) => (
            <li key={v.id} className="border border-surface-border bg-surface-raised p-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="font-display text-neon-purple">v{v.version}</span>
                <span className="text-muted">{new Date(v.createdAt).toLocaleDateString()}</span>
              </div>
              {v.changelog && <p className="mt-1 text-white/70">{v.changelog}</p>}
              <a
                href={v.playUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-neon-cyan hover:underline"
              >
                {t.moderation.play} <ArrowUpRight size={11} />
              </a>
            </li>
          ))}
        </ul>
      )}

      {submission.events.length > 0 ? (
        <ul className="space-y-2">
          {submission.events.map((event) => (
            <li key={event.id} className="border-l-2 border-surface-border pl-3 text-[11px]">
              <p className="text-white/80">
                {t.creator.eventLabel[event.action as keyof typeof t.creator.eventLabel] ?? event.action}
                {event.fromStatus && event.toStatus && (
                  <span className="text-muted">
                    {" "}
                    {t.status[event.fromStatus as SubmissionStatus] ?? event.fromStatus} →{" "}
                    {t.status[event.toStatus as SubmissionStatus] ?? event.toStatus}
                  </span>
                )}
              </p>
              {event.note && <p className="mt-0.5 text-white/60">{event.note}</p>}
              <p className="mt-0.5 text-muted">
                {event.actorUsername} · {new Date(event.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">{t.creator.noEvents}</p>
      )}
    </section>
  );
}

function actionStyles(status: SubmissionStatus): string {
  switch (status) {
    case "approved":
      return "border-emerald-400 text-emerald-400 hover:bg-emerald-400/10";
    case "rejected":
      return "border-red-500 text-red-500 hover:bg-red-500/10";
    case "changes_requested":
      return "border-neon-magenta text-neon-magenta hover:bg-neon-magenta/10";
    case "in_review":
      return "border-neon-purple text-neon-purple hover:bg-neon-purple/10";
    default:
      return "border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10";
  }
}

function statusIcon(status: SubmissionStatus) {
  if (status === "approved") return <CheckCircle2 size={14} />;
  if (status === "rejected") return <XCircle size={14} />;
  return <ArrowUpRight size={14} />;
}
