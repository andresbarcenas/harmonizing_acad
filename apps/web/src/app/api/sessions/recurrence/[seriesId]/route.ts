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
    return NextResponse.json({ error: auth.user.locale === "es" ? "Serie no encontrada." : "Series not found." }, { status: 404 });
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
    title: "Recurring series paused",
    body: "Your teacher stopped the upcoming classes in this series.",
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
    return NextResponse.json({ error: auth.user.locale === "es" ? "Serie no encontrada." : "Series not found." }, { status: 404 });
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
    title: "Recurring series deleted",
    body: "Your teacher deleted a pending class series.",
    actionUrl: "/schedule",
  });

  return NextResponse.json({ ok: true });
}
