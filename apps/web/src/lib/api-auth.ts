import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { ConsentRequiredError, consentRequiredResponse, ensureStudentConsent } from "@/lib/consent/service";
import { db } from "@/lib/db";
import { normalizeLocalePreference } from "@/lib/i18n/locales";
import { getRequestLocale } from "@/lib/i18n/request";

type RequireApiUserOptions = {
  skipConsent?: boolean;
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
    },
  });

  if (!user) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) } as const;
  }

  const locale = await getRequestLocale(user.locale);
  const resolvedUser = {
    ...user,
    locale,
    localePreference: normalizeLocalePreference(user.locale),
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
