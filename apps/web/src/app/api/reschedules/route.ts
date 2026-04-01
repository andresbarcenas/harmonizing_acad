import { NextResponse } from "next/server";
import { RescheduleStatus, Role, SessionStatus } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { rescheduleSchema } from "@/lib/validators/schedule";

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.STUDENT || !auth.user.studentProfile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = rescheduleSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;

  const session = await db.classSession.findFirst({
    where: {
      id: payload.sessionId,
      studentId: auth.user.studentProfile.id,
      status: { in: [SessionStatus.SCHEDULED, SessionStatus.RESCHEDULE_PENDING] },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 });
  }

  const request = await db.rescheduleRequest.create({
    data: {
      sessionId: session.id,
      requestedById: auth.user.id,
      proposedStartUtc: new Date(payload.proposedStartUtc),
      proposedEndUtc: new Date(payload.proposedEndUtc),
      studentMessage: payload.studentMessage,
      status: RescheduleStatus.PENDING,
    },
  });

  await db.classSession.update({
    where: { id: session.id },
    data: { status: SessionStatus.RESCHEDULE_PENDING },
  });

  await db.notification.create({
    data: {
      userId: session.teacherId,
      type: "RESCHEDULE_UPDATE",
      title: "Nueva solicitud de reagendación",
      body: "Un estudiante propuso nuevo horario.",
      actionUrl: "/teacher/requests",
    },
  });

  return NextResponse.json({ request });
}

export async function PATCH(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.TEACHER || !auth.user.teacherProfile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { requestId, status, teacherResponse } = (await req.json()) as {
    requestId: string;
    status: "ACCEPTED" | "REJECTED";
    teacherResponse?: string;
  };

  if (!requestId || ![RescheduleStatus.ACCEPTED, RescheduleStatus.REJECTED].includes(status)) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const request = await db.rescheduleRequest.findFirst({
    where: {
      id: requestId,
      status: RescheduleStatus.PENDING,
      session: { teacherId: auth.user.teacherProfile.id },
    },
    include: {
      session: true,
    },
  });

  if (!request) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  await db.rescheduleRequest.update({
    where: { id: request.id },
    data: {
      status,
      teacherResponse,
      reviewedById: auth.user.teacherProfile.id,
      decidedAt: new Date(),
    },
  });

  if (status === RescheduleStatus.ACCEPTED) {
    await db.classSession.update({
      where: { id: request.session.id },
      data: {
        startsAtUtc: request.proposedStartUtc,
        endsAtUtc: request.proposedEndUtc,
        status: SessionStatus.SCHEDULED,
      },
    });
  } else {
    await db.classSession.update({
      where: { id: request.session.id },
      data: {
        status: SessionStatus.SCHEDULED,
      },
    });
  }

  const studentUser = await db.studentProfile.findUnique({
    where: { id: request.session.studentId },
    select: { userId: true },
  });

  if (studentUser) {
    await db.notification.create({
      data: {
        userId: studentUser.userId,
        type: "RESCHEDULE_UPDATE",
        title: status === RescheduleStatus.ACCEPTED ? "Cambio de clase aprobado" : "Cambio de clase rechazado",
        body: status === RescheduleStatus.ACCEPTED ? "Tu nuevo horario quedó confirmado." : "Conservamos tu horario original.",
        actionUrl: "/schedule",
      },
    });
  }

  return NextResponse.json({ ok: true });
}
