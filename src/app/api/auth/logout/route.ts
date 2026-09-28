import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";
import { withErrorHandling } from "@/lib/auth/guards";

/** POST /api/auth/logout — deletes the session row and clears the cookie. */
export const POST = withErrorHandling(async () => {
  await destroySession();
  return NextResponse.json({ ok: true });
});
