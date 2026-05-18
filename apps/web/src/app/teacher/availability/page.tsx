import { notFound } from "next/navigation";
import { Role, SessionStatus } from "@prisma/client";

import { AvailabilityManager, BlackoutDateManager } from "@/components/admin/availability-manager";
import { AppShell } from "@/components/ui/app-shell";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { db } from "@/lib/db";
import { formatDateTimeInZone, getDictionary } from "@/lib/i18n";
import { instrumentLabel } from "@/lib/instruments";
import { localDateKeyInTimezone } from "@/lib/scheduling";

export default async function TeacherAvailabilityPage() {
  const viewer = await requireViewer([Role.TEACHER]);
  const dictionary = getDictionary(viewer.locale);

  if (!viewer.teacherProfileId) notFound();

  const teacher = await db.teacherProfile.findUnique({
    where: { id: viewer.teacherProfileId },
    include: {
      user: true,
      availability: { orderBy: [{ weekday: "asc" }, { startMinuteLocal: "asc" }] },
      blackoutDates: { orderBy: { localDate: "asc" } },
      sessions: {
        where: {
          status: { in: [SessionStatus.SCHEDULED, SessionStatus.RESCHEDULE_PENDING] },
          startsAtUtc: { gte: new Date() },
        },
        include: { student: { include: { user: true } } },
        orderBy: { startsAtUtc: "asc" },
      },
    },
  });

  if (!teacher) notFound();

  return (
    <AppShell role={viewer.role} activePath="/teacher/availability" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={dictionary.shell.nav.availability}
        title={dictionary.teacher.availabilityTitle}
        description={dictionary.teacher.availabilityDescription}
      />

      <Card>
        <CardTitle>{teacher.user.name}</CardTitle>
        <CardDescription>
          {instrumentLabel(teacher.specialty, viewer.locale)} · {dictionary.common.timezone}: {teacher.user.timezone}
        </CardDescription>
        <div className="mt-4">
          <AvailabilityManager
            teacherId={teacher.id}
            timezone={teacher.user.timezone}
            items={teacher.availability.map((slot) => ({
              id: slot.id,
              weekday: slot.weekday,
              startMinuteLocal: slot.startMinuteLocal,
              endMinuteLocal: slot.endMinuteLocal,
              timezone: slot.timezone,
            }))}
            locale={viewer.locale}
            endpoint="/api/teacher/availability"
            includeTeacherId={false}
          />
          <BlackoutDateManager
            teacherId={teacher.id}
            items={teacher.blackoutDates.map((blackout) => ({
              id: blackout.id,
              localDate: blackout.localDate,
              note: blackout.note,
              affectedSessions: teacher.sessions
                .filter((session) => localDateKeyInTimezone(session.startsAtUtc, teacher.user.timezone) === blackout.localDate)
                .map((session) => ({
                  id: session.id,
                  label: `${session.student.user.name} · ${formatDateTimeInZone(session.startsAtUtc, teacher.user.timezone, viewer.locale)}`,
                })),
            }))}
            locale={viewer.locale}
            endpoint="/api/teacher/availability/blackouts"
            includeTeacherId={false}
          />
        </div>
      </Card>
    </AppShell>
  );
}
