import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/service";
import { createSession, ensureBootstrapRole } from "@/lib/auth/session";
import { jsonError, readJson, withErrorHandling } from "@/lib/auth/guards";
import { fieldErrors, loginSchema } from "@/lib/auth/validation";

/** POST /api/auth/login */
export const POST = withErrorHandling(async (req: Request) => {
  const body = await readJson(req);
  if (!body) return jsonError(400, "Invalid JSON body.");

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "Check the highlighted fields.", { fields: fieldErrors(parsed.error) });
  }

  const result = await authenticate(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    return jsonError(result.status, result.error, { fields: result.fields });
  }

  const role = await ensureBootstrapRole(result.userId, result.email);
  await createSession(result.userId);

  return NextResponse.json({
    ok: true,
    user: {
      id: result.userId,
      email: result.email,
      username: result.username,
      displayName: result.displayName,
      role,
    },
  });
});
