import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";

/** POST /api/auth/logout — deletes the session row and clears the cookie. */
export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
