"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Package, Plus, Rocket, ShieldCheck, Users } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Button } from "@/components/Button";
import { Field, FormError, Select } from "@/components/forms/Form";
import { StatusBadge } from "@/components/submissions/StatusBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { useToast } from "@/components/Toast";
import { apiFetch } from "@/lib/api-client";
import type { AdminGameRow } from "@/lib/games/service";
import type { AdminUserRow } from "@/lib/users/service";
import type { SubmissionSummary } from "@/lib/submissions/service";
import type { UserRole } from "@/lib/auth/roles";

type Tab = "games" | "publish" | "users";

/**
 * /owner — exclusive platform owner panel: add new mods to the platform,
 * publish approved submissions and manage who is a platform moderator.
 */
export function OwnerPanel() {
  const { t } = useLocale();
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>("games");
  const [games, setGames] = useState<AdminGameRow[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [approved, setApproved] = useState<SubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [gamesRes, usersRes, subsRes] = await Promise.all([
      apiFetch<{ games: AdminGameRow[] }>("/api/admin/games"),
      apiFetch<{ users: AdminUserRow[] }>("/api/admin/users"),
      apiFetch<{ submissions: SubmissionSummary[] }>("/api/submissions?scope=queue"),
    ]);
    setLoading(false);
    if (!gamesRes.ok) setError(gamesRes.error ?? t.common.loadError);
    if (gamesRes.data) setGames(gamesRes.data.games);
    if (usersRes.data) setUsers(usersRes.data.users);
    if (subsRes.data) setApproved(subsRes.data.submissions.filter((s) => s.status === "approved"));
  }, [t.common.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleGame(game: AdminGameRow) {
    const res = await apiFetch(`/api/games/${game.id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: !game.enabled }),
    });
    if (!res.ok) {
      push(res.error ?? t.common.error, "error");
      return;
    }
    push(t.owner.updated, "success");
    await load();
  }

  async function changeRole(user: AdminUserRow, role: UserRole) {
    const res = await apiFetch("/api/admin/users", {
      method: "PATCH",
      body: JSON.stringify({ id: user.id, role }),
    });
    if (!res.ok) {
      push(res.error ?? t.common.error, "error");
      return;
    }
    push(t.owner.updated, "success");
    await load();
  }

  async function publish(id: string) {
    const res = await apiFetch(`/api/submissions/${id}/publish`, {
      method: "POST",
      body: JSON.stringify({ enabled: true }),
    });
    if (!res.ok) {
      push(res.error ?? t.common.error, "error");
      return;
    }
    push(t.owner.published, "success");
    await load();
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <ShieldCheck size={24} className="text-neon-purple" />
        <div>
          <h1 className="text-2xl font-semibold text-white">{t.owner.title}</h1>
          <p className="mt-1 text-sm text-white/60">{t.owner.subtitle}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            { key: "games", label: t.owner.tabGames, icon: <Package size={14} /> },
            { key: "publish", label: t.owner.tabPublish, icon: <Rocket size={14} /> },
            { key: "users", label: t.owner.tabUsers, icon: <Users size={14} /> },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`clip-notch-sm flex items-center gap-2 border px-4 py-2 text-sm transition-colors focus-ring ${
              tab === item.key
                ? "border-neon-purple bg-neon-purple/15 text-neon-purple"
                : "border-surface-border text-white/70 hover:border-neon-purple/60"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-neon-magenta">{error}</p>}
      {loading && <p className="py-12 text-center text-sm text-muted">{t.common.loading}</p>}

      {!loading && tab === "games" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="clip-notch overflow-x-auto border border-surface-border bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-surface-border text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">{t.owner.game}</th>
                  <th className="px-4 py-3">{t.owner.source}</th>
                  <th className="px-4 py-3">{t.owner.creator}</th>
                  <th className="px-4 py-3">{t.owner.status}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr key={game.id} className="border-b border-surface-border/60 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{game.name}</p>
                      <p className="text-[11px] text-muted">/{game.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/70">{game.source}</td>
                    <td className="px-4 py-3 text-xs text-white/70">{game.creatorUsername ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] font-semibold uppercase ${game.enabled ? "text-emerald-400" : "text-muted"}`}
                      >
                        {game.enabled ? t.owner.live : t.owner.disabled}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toggleGame(game)}
                        className="text-xs text-neon-cyan hover:underline"
                      >
                        {game.enabled ? t.owner.disable : t.owner.enable}
                      </button>
                    </td>
                  </tr>
                ))}
                {games.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-xs text-muted">
                      {t.owner.noGames}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <AddGameForm onCreated={load} />
        </div>
      )}

      {!loading && tab === "publish" && (
        <div className="mt-6">
          {approved.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">{t.owner.nothingToPublish}</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {approved.map((submission) => (
                <div
                  key={submission.id}
                  className="clip-notch border border-surface-border bg-surface p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-white">{submission.title}</h3>
                      <p className="text-xs text-muted">by {submission.authorUsername}</p>
                    </div>
                    <StatusBadge status={submission.status} />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="primary" onClick={() => publish(submission.id)}>
                      <Rocket size={15} /> {t.owner.publish}
                    </Button>
                    <Button href={`/moderation/${submission.id}`} variant="ghost">
                      {t.owner.review}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && tab === "users" && (
        <div className="clip-notch mt-6 overflow-x-auto border border-surface-border bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-surface-border text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">{t.owner.user}</th>
                <th className="px-4 py-3">{t.auth.email}</th>
                <th className="px-4 py-3">{t.owner.submissions}</th>
                <th className="px-4 py-3">{t.owner.role}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-surface-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <UserAvatar alt={user.username} size={24} />
                      <span>
                        <span className="block font-semibold text-white">{user.username}</span>
                        <span className="block text-[11px] text-muted">
                          {t.profile.level} {user.level}
                        </span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/70">{user.email}</td>
                  <td className="px-4 py-3 text-xs text-white/70">{user.submissions}</td>
                  <td className="px-4 py-3">
                    <Select
                      label=""
                      value={user.role}
                      onChange={(v) => changeRole(user, v as UserRole)}
                      options={[
                        { value: "user", label: t.owner.roleUser },
                        { value: "moderator", label: t.owner.roleModerator },
                        { value: "owner", label: t.owner.roleOwner },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-8 text-xs text-muted">
        {t.owner.footer} <Link href="/moderation" className="text-neon-cyan hover:underline">{t.moderation.title}</Link>
      </p>
    </div>
  );
}

function AddGameForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const { t } = useLocale();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagline, setTagline] = useState("");
  const [category, setCategory] = useState("Arcade");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [players, setPlayers] = useState("1 Player");
  const [playUrl, setPlayUrl] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    setFields({});
    const res = await apiFetch("/api/games", {
      method: "POST",
      body: JSON.stringify({
        slug: slug || name,
        name,
        description,
        tagline: tagline || undefined,
        category,
        difficulty,
        players,
        playUrl: playUrl || "",
        source: "mod",
        enabled: true,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? t.common.error);
      setFields(res.fields ?? {});
      return;
    }
    push(t.owner.gameAdded, "success");
    setSlug("");
    setName("");
    setDescription("");
    setTagline("");
    setPlayUrl("");
    setOpen(false);
    await onCreated();
  }

  return (
    <aside className="clip-notch border border-surface-border bg-surface p-5">
      <Button variant="primary" className="w-full" onClick={() => setOpen((v) => !v)}>
        <Plus size={15} /> {open ? t.common.cancel : t.owner.addGame}
      </Button>

      {open && (
        <div className="mt-4 space-y-3">
          <Field label={t.creator.titleLabel} value={name} onChange={setName} required error={fields.name} />
          <Field
            label={t.owner.slug}
            value={slug}
            onChange={setSlug}
            placeholder={t.owner.slugHint}
            error={fields.slug}
          />
          <Field
            label={t.creator.summaryLabel}
            type="textarea"
            value={description}
            onChange={setDescription}
            required
            error={fields.description}
          />
          <Field label={t.owner.tagline} value={tagline} onChange={setTagline} error={fields.tagline} />
          <Select
            label={t.creator.category}
            value={category}
            onChange={setCategory}
            options={["Arcade", "Puzzle", "Strategy", "Action", "Shooter", "Racing", "Other"].map((c) => ({
              value: c,
              label: c,
            }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t.games.difficulty}
              value={difficulty}
              onChange={(v) => setDifficulty(v as "Easy" | "Medium" | "Hard")}
              options={[
                { value: "Easy", label: t.connect4.easy },
                { value: "Medium", label: t.connect4.normal },
                { value: "Hard", label: t.connect4.hard },
              ]}
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
            />
          </div>
          <Field
            label={t.creator.playUrl}
            value={playUrl}
            onChange={setPlayUrl}
            type="url"
            placeholder="https://…"
            hint={t.owner.playUrlHint}
            error={fields.playUrl}
          />
          <FormError message={error} />
          <Button variant="secondary" className="w-full" onClick={submit} disabled={busy}>
            {busy ? t.common.loading : t.owner.addGame}
          </Button>
        </div>
      )}
    </aside>
  );
}
