import { NextResponse } from "next/server";
import { NotificationType, Role, SessionStatus } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

type Params = { params: Promise<{ seriesId: string }> };

export async function PATCH(_: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.TEACHER || !auth.user.teacherProfile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { seriesId } = await params;
  const now = new Date();

  const series = await db.recurringClassSeries.findFirst({
    where: {
      id: seriesId,
      teacherId: auth.user.teacherProfile.id,
    },
    include: {
      student: { include: { user: true } },
    },
  });

  if (!series) {
    return NextResponse.json({ error: "Serie no encontrada." }, { status: 404 });
  }

  await db.$transaction(async (tx) => {
    await tx.recurringClassSeries.update({
      where: { id: seriesId },
      data: { active: false, stoppedAt: now },
    });

    await tx.classSession.updateMany({
      where: {
        recurrenceId: seriesId,
        startsAtUtc: { gte: now },
        status: { notIn: [SessionStatus.COMPLETED, SessionStatus.NO_SHOW, SessionStatus.CANCELLED] },
      },
      data: { status: SessionStatus.CANCELLED },
    });
  });

  await createNotification({
    userId: series.student.userId,
    type: NotificationType.CLASS_REMINDER,
    title: "Serie recurrente pausada",
    body: "Tu docente detuvo las próximas clases de esta serie.",
    actionUrl: "/schedule",
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.TEACHER || !auth.user.teacherProfile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { seriesId } = await params;

  const series = await db.recurringClassSeries.findFirst({
    where: {
      id: seriesId,
      teacherId: auth.user.teacherProfile.id,
    },
    include: {
      student: { include: { user: true } },
    },
  });

  if (!series) {
    return NextResponse.json({ error: "Serie no encontrada." }, { status: 404 });
  }

  await db.$transaction(async (tx) => {
    await tx.classSession.deleteMany({
      where: {
        recurrenceId: seriesId,
        status: { notIn: [SessionStatus.COMPLETED, SessionStatus.NO_SHOW] },
      },
    });

    await tx.recurringClassSeries.delete({
      where: { id: seriesId },
    });
  });

  await createNotification({
    userId: series.student.userId,
    type: NotificationType.CLASS_REMINDER,
    title: "Serie recurrente eliminada",
    body: "Tu docente eliminó una serie de clases pendientes.",
    actionUrl: "/schedule",
  });

  return NextResponse.json({ ok: true });
}
