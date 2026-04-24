import { withAuth } from "next-auth/middleware";

import { canAccessPath } from "@/lib/rbac";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;

    if (typeof role !== "string") {
      return Response.redirect(new URL("/sign-in", req.url));
    }

    if (!canAccessPath(role as never, req.nextUrl.pathname)) {
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
