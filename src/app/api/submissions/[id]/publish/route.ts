import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db/client";
import { dbUnavailable, isResponse, jsonError, readJson, requireOwner } from "@/lib/auth/guards";
import { fieldErrors, publishSchema } from "@/lib/auth/validation";
import { publishSubmission } from "@/lib/submissions/service";

export const dynamic = "force-dynamic";

/**
 * POST /api/submissions/[id]/publish
 * Platform owner only: turns an approved submission into a live game, so it
 * shows up in the public catalogue.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireOwner();
  if (isResponse(guard)) return guard;
  if (!isDbConfigured()) return dbUnavailable();

  const raw = (await readJson(req)) ?? {};
  const parsed = publishSchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(422, "Check the highlighted fields.", { fields: fieldErrors(parsed.error) });
  }

  const result = await publishSubmission(guard, params.id, parsed.data);
  if (!result.ok) return jsonError(result.status, result.error);
  return NextResponse.json({ ok: true, game: result.data });
}
