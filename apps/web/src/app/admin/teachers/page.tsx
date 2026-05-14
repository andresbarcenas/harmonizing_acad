import { Role } from "@prisma/client";

import { TeacherEditForm } from "@/components/admin/teacher-edit-form";
import { TeacherOnboardingForm } from "@/components/admin/teacher-onboarding-form";
import { AppShell } from "@/components/ui/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { db } from "@/lib/db";
import { getDictionary } from "@/lib/i18n";
import { instrumentLabel } from "@/lib/instruments";

export default async function AdminTeachersPage() {
  const viewer = await requireViewer([Role.ADMIN]);
  const dictionary = getDictionary(viewer.locale);

  const recentTeachers = await db.teacherProfile.findMany({
    include: {
      user: true,
      availability: true,
    },
    orderBy: { user: { createdAt: "desc" } },
    take: 12,
  });

  return (
    <AppShell role={viewer.role} activePath="/admin/teachers" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={dictionary.admin.teacherOnboardingEyebrow}
        title={dictionary.admin.teacherOnboardingTitle}
        description={dictionary.admin.teacherOnboardingDescription}
      />

      <Card>
        <CardTitle>{dictionary.admin.addTeacher}</CardTitle>
        <CardDescription>
          {dictionary.admin.onboardingTeacherDescription}
        </CardDescription>
        <div className="mt-4">
          <TeacherOnboardingForm locale={viewer.locale} />
        </div>
      </Card>

      <Card>
        <CardTitle>{dictionary.admin.recentTeachers}</CardTitle>
        <CardDescription>{dictionary.admin.latestTeachers}</CardDescription>
        <div className="mt-4 space-y-2">
          {recentTeachers.map((teacher) => (
            <div
              key={teacher.id}
              className="flex flex-col gap-2 rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  src={teacher.user.image}
                  alt={teacher.user.name}
                  fallback={teacher.user.name.slice(0, 1).toUpperCase()}
                  className="h-10 w-10 text-xs"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{teacher.user.name}</p>
                  <p className="truncate text-xs text-[var(--color-ink-soft)]">{teacher.user.email}</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-[var(--color-ink-soft)]">{instrumentLabel(teacher.specialty, viewer.locale)}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">{dictionary.common.timezone}: {teacher.user.timezone}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  {dictionary.admin.availabilityBlocks}: {teacher.availability.length}
                </p>
                <TeacherEditForm
                  teacherId={teacher.id}
                  initial={{
                    userId: teacher.user.id,
                    name: teacher.user.name,
                    email: teacher.user.email,
                    specialty: teacher.specialty,
                    bio: teacher.bio,
                    profileImage: teacher.user.image,
                  }}
                  locale={viewer.locale}
                />
              </div>
            </div>
          ))}
          {!recentTeachers.length ? (
            <p className="text-sm text-[var(--color-ink-soft)]">{dictionary.admin.noTeachersRegistered}</p>
          ) : null}
        </div>
      </Card>
    </AppShell>
  );
}
