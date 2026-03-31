import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const role = request.cookies.get("role")?.value;
  const path = request.nextUrl.pathname;

  // Protect Dashboard and Admin routes (must have token)
  const isProtectedPath =
    path.startsWith("/dashboard") || path.startsWith("/admin");
  if (isProtectedPath && !token) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Role-based routing for admin area.
  if (token && path.startsWith("/admin")) {
    if (role === "member") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (role === "editor") {
      if (path === "/admin" || path.startsWith("/admin/members")) {
        return NextResponse.redirect(new URL("/admin/articles", request.url));
      }
    }
  }

  // Admin/editor should not access member dashboard pages.
  if (token && path.startsWith("/dashboard")) {
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    if (role === "editor") {
      return NextResponse.redirect(new URL("/admin/articles", request.url));
    }
  }

  // Protect Auth pages (must NOT have token, redirect logged in users away)
  const isAuthPath =
    path.startsWith("/auth/login") || path.startsWith("/auth/register");
  if (isAuthPath && token) {
    // If they already have a session, push them to correct hub directly
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    if (role === "editor") {
      return NextResponse.redirect(new URL("/admin/articles", request.url));
    }

    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware ONLY to these paths to optimize Edge execution
  matcher: ["/dashboard/:path*", "/admin/:path*", "/auth/:path*"],
};
