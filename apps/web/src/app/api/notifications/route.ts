import { NextResponse } from "next/server";
import { NotificationType, Role, SessionStatus } from "@prisma/client";
import { addHours, subHours } from "date-fns";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { formatUtcToLocal } from "@/lib/timezone";

export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const notifications = await db.notification.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const unreadCount = await db.notification.count({
    where: {
      userId: auth.user.id,
      readAt: null,
    },
  });

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { notificationId, markAll } = (await req.json()) as { notificationId?: string; markAll?: boolean };

  if (!markAll && !notificationId) {
    return NextResponse.json({ error: "notificationId requerido" }, { status: 400 });
  }

  if (markAll) {
    await db.notification.updateMany({
      where: {
        userId: auth.user.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  } else {
    await db.notification.updateMany({
      where: {
        id: notificationId,
        userId: auth.user.id,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function POST() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const canSimulate = auth.user.role === Role.ADMIN || process.env.NODE_ENV === "development";
  if (!canSimulate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const until = addHours(now, 24);
  const dedupeSince = subHours(now, 24);

  const sessions = await db.classSession.findMany({
    where: {
      startsAtUtc: { gte: now, lte: until },
      status: { in: [SessionStatus.SCHEDULED, SessionStatus.RESCHEDULE_PENDING] },
    },
    include: {
      student: { include: { user: true } },
      teacher: { include: { user: true } },
    },
    orderBy: { startsAtUtc: "asc" },
  });

  let created = 0;

  for (const session of sessions) {
    const studentTitle = "Recordatorio de clase";
    const studentBody = `Tu clase inicia ${formatUtcToLocal(session.startsAtUtc, session.student.user.timezone)}.`;
    const teacherBody = `Clase con ${session.student.user.name} a las ${formatUtcToLocal(session.startsAtUtc, session.teacher.user.timezone, "h:mm a")}.`;

    const [existingStudent, existingTeacher] = await Promise.all([
      db.notification.findFirst({
        where: {
          userId: session.student.userId,
          type: NotificationType.CLASS_REMINDER,
          title: studentTitle,
          body: studentBody,
          createdAt: { gte: dedupeSince },
        },
      }),
      db.notification.findFirst({
        where: {
          userId: session.teacher.userId,
          type: NotificationType.CLASS_REMINDER,
          title: studentTitle,
          body: teacherBody,
          createdAt: { gte: dedupeSince },
        },
      }),
    ]);

    if (!existingStudent) {
      await createNotification({
        userId: session.student.userId,
        type: NotificationType.CLASS_REMINDER,
        title: studentTitle,
        body: studentBody,
        actionUrl: "/dashboard",
      });
      created += 1;
    }

    if (!existingTeacher) {
      await createNotification({
        userId: session.teacher.userId,
        type: NotificationType.CLASS_REMINDER,
        title: studentTitle,
        body: teacherBody,
        actionUrl: "/teacher/dashboard",
      });
      created += 1;
    }
  }

  return NextResponse.json({ ok: true, created });
}
