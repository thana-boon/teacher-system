import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, verifyToken, type Role } from "@/lib/jwt";

// Next.js 16: Middleware is now "Proxy". Same API, file named proxy.ts.
// This performs OPTIMISTIC route guards only — every API/page still verifies
// the session server-side before doing anything sensitive.

const HOME: Record<Role, string> = {
  admin: "/admin/dashboard",
  teacher: "/teacher/dashboard",
  kiosk: "/kiosk",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifyToken(request.cookies.get(COOKIE_NAME)?.value);

  // Already-authenticated users skip the login page.
  if (pathname === "/login") {
    if (session) {
      return NextResponse.redirect(new URL(HOME[session.role] ?? "/", request.url));
    }
    return NextResponse.next();
  }

  const required: Role | null =
    pathname.startsWith("/admin") || pathname.startsWith("/print")
      ? "admin"
      : pathname.startsWith("/teacher")
        ? "teacher"
        : null;

  if (required) {
    if (!session) {
      const url = new URL("/login", request.url);
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
    if (session.role !== required) {
      return NextResponse.redirect(new URL(HOME[session.role] ?? "/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/print/:path*", "/login"],
};
