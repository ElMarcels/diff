import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db/client";
import { dbUnavailable, isResponse, jsonError, readJson, requireModerator, requireUser } from "@/lib/auth/guards";
import { fieldErrors, submissionCreateSchema } from "@/lib/auth/validation";
import { createSubmission, listSubmissions } from "@/lib/submissions/service";

export const dynamic = "force-dynamic";

/**
 * GET /api/submissions?scope=mine|queue|all
 *   mine   → everything the caller submitted (default)
 *   queue  → moderation queue (moderators only)
 *   all    → every submission (moderators only)
 *
 * POST /api/submissions → new submission (draft or straight into the queue)
 */
export async function GET(req: Request) {
  const guard = await requireUser();
  if (isResponse(guard)) return guard;
  const user = guard;
  if (!isDbConfigured()) return dbUnavailable();

  const scope = new URL(req.url).searchParams.get("scope") ?? "mine";

  if (scope === "queue" || scope === "all") {
    const mod = await requireModerator();
    if (isResponse(mod)) return mod;
    const rows = await listSubmissions(user, scope);
    return NextResponse.json({ submissions: rows });
  }

  const rows = await listSubmissions(user, "mine");
  return NextResponse.json({ submissions: rows });
}

export async function POST(req: Request) {
  const guard = await requireUser();
  if (isResponse(guard)) return guard;
  if (!isDbConfigured()) return dbUnavailable();

  const body = await readJson(req);
  if (!body) return jsonError(400, "Invalid JSON body.");

  const parsed = submissionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "Check the highlighted fields.", { fields: fieldErrors(parsed.error) });
  }

  const result = await createSubmission(guard, parsed.data);
  if (!result.ok) return jsonError(result.status, result.error, { fields: result.fields });
  return NextResponse.json({ ok: true, submission: result.data }, { status: 201 });
}
