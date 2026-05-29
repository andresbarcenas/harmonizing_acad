import { withAuth } from "next-auth/middleware";

import { IMPERSONATION_COOKIE_NAME } from "@/lib/impersonation-cookie";
import { canAccessPath } from "@/lib/rbac";

function isTeacherPath(pathname: string) {
  return pathname === "/teacher" || pathname.startsWith("/teacher/");
}

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const pathname = req.nextUrl.pathname;

    if (typeof role !== "string") {
      return Response.redirect(new URL("/sign-in", req.url));
    }

    const hasImpersonationCookie = Boolean(req.cookies.get(IMPERSONATION_COOKIE_NAME)?.value);
    const allowAdminTeacherImpersonation = role === "ADMIN" && hasImpersonationCookie && isTeacherPath(pathname);

    if (!allowAdminTeacherImpersonation && !canAccessPath(role as never, pathname)) {
      return Response.redirect(new URL("/", req.url));
    }

    return null;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        const protectedPrefix =
          path.startsWith("/student") ||
          path.startsWith("/dashboard") ||
          path.startsWith("/schedule") ||
          path.startsWith("/invoices") ||
          path.startsWith("/videos") ||
          path.startsWith("/messages") ||
          path.startsWith("/teacher") ||
          path.startsWith("/admin") ||
          path.startsWith("/settings") ||
          path.startsWith("/notifications");

        if (!protectedPrefix) {
          return true;
        }

        return !!token;
      },
    },
  },
);

export const config = {
  matcher: [
    "/student/:path*",
    "/dashboard/:path*",
    "/schedule/:path*",
    "/invoices/:path*",
    "/videos/:path*",
    "/messages/:path*",
    "/teacher/:path*",
    "/admin/:path*",
    "/settings/:path*",
    "/notifications/:path*",
  ],
};
