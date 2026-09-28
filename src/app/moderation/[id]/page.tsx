import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { isModerator } from "@/lib/auth/roles";
import { SubmissionView } from "@/components/submissions/SubmissionView";

export const metadata: Metadata = { title: "Review — DIFF" };
export const dynamic = "force-dynamic";

export default async function ModerationReviewPage({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/moderation/${params.id}`);
  if (!isModerator(user.role)) redirect("/");
  if (!params.id) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <SubmissionView id={params.id} viewer={user} />
    </div>
  );
}
