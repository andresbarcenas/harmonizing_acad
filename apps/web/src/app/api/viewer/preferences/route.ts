import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { LOCALE_COOKIE, isSupportedLocale } from "@/lib/i18n/locales";
import { getBrowserLocale, getRequestLocale } from "@/lib/i18n/request";

export async function PATCH(req: Request) {
  return updatePreferences(req);
}

export async function POST(req: Request) {
  return updatePreferences(req);
}

async function updatePreferences(req: Request) {
  const auth = await requireApiUser({ skipConsent: true });
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => ({}))) as { locale?: string | null };
  const requestedLocale = body.locale === "browser" ? null : body.locale;
  if (requestedLocale !== null && requestedLocale !== undefined && !isSupportedLocale(requestedLocale)) {
    return NextResponse.json(
      { error: auth.user.locale === "es" ? "Idioma no válido." : "Invalid language." },
      { status: 400 },
    );
  }

  const user = await db.user.update({
    where: { id: auth.user.id },
    data: { locale: requestedLocale ?? null },
    select: { locale: true },
  });

  const locale = user.locale ? await getRequestLocale(user.locale) : await getBrowserLocale();
  const response = NextResponse.json({ ok: true, locale, preference: user.locale });
  if (user.locale) {
    response.cookies.set(LOCALE_COOKIE, user.locale, {
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  } else {
    response.cookies.set(LOCALE_COOKIE, "", {
      httpOnly: false,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
  }

  return response;
}
