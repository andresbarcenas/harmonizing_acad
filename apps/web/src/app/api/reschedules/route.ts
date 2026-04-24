import { NextResponse } from "next/server";
import { NotificationType, RescheduleStatus, Role, SessionStatus } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { isSlotWithinAvailability, isValidRescheduleDuration, overlapsRange } from "@/lib/scheduling";
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
  const proposedStartUtc = new Date(payload.proposedStartUtc);
  const proposedEndUtc = new Date(payload.proposedEndUtc);

  if (Number.isNaN(proposedStartUtc.getTime()) || Number.isNaN(proposedEndUtc.getTime()) || proposedStartUtc >= proposedEndUtc) {
    return NextResponse.json({ error: "Horario propuesto inválido" }, { status: 400 });
  }

  if (!isValidRescheduleDuration(proposedStartUtc, proposedEndUtc)) {
    return NextResponse.json({ error: "La duración permitida es entre 30 y 180 minutos." }, { status: 400 });
  }

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

  const assignment = await db.teacherAssignment.findUnique({
    where: { studentId: auth.user.studentProfile.id },
    include: {
      teacher: {
        include: {
          user: true,
          availability: true,
        },
      },
    },
  });

  if (!assignment || assignment.teacherId !== session.teacherId) {
    return NextResponse.json({ error: "No tienes una docente asignada para esta clase" }, { status: 400 });
  }

  if (!isSlotWithinAvailability(proposedStartUtc, proposedEndUtc, assignment.teacher.availability, assignment.teacher.user.timezone)) {
    return NextResponse.json({ error: "El horario propuesto no está dentro de la disponibilidad docente." }, { status: 409 });
  }

  const existingPending = await db.rescheduleRequest.findFirst({
    where: {
      sessionId: session.id,
      status: RescheduleStatus.PENDING,
    },
  });

  if (existingPending) {
    return NextResponse.json({ error: "Ya existe una solicitud pendiente para esta clase." }, { status: 409 });
  }

  const overlap = await db.classSession.findFirst({
    where: {
      teacherId: session.teacherId,
      id: { not: session.id },
      status: { in: [SessionStatus.SCHEDULED, SessionStatus.RESCHEDULE_PENDING] },
      startsAtUtc: { lt: proposedEndUtc },
      endsAtUtc: { gt: proposedStartUtc },
    },
    select: { id: true },
  });

  if (overlap) {
    return NextResponse.json({ error: "La docente ya tiene otra clase en ese horario." }, { status: 409 });
  }

  const request = await db.rescheduleRequest.create({
    data: {
      sessionId: session.id,
      requestedById: auth.user.id,
      proposedStartUtc,
      proposedEndUtc,
      studentMessage: payload.studentMessage,
      status: RescheduleStatus.PENDING,
    },
  });

  await db.classSession.update({
    where: { id: session.id },
    data: { status: SessionStatus.RESCHEDULE_PENDING },
  });

  await createNotification({
    userId: assignment.teacher.userId,
    type: NotificationType.RESCHEDULE_UPDATE,
    title: "Nueva solicitud de reagendación",
    body: "Un estudiante propuso un nuevo horario.",
    actionUrl: "/teacher/requests",
  });

  return NextResponse.json({ request });
}

export async function PATCH(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.TEACHER || !auth.user.teacherProfile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const teacherProfileId = auth.user.teacherProfile.id;

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
      session: { teacherId: teacherProfileId },
    },
    include: {
      session: true,
    },
  });

  if (!request) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  if (!isValidRescheduleDuration(request.proposedStartUtc, request.proposedEndUtc)) {
    return NextResponse.json({ error: "La solicitud tiene una duración inválida." }, { status: 409 });
  }

  if (status === RescheduleStatus.ACCEPTED) {
    const availability = await db.teacherAvailability.findMany({
      where: { teacherId: request.session.teacherId },
    });

    const teacherUser = await db.teacherProfile.findUnique({
      where: { id: request.session.teacherId },
      include: { user: true },
    });

    if (!teacherUser) {
      return NextResponse.json({ error: "Docente no encontrada" }, { status: 404 });
    }

    if (!isSlotWithinAvailability(request.proposedStartUtc, request.proposedEndUtc, availability, teacherUser.user.timezone)) {
      return NextResponse.json({ error: "El horario propuesto ya no está disponible en agenda docente." }, { status: 409 });
    }

    const conflicting = await db.classSession.findMany({
      where: {
        teacherId: request.session.teacherId,
        id: { not: request.session.id },
        status: { in: [SessionStatus.SCHEDULED, SessionStatus.RESCHEDULE_PENDING] },
      },
      select: {
        id: true,
        startsAtUtc: true,
        endsAtUtc: true,
      },
    });

    const hasOverlap = conflicting.some((session) =>
      overlapsRange(request.proposedStartUtc, request.proposedEndUtc, session.startsAtUtc, session.endsAtUtc),
    );

    if (hasOverlap) {
      return NextResponse.json({ error: "La docente tiene una clase que se superpone con ese horario." }, { status: 409 });
    }
  }

  await db.$transaction(async (tx) => {
    await tx.rescheduleRequest.update({
      where: { id: request.id },
      data: {
        status,
        teacherResponse,
        reviewedById: teacherProfileId,
        decidedAt: new Date(),
      },
    });

    if (status === RescheduleStatus.ACCEPTED) {
      await tx.classSession.update({
        where: { id: request.session.id },
        data: {
          startsAtUtc: request.proposedStartUtc,
          endsAtUtc: request.proposedEndUtc,
          status: SessionStatus.SCHEDULED,
        },
      });
    } else {
      await tx.classSession.update({
        where: { id: request.session.id },
        data: {
          status: SessionStatus.SCHEDULED,
        },
      });
    }
  });

  const studentUser = await db.studentProfile.findUnique({
    where: { id: request.session.studentId },
    select: { userId: true },
  });

  if (studentUser) {
    await createNotification({
      userId: studentUser.userId,
      type: NotificationType.RESCHEDULE_UPDATE,
      title: status === RescheduleStatus.ACCEPTED ? "Cambio de clase aprobado" : "Cambio de clase rechazado",
      body: status === RescheduleStatus.ACCEPTED ? "Tu nuevo horario quedó confirmado." : "Conservamos tu horario original.",
      actionUrl: "/schedule",
    });
  }

  return NextResponse.json({ ok: true });
}
