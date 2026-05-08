import { NextResponse } from "next/server";

import { LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n/locales";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { locale?: string };
  const locale = normalizeLocale(body.locale);
  const response = NextResponse.json({ ok: true, locale });

  response.cookies.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });

  return response;
}
