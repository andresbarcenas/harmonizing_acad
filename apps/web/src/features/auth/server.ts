import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ConsentRequiredError, ensureStudentConsent } from "@/lib/consent/service";
import { normalizeLocale, type AppLocale } from "@/lib/i18n/locales";
import { defaultRouteForRole } from "@/lib/rbac";

export type AppViewer = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: Role;
  locale: AppLocale;
  timezone: string;
  studentProfileId?: string;
  teacherProfileId?: string;
};

type RequireViewerOptions = {
  skipConsent?: boolean;
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
    },
  });

  if (!dbUser) {
    redirect("/sign-in");
  }

  if (expectedRoles && !expectedRoles.includes(dbUser.role)) {
    redirect(defaultRouteForRole(dbUser.role));
  }

  if (!options?.skipConsent) {
    try {
      await ensureStudentConsent(dbUser);
    } catch (error) {
      if (error instanceof ConsentRequiredError) {
        redirect("/consent");
      }
      throw error;
    }
  }

  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    image: dbUser.image,
    role: dbUser.role,
    locale: normalizeLocale(dbUser.locale),
    timezone: dbUser.timezone,
    studentProfileId: dbUser.studentProfile?.id,
    teacherProfileId: dbUser.teacherProfile?.id,
  };
}
