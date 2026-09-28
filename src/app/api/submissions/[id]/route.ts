import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db/client";
import { dbUnavailable, isResponse, jsonError, readJson, requireUser, withErrorHandling } from "@/lib/auth/guards";
import { fieldErrors, submissionUpdateSchema } from "@/lib/auth/validation";
import { getSubmission, updateSubmission } from "@/lib/submissions/service";

export const dynamic = "force-dynamic";

/**
 * GET   /api/submissions/[id] → full detail + comment thread (author or staff)
 * PATCH /api/submissions/[id] → edit and/or resubmit for review (author only)
 */
export const GET = withErrorHandling(async (_req: Request, { params }: { params: { id: string } }) => {
  const guard = await requireUser();
  if (isResponse(guard)) return guard;
  if (!isDbConfigured()) return dbUnavailable();

  const result = await getSubmission(params.id, guard);
  if (!result.ok) return jsonError(result.status, result.error);
  return NextResponse.json({ submission: result.data });
});

export const PATCH = withErrorHandling(async (req: Request, { params }: { params: { id: string } }) => {
  const guard = await requireUser();
  if (isResponse(guard)) return guard;
  if (!isDbConfigured()) return dbUnavailable();

  const body = await readJson(req);
  if (!body) return jsonError(400, "Invalid JSON body.");

  const parsed = submissionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "Check the highlighted fields.", { fields: fieldErrors(parsed.error) });
  }

  const result = await updateSubmission(guard, params.id, parsed.data);
  if (!result.ok) return jsonError(result.status, result.error, { fields: result.fields });
  return NextResponse.json({ ok: true, submission: result.data });
});
