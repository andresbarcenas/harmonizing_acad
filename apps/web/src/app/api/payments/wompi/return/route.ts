import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const invoiceId = url.searchParams.get("invoiceId");
  const auth = await requireApiUser();
  if ("error" in auth) {
    const signInUrl = new URL("/sign-in", url.origin);
    if (invoiceId) signInUrl.searchParams.set("callbackUrl", `/invoices`);
    return NextResponse.redirect(signInUrl);
  }

  if (auth.user.role === Role.PARENT) return NextResponse.redirect(new URL("/parent/invoices", url.origin));
  if (auth.user.role === Role.STUDENT) return NextResponse.redirect(new URL("/invoices", url.origin));
  if (auth.user.role === Role.ADMIN) return NextResponse.redirect(new URL("/admin/invoices", url.origin));
  return NextResponse.redirect(new URL("/", url.origin));
}
