import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { isModerator } from "@/lib/auth/roles";
import { ModerationQueue } from "@/components/submissions/ModerationQueue";

export const metadata: Metadata = { title: "Moderation queue — DIFF" };
export const dynamic = "force-dynamic";

export default async function ModerationPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/moderation");
  if (!isModerator(user.role)) redirect("/");

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <ModerationQueue />
    </div>
  );
}
