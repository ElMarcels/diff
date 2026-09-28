import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db/client";
import { dbUnavailable, isResponse, jsonError, readJson, requireOwner, withErrorHandling } from "@/lib/auth/guards";
import { fieldErrors, gameUpdateSchema } from "@/lib/auth/validation";
import { updateGame } from "@/lib/games/service";

export const dynamic = "force-dynamic";

/** PATCH /api/games/[id] — platform owner only: edit or enable/disable a mod. */
export const PATCH = withErrorHandling(async (req: Request, { params }: { params: { id: string } }) => {
  const guard = await requireOwner();
  if (isResponse(guard)) return guard;
  if (!isDbConfigured()) return dbUnavailable();

  const body = await readJson(req);
  if (!body) return jsonError(400, "Invalid JSON body.");

  const parsed = gameUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "Check the highlighted fields.", { fields: fieldErrors(parsed.error) });
  }

  const result = await updateGame(guard, params.id, parsed.data);
  if (!result.ok) return jsonError(result.status, result.error);
  return NextResponse.json({ ok: true, game: result.data });
});
