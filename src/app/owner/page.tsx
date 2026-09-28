import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { isOwner } from "@/lib/auth/roles";
import { OwnerPanel } from "@/components/owner/OwnerPanel";

export const metadata: Metadata = { title: "Platform owner — DIFF" };
export const dynamic = "force-dynamic";

/**
 * Exclusive to the platform owner account (OWNER_EMAIL, role `owner`).
 * Everyone else is bounced before the panel ever renders.
 */
export default async function OwnerPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/owner");
  if (!isOwner(user.role)) redirect("/");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <OwnerPanel />
    </div>
  );
}
