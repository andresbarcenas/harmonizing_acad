import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { resolveActiveImpersonation } from "@/lib/admin-impersonation";
import { db } from "@/lib/db";
import { ConsentRequiredError, ensureStudentConsent } from "@/lib/consent/service";
import { normalizeLocalePreference, type AppLocale, type LocalePreference } from "@/lib/i18n/locales";
import { getRequestLocale } from "@/lib/i18n/request";
import { defaultRouteForRole } from "@/lib/rbac";

export type AppViewer = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: Role;
  locale: AppLocale;
  localePreference: LocalePreference;
  timezone: string;
  authMethod?: "credentials" | "magic-link";
  studentProfileId?: string;
  teacherProfileId?: string;
  parentGuardianProfileId?: string;
  isImpersonating?: boolean;
  impersonatedByAdminId?: string;
  impersonatedByAdminName?: string;
  impersonationSessionId?: string;
  impersonationExpiresAt?: Date;
};

type RequireViewerOptions = {
  skipConsent?: boolean;
  ignoreImpersonation?: boolean;
};

export async function requireViewer(expectedRoles?: Role[], options?: RequireViewerOptions): Promise<AppViewer> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.email) {
    redirect("/sign-in");
  }

  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      studentProfile: true,
      teacherProfile: true,
      parentGuardianProfile: true,
    },
  });

  if (!dbUser) {
    redirect("/sign-in");
  }

  const impersonation = options?.ignoreImpersonation ? null : await resolveActiveImpersonation(dbUser);
  const effectiveUser = impersonation?.targetUser ?? dbUser;

  if (expectedRoles && !expectedRoles.includes(effectiveUser.role)) {
    redirect(defaultRouteForRole(effectiveUser.role));
  }

  const locale = await getRequestLocale(effectiveUser.locale);

  if (!options?.skipConsent) {
    try {
      await ensureStudentConsent({ ...effectiveUser, locale });
    } catch (error) {
      if (error instanceof ConsentRequiredError) {
        redirect("/consent");
      }
      throw error;
    }
  }

  return {
    id: effectiveUser.id,
    name: effectiveUser.name,
    email: effectiveUser.email,
    image: effectiveUser.image,
    role: effectiveUser.role,
    locale,
    localePreference: normalizeLocalePreference(effectiveUser.locale),
    timezone: effectiveUser.timezone,
    authMethod: session.user.authMethod,
    studentProfileId: effectiveUser.studentProfile?.id,
    teacherProfileId: effectiveUser.teacherProfile?.id,
    parentGuardianProfileId: effectiveUser.parentGuardianProfile?.id,
    isImpersonating: Boolean(impersonation),
    impersonatedByAdminId: impersonation?.adminUserId,
    impersonatedByAdminName: impersonation?.adminName,
    impersonationSessionId: impersonation?.sessionId,
    impersonationExpiresAt: impersonation?.expiresAt,
  };
}
