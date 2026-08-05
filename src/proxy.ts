// =============================================================================
// Middleware — Hamdard AI Platform
// Handles authentication & role-based access control for every route
// =============================================================================

import { authConfig } from "@/lib/auth.config";
import NextAuth from "next-auth";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

// Routes that don't require authentication
const publicRoutes = ["/login", "/api/auth"];

// Routes that require administrative authorization
const adminRoutes = ["/admin"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public routes
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check authentication
  const isAuthenticated = !!req.auth?.user;
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check admin authorization via roles or granular permission
  const isAdminRoute = adminRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  if (isAdminRoute) {
    const role = req.auth?.user?.role;
    const roles = req.auth?.user?.roles || [role];
    const permissions = req.auth?.user?.permissions || [];

    const isAuthorized =
      roles.includes("ADMIN") ||
      roles.includes("SUPER_ADMIN") ||
      roles.includes("DEPT_MANAGER") ||
      permissions.includes("admin.dashboard.view") ||
      permissions.includes("*");

    if (!isAuthorized) {
      const chatUrl = new URL("/chat", req.nextUrl.origin);
      chatUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(chatUrl);
    }
  }

  return NextResponse.next();
});

// Match all routes except static files and Next.js internals
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets/).*)",
  ],
};

