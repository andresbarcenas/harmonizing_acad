import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n/locales";

export async function PATCH(req: Request) {
  return updatePreferences(req);
}

export async function POST(req: Request) {
  return updatePreferences(req);
}

async function updatePreferences(req: Request) {
  const auth = await requireApiUser({ skipConsent: true });
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => ({}))) as { locale?: string };
  const locale = normalizeLocale(body.locale);

  const user = await db.user.update({
    where: { id: auth.user.id },
    data: { locale },
    select: { locale: true },
  });

  const response = NextResponse.json({ ok: true, locale: user.locale });
  response.cookies.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  return response;
}
