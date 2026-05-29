import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import {
  IMPERSONATION_COOKIE_NAME,
  clearImpersonationCookieOptions,
  getImpersonationCookieToken,
  stopActiveImpersonation,
} from "@/lib/admin-impersonation";
import { requireApiUser } from "@/lib/api-auth";

function message(locale: string | null | undefined, en: string, es: string) {
  return locale === "es" ? es : en;
}

export async function POST() {
  const auth = await requireApiUser({ skipConsent: true, ignoreImpersonation: true });
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: message(auth.user.locale, "Forbidden.", "No autorizado.") }, { status: 403 });
  }

  await stopActiveImpersonation(auth.user.id, await getImpersonationCookieToken());
  const response = NextResponse.json({ ok: true, redirectTo: "/admin/access" });
  response.cookies.set(IMPERSONATION_COOKIE_NAME, "", clearImpersonationCookieOptions());
  return response;
}
