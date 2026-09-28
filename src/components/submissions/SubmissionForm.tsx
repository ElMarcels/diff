"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Save } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { Button } from "@/components/Button";
import { Field, FormError, Select } from "@/components/forms/Form";
import { useToast } from "@/components/Toast";
import { apiFetch } from "@/lib/api-client";
import type { SubmissionSummary } from "@/lib/submissions/service";

const CATEGORIES = ["Arcade", "Puzzle", "Strategy", "Action", "Shooter", "Racing", "Other"];
const LICENSES = ["MIT", "Apache-2.0", "GPL-3.0", "BSD-3-Clause", "CC0", "Proprietary"];

/** /creator/new — send a game to the moderation queue, like Modrinth's upload. */
export function SubmissionForm() {
  const { t } = useLocale();
  const { push } = useToast();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("Arcade");
  const [playUrl, setPlayUrl] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [license, setLicense] = useState("MIT");
  const [version, setVersion] = useState("1.0.0");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "draft" | "submit">(null);

  async function save(submit: boolean) {
    setBusy(submit ? "submit" : "draft");
    setError(null);
    setFields({});
    const res = await apiFetch<{ submission: SubmissionSummary }>("/api/submissions", {
      method: "POST",
      body: JSON.stringify({
        title,
        summary,
        body: body || undefined,
        category,
        playUrl,
        repositoryUrl: repositoryUrl || "",
        license,
        version,
        submit,
      }),
    });
    setBusy(null);
    if (!res.ok) {
      setError(res.error ?? t.common.error);
      setFields(res.fields ?? {});
      return;
    }
    push(submit ? t.creator.submitted : t.creator.draftSaved, "success");
    router.push(`/creator/${res.data?.submission.id ?? ""}`);
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">{t.creator.newSubmission}</h1>
      <p className="mt-2 max-w-2xl text-sm text-white/60">{t.creator.newSubmissionHelp}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save(true);
        }}
        className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
      >
        <div className="clip-notch space-y-4 border border-surface-border bg-surface p-6">
          <Field label={t.creator.titleLabel} value={title} onChange={setTitle} required error={fields.title} />
          <Field
            label={t.creator.summaryLabel}
            value={summary}
            onChange={setSummary}
            required
            error={fields.summary}
            hint={t.creator.summaryHint}
          />
          <Field
            label={t.creator.descriptionLabel}
            type="textarea"
            value={body}
            onChange={setBody}
            placeholder={t.creator.descriptionPlaceholder}
            error={fields.body}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={t.creator.category}
              value={category}
              onChange={setCategory}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              error={fields.category}
            />
            <Select
              label={t.creator.license}
              value={license}
              onChange={setLicense}
              options={LICENSES.map((l) => ({ value: l, label: l }))}
              error={fields.license}
            />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="clip-notch space-y-4 border border-surface-border bg-surface p-6">
            <Field
              label={t.creator.playUrl}
              value={playUrl}
              onChange={setPlayUrl}
              type="url"
              placeholder="https://…"
              required
              error={fields.playUrl}
              hint={t.creator.playUrlHint}
            />
            <Field
              label={t.creator.repository}
              value={repositoryUrl}
              onChange={setRepositoryUrl}
              type="url"
              placeholder="https://github.com/…"
              error={fields.repositoryUrl}
            />
            <Field label={t.creator.version} value={version} onChange={setVersion} error={fields.version} hint="1.0.0" />
          </div>

          <FormError message={error} />

          <div className="flex flex-col gap-2">
            <Button type="submit" variant="primary" disabled={busy !== null}>
              <Send size={15} /> {busy === "submit" ? t.common.loading : t.creator.sendForReview}
            </Button>
            <Button type="button" variant="ghost" onClick={() => save(false)} disabled={busy !== null}>
              <Save size={15} /> {busy === "draft" ? t.common.loading : t.creator.saveDraft}
            </Button>
          </div>
        </aside>
      </form>
    </div>
  );
}
