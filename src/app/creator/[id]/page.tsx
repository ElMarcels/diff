import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { SubmissionView } from "@/components/submissions/SubmissionView";

export const metadata: Metadata = { title: "Submission — DIFF" };
export const dynamic = "force-dynamic";

export default async function CreatorSubmissionPage({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/creator/${params.id}`);
  if (!params.id) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <SubmissionView id={params.id} viewer={user} />
    </div>
  );
}
