import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db/client";
import { dbUnavailable, isResponse, jsonError, readJson, requireModerator } from "@/lib/auth/guards";
import { fieldErrors, statusChangeSchema } from "@/lib/auth/validation";
import { changeStatus } from "@/lib/submissions/service";

export const dynamic = "force-dynamic";

/**
 * POST /api/submissions/[id]/status
 * Moderation decision: claim it, request changes, approve or reject.
 * Publishing is a separate, owner-only endpoint.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireModerator();
  if (isResponse(guard)) return guard;
  if (!isDbConfigured()) return dbUnavailable();

  const body = await readJson(req);
  if (!body) return jsonError(400, "Invalid JSON body.");

  const parsed = statusChangeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "Check the highlighted fields.", { fields: fieldErrors(parsed.error) });
  }

  const result = await changeStatus(guard, params.id, parsed.data.status, parsed.data.note);
  if (!result.ok) return jsonError(result.status, result.error);
  return NextResponse.json({ ok: true, status: result.data.status });
}
