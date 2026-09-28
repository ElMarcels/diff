import { NextResponse } from "next/server";
import { createSession, ensureBootstrapRole } from "@/lib/auth/session";
import { registerAccount } from "@/lib/auth/service";
import { jsonError, readJson } from "@/lib/auth/guards";
import { fieldErrors, registerSchema } from "@/lib/auth/validation";

/**
 * POST /api/auth/register
 *
 * Creates a native DIFF account (no external identity provider) and signs the
 * user straight in. The OWNER_EMAIL address is promoted to platform owner.
 */
export async function POST(req: Request) {
  const body = await readJson(req);
  if (!body) return jsonError(400, "Invalid JSON body.");

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "Check the highlighted fields.", { fields: fieldErrors(parsed.error) });
  }

  const result = await registerAccount(parsed.data);
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
}
