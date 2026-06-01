import { NextResponse } from "next/server";
import { NotificationType, RescheduleStatus, Role, SessionStatus } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { syncClassSessionCreditConsumption } from "@/lib/native-invoices/ledger";
import { createNotifications } from "@/lib/notifications";

type Params = { params: Promise<{ classId: string }> };

const copy = {
  es: {
    forbidden: "No autorizado.",
    notFound: "Clase pendiente no encontrada.",
    teacherResponse: "La clase fue cancelada en lugar de reagendada.",
    title: "Clase cancelada",
    body: "Tu docente canceló la clase que estaba pendiente de reagendar.",
  },
  en: {
    forbidden: "Forbidden.",
    notFound: "Pending class not found.",
    teacherResponse: "Class was cancelled instead of rescheduled.",
    title: "Class cancelled",
    body: "Your teacher cancelled the class that was pending reschedule.",
  },
} as const;

export async function POST(_req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const locale = auth.user.locale === "es" ? "es" : "en";
  const c = copy[locale];

  if (auth.user.role !== Role.TEACHER || !auth.user.teacherProfile) {
    return NextResponse.json({ error: c.forbidden }, { status: 403 });
  }

  const { classId } = await params;
  const teacherProfileId = auth.user.teacherProfile.id;
  const session = await db.classSession.findFirst({
    where: {
      id: classId,
      teacherId: teacherProfileId,
      status: SessionStatus.RESCHEDULE_PENDING,
    },
    include: {
      student: { include: { user: true } },
      rescheduleRequests: {
        where: { status: RescheduleStatus.PENDING },
        select: { id: true, requestedById: true },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: c.notFound }, { status: 404 });
  }

  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.classSession.update({
      where: { id: session.id },
      data: {
        status: SessionStatus.CANCELLED,
        completedAt: null,
      },
    });

    await tx.rescheduleRequest.updateMany({
      where: {
        sessionId: session.id,
        status: RescheduleStatus.PENDING,
      },
      data: {
        status: RescheduleStatus.CANCELLED,
        teacherResponse: c.teacherResponse,
        reviewedById: teacherProfileId,
        decidedAt: now,
      },
    });

    await syncClassSessionCreditConsumption(session.id, auth.user.id, tx);
  });

  const requesterUserIds = session.rescheduleRequests
    .map((request) => request.requestedById)
    .filter((userId) => userId !== session.student.userId);
  const notifiedUserIds = Array.from(new Set([session.student.userId, ...requesterUserIds]));

  await createNotifications(notifiedUserIds.map((userId) => ({
    userId,
    type: NotificationType.RESCHEDULE_UPDATE,
    title: c.title,
    body: c.body,
    actionUrl: `/classes/${session.id}`,
  })));

  return NextResponse.json({ ok: true, sessionId: session.id });
}
