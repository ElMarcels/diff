import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap first gate for the private areas. It only checks that the session
 * cookie is present; every page and API route re-validates the session
 * against the database, so this is UX, not the security boundary.
 */
const SESSION_COOKIE = "diff_session";
const PROTECTED = ["/settings", "/creator", "/moderation", "/owner"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return NextResponse.next();
  }
  if (req.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/settings/:path*", "/creator/:path*", "/moderation/:path*", "/owner/:path*"],
};
