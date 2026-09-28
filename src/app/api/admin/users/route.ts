import { NextResponse } from "next/server";
import { isDbConfigured } from "@/lib/db/client";
import { dbUnavailable, isResponse, jsonError, readJson, requireOwner } from "@/lib/auth/guards";
import { fieldErrors, roleUpdateSchema } from "@/lib/auth/validation";
import { listUsers, setUserRole } from "@/lib/users/service";

export const dynamic = "force-dynamic";

/**
 * GET   /api/admin/users?q=… → accounts (platform owner)
 * PATCH /api/admin/users      → change a user's role: { id, role }
 */
export async function GET(req: Request) {
  const guard = await requireOwner();
  if (isResponse(guard)) return guard;
  if (!isDbConfigured()) return dbUnavailable();

  const q = new URL(req.url).searchParams.get("q") ?? undefined;
  const users = await listUsers(guard, q);
  return NextResponse.json({ users });
}

export async function PATCH(req: Request) {
  const guard = await requireOwner();
  if (isResponse(guard)) return guard;
  if (!isDbConfigured()) return dbUnavailable();

  const body = await readJson(req);
  if (!body) return jsonError(400, "Invalid JSON body.");

  const parsed = roleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "Check the highlighted fields.", { fields: fieldErrors(parsed.error) });
  }

  const result = await setUserRole(guard, parsed.data.id, parsed.data.role);
  if (!result.ok) return jsonError(result.status, result.error);
  return NextResponse.json({ ok: true, user: result.data });
}
