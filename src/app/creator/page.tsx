import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { CreatorDashboard } from "@/components/submissions/CreatorDashboard";

export const metadata: Metadata = { title: "My games — DIFF" };
export const dynamic = "force-dynamic";

export default async function CreatorPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/creator");

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <CreatorDashboard />
    </div>
  );
}
