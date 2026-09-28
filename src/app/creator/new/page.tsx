import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { SubmissionForm } from "@/components/submissions/SubmissionForm";

export const metadata: Metadata = { title: "Submit a game — DIFF" };
export const dynamic = "force-dynamic";

export default async function NewSubmissionPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/creator/new");

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <SubmissionForm />
    </div>
  );
}
