import Link from "next/link";
import { Role } from "@prisma/client";

import { StudentEditForm } from "@/components/admin/student-edit-form";
import { StudentOnboardingForm } from "@/components/admin/student-onboarding-form";
import { AppShell } from "@/components/ui/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { db } from "@/lib/db";
import { formatDate, getDictionary } from "@/lib/i18n";

export default async function AdminStudentsPage() {
  const viewer = await requireViewer([Role.ADMIN]);
  const dictionary = getDictionary(viewer.locale);

  const [teachers, recentStudents] = await Promise.all([
    db.teacherProfile.findMany({
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
    db.studentProfile.findMany({
      include: {
        user: true,
        assignment: {
          include: { teacher: { include: { user: true } } },
        },
        subscriptions: {
          where: { active: true },
          include: { plan: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { joinedAt: "desc" },
      take: 12,
    }),
  ]);

  return (
    <AppShell role={viewer.role} activePath="/admin/students" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={dictionary.admin.studentOnboardingEyebrow}
        title={dictionary.admin.studentOnboardingTitle}
        description={dictionary.admin.studentOnboardingDescription}
      >
        <Link href="/admin/teachers">
          <Button variant="outline" size="sm">{dictionary.admin.addTeacher}</Button>
        </Link>
      </PageIntro>

      <Card>
        <CardTitle>{dictionary.admin.addStudent}</CardTitle>
        <CardDescription>
          {dictionary.admin.onboardingStudentDescription}
        </CardDescription>
        <div className="mt-4">
          {teachers.length ? (
            <StudentOnboardingForm
              locale={viewer.locale}
              teachers={teachers.map((teacher) => ({
                id: teacher.id,
                name: teacher.user.name,
                specialty: teacher.specialty,
              }))}
            />
          ) : (
            <p className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3 text-sm text-[var(--color-ink-soft)]">
              {dictionary.admin.noTeachersAvailable}
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardTitle>{dictionary.admin.recentStudents}</CardTitle>
        <CardDescription>{dictionary.admin.latestStudents}</CardDescription>
        <div className="mt-4 space-y-2">
          {recentStudents.map((student) => (
            <div
              key={student.id}
              className="flex flex-col gap-2 rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  src={student.user.image}
                  alt={student.user.name}
                  fallback={student.user.name.slice(0, 1).toUpperCase()}
                  className="h-10 w-10 text-xs"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{student.user.name}</p>
                  <p className="truncate text-xs text-[var(--color-ink-soft)]">{student.user.email}</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs text-[var(--color-ink-soft)]">
                  {dictionary.common.teacher}: {student.assignment?.teacher.user.name ?? dictionary.common.unassigned}
                </p>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  {dictionary.common.plan}: {student.subscriptions[0]?.plan.name ?? dictionary.admin.noActivePlan}
                </p>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  {dictionary.common.joined}: {formatDate(student.joinedAt, viewer.locale)}
                </p>
                <StudentEditForm
                  studentId={student.id}
                  teachers={teachers.map((teacher) => ({
                    id: teacher.id,
                    name: teacher.user.name,
                  }))}
                  initial={{
                    userId: student.user.id,
                    name: student.user.name,
                    email: student.user.email,
                    teacherId: student.assignment?.teacher.id,
                    phone: student.phone,
                    preferredInstrument: student.preferredInstrument,
                    bio: student.bio,
                    profileImage: student.user.image,
                  }}
                  locale={viewer.locale}
                />
              </div>
            </div>
          ))}
          {!recentStudents.length ? (
            <p className="text-sm text-[var(--color-ink-soft)]">{dictionary.admin.noStudentsRegistered}</p>
          ) : null}
        </div>
      </Card>
    </AppShell>
  );
}
