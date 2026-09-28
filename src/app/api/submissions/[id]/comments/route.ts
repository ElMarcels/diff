import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db/client";
import { dbUnavailable, isResponse, jsonError, readJson, requireUser } from "@/lib/auth/guards";
import { fieldErrors, commentSchema } from "@/lib/auth/validation";
import { addComment, getSubmission } from "@/lib/submissions/service";
import { isModerator } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

/**
 * POST /api/submissions/[id]/comments
 * The review thread: moderators post reviews, the author answers.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireUser();
  if (isResponse(guard)) return guard;
  if (!isDbConfigured()) return dbUnavailable();

  const body = await readJson(req);
  if (!body) return jsonError(400, "Invalid JSON body.");

  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "Check the highlighted fields.", { fields: fieldErrors(parsed.error) });
  }

  const detail = await getSubmission(params.id, guard);
  if (!detail.ok) return jsonError(detail.status, detail.error);

  const kind = isModerator(guard.role) ? "review" : "author_reply";
  const result = await addComment(guard, params.id, parsed.data.body, kind);
  if (!result.ok) return jsonError(result.status, result.error, { fields: result.fields });
  return NextResponse.json({ ok: true, comment: result.data }, { status: 201 });
}
