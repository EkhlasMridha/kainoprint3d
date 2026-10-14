import { NextResponse, type NextRequest } from "next/server";

/**
 * Defence in depth only: bounce obviously unauthenticated requests away from /admin early.
 * The real authorisation check is `requireAdmin()` on the server in every admin page, server
 * action and admin API route — it verifies the session against the database.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !req.cookies.has("kp_admin_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/api/admin") && !req.cookies.has("kp_admin_session")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
