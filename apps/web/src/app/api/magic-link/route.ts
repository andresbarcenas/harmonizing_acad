import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { createMagicLinkToken, buildMagicLinkUrl, MAGIC_LINK_MAX_AGE_SECONDS, normalizeMagicLinkEmail } from "@/lib/auth/magic-link";
import { db } from "@/lib/db";
import { sendMagicLinkEmail } from "@/lib/email/magic-link";
import { getRequestLocale } from "@/lib/i18n/request";
import { magicLinkRequestSchema } from "@/lib/validators/auth";

function baseUrlFromRequest(request: Request) {
  return process.env.NEXTAUTH_URL?.trim() || new URL(request.url).origin;
}

function genericResponse(previewUrl?: string) {
  return NextResponse.json({
    ok: true,
    previewUrl: process.env.NODE_ENV !== "production" ? previewUrl : undefined,
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = magicLinkRequestSchema.safeParse(body);
  if (!parsed.success) {
    const locale = await getRequestLocale();
    return NextResponse.json({ error: locale === "es" ? "Email inválido." : "Invalid email." }, { status: 400 });
  }

  const email = normalizeMagicLinkEmail(parsed.data.email);
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true, locale: true },
  });

  // Security-sensitive: return the same successful shape for missing/admin accounts to avoid account enumeration.
  if (!user || (user.role !== Role.STUDENT && user.role !== Role.TEACHER)) {
    return genericResponse();
  }

  const { token } = await createMagicLinkToken(email);
  const url = buildMagicLinkUrl({ baseUrl: baseUrlFromRequest(request), email, token });
  const expiresMinutes = Math.round(MAGIC_LINK_MAX_AGE_SECONDS / 60);

  try {
    const locale = await getRequestLocale(user.locale);
    const delivery = await sendMagicLinkEmail({
      to: user.email,
      name: user.name,
      locale,
      url,
      expiresMinutes,
    });

    if (!delivery.sent && process.env.NODE_ENV !== "production") {
      return genericResponse(url);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      return genericResponse(url);
    }
    console.error("Magic link email delivery failed", error);
  }

  return genericResponse();
}
