import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { resolveActiveImpersonation } from "@/lib/admin-impersonation";
import { authOptions } from "@/lib/auth";
import { ConsentRequiredError, consentRequiredResponse, ensureStudentConsent } from "@/lib/consent/service";
import { db } from "@/lib/db";
import { normalizeLocalePreference } from "@/lib/i18n/locales";
import { getRequestLocale } from "@/lib/i18n/request";

type RequireApiUserOptions = {
  skipConsent?: boolean;
  ignoreImpersonation?: boolean;
};

export async function requireApiUser(options?: RequireApiUserOptions) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) } as const;
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      studentProfile: true,
      teacherProfile: true,
      parentGuardianProfile: true,
    },
  });

  if (!user) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) } as const;
  }

  const impersonation = options?.ignoreImpersonation ? null : await resolveActiveImpersonation(user);
  const effectiveUser = impersonation?.targetUser ?? user;
  const locale = await getRequestLocale(effectiveUser.locale);
  const resolvedUser = {
    ...effectiveUser,
    locale,
    localePreference: normalizeLocalePreference(effectiveUser.locale),
    authMethod: session.user.authMethod,
    isImpersonating: Boolean(impersonation),
    impersonatedByAdminId: impersonation?.adminUserId,
    impersonatedByAdminName: impersonation?.adminName,
    impersonationSessionId: impersonation?.sessionId,
    impersonationExpiresAt: impersonation?.expiresAt,
  };

  if (!options?.skipConsent) {
    try {
      await ensureStudentConsent(resolvedUser);
    } catch (error) {
      if (error instanceof ConsentRequiredError) {
        return { error: NextResponse.json(consentRequiredResponse(locale), { status: 428 }) } as const;
      }
      throw error;
    }
  }

  return { user: resolvedUser } as const;
}
