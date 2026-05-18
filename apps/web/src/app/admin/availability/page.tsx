import Link from "next/link";
import { Role, SessionStatus } from "@prisma/client";

import { AvailabilityManager, BlackoutDateManager } from "@/components/admin/availability-manager";
import { AppShell } from "@/components/ui/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { db } from "@/lib/db";
import { formatDateTimeInZone, getDictionary } from "@/lib/i18n";
import { instrumentLabel } from "@/lib/instruments";
import { localDateKeyInTimezone } from "@/lib/scheduling";

export default async function AdminAvailabilityPage() {
  const viewer = await requireViewer([Role.ADMIN]);
  const dictionary = getDictionary(viewer.locale);

  const teachers = await db.teacherProfile.findMany({
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

  return (
    <AppShell role={viewer.role} activePath="/admin/availability" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={dictionary.shell.nav.availability}
        title={dictionary.admin.availabilityTitle}
        description={dictionary.admin.availabilityDescription}
      >
        <Link href="/admin/teachers">
          <Button variant="outline" size="sm">{dictionary.admin.addTeacher}</Button>
        </Link>
      </PageIntro>

      <div className="space-y-4">
        {teachers.map((teacher) => (
          <Card key={teacher.id}>
            <CardTitle>{teacher.user.name}</CardTitle>
            <CardDescription>{instrumentLabel(teacher.specialty, viewer.locale)}</CardDescription>
            <div className="mt-3">
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
                endpoint="/api/admin/availability/blackouts"
              />
            </div>
          </Card>
        ))}
        {!teachers.length ? (
          <Card>
            <CardTitle>{dictionary.admin.noTeachersLoaded}</CardTitle>
            <CardDescription>{dictionary.admin.addTeachersForAvailability}</CardDescription>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
