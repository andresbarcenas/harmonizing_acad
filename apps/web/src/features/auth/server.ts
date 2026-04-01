import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { defaultRouteForRole } from "@/lib/rbac";

export type AppViewer = {
  id: string;
  name: string;
  email: string;
  role: Role;
  timezone: string;
  studentProfileId?: string;
  teacherProfileId?: string;
};

export async function requireViewer(expectedRoles?: Role[]): Promise<AppViewer> {
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

  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    timezone: dbUser.timezone,
    studentProfileId: dbUser.studentProfile?.id,
    teacherProfileId: dbUser.teacherProfile?.id,
  };
}
