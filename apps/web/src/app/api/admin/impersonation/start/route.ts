import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import {
  impersonationCookieOptions,
  startTeacherImpersonation,
} from "@/lib/admin-impersonation";
import { requireApiUser } from "@/lib/api-auth";
import { IMPERSONATION_COOKIE_NAME } from "@/lib/impersonation-cookie";

function message(locale: string | null | undefined, en: string, es: string) {
  return locale === "es" ? es : en;
}

function errorMessage(code: string, locale: string | null | undefined) {
  const messages: Record<string, { en: string; es: string }> = {
    REASON_REQUIRED: {
      en: "Add a short troubleshooting reason before starting impersonation.",
      es: "Agrega una razón breve de soporte antes de iniciar la suplantación.",
    },
    ADMIN_REQUIRED: {
      en: "Only admins can impersonate teachers.",
      es: "Solo los admins pueden suplantar docentes.",
    },
    TARGET_NOT_FOUND: {
      en: "Teacher account not found.",
      es: "No encontramos la cuenta docente.",
    },
    SELF_IMPERSONATION_BLOCKED: {
      en: "You cannot impersonate yourself.",
      es: "No puedes suplantarte a ti mismo.",
    },
    TEACHER_ONLY: {
      en: "Only teacher accounts can be impersonated in this version.",
      es: "En esta versión solo se pueden suplantar cuentas docentes.",
    },
    TARGET_INACTIVE: {
      en: "Inactive teacher accounts cannot be impersonated.",
      es: "No se pueden suplantar cuentas docentes inactivas.",
    },
  };
  const item = messages[code] ?? messages.ADMIN_REQUIRED;
  return message(locale, item.en, item.es);
}

export async function POST(req: Request) {
  const auth = await requireApiUser({ skipConsent: true, ignoreImpersonation: true });
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: message(auth.user.locale, "Forbidden.", "No autorizado.") }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { targetUserId?: string; reason?: string };
  const targetUserId = body.targetUserId?.trim();
  if (!targetUserId) {
    return NextResponse.json({ error: message(auth.user.locale, "Teacher account is required.", "La cuenta docente es requerida.") }, { status: 400 });
  }

  const result = await startTeacherImpersonation({
    adminUserId: auth.user.id,
    targetUserId,
    reason: body.reason ?? "",
    headers: req.headers,
  });

  if ("error" in result && result.error) {
    return NextResponse.json({ error: errorMessage(result.error, auth.user.locale) }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, redirectTo: "/teacher/dashboard" });
  response.cookies.set(IMPERSONATION_COOKIE_NAME, result.token, impersonationCookieOptions(result.session.expiresAt));
  return response;
}
