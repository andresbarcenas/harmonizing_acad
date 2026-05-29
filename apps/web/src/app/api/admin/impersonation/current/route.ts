import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { getImpersonationCookieToken, resolveActiveImpersonation } from "@/lib/admin-impersonation";
import { requireApiUser } from "@/lib/api-auth";

function message(locale: string | null | undefined, en: string, es: string) {
  return locale === "es" ? es : en;
}

export async function GET() {
  const auth = await requireApiUser({ skipConsent: true, ignoreImpersonation: true });
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: message(auth.user.locale, "Forbidden.", "No autorizado.") }, { status: 403 });
  }

  const impersonation = await resolveActiveImpersonation(auth.user, await getImpersonationCookieToken());
  return NextResponse.json({
    impersonation: impersonation
      ? {
          sessionId: impersonation.sessionId,
          adminUserId: impersonation.adminUserId,
          adminName: impersonation.adminName,
          targetUserId: impersonation.targetUserId,
          targetName: impersonation.targetName,
          expiresAt: impersonation.expiresAt.toISOString(),
        }
      : null,
  });
}
