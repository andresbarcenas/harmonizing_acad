import { NextResponse } from "next/server";
import { NotificationType, RescheduleStatus, Role, SessionStatus } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { isSlotWithinAvailability, isTeacherBlackoutDate, isValidRescheduleDuration, overlapsRange } from "@/lib/scheduling";
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
    return NextResponse.json({ error: auth.user.locale === "es" ? "Horario propuesto inválido" : "Invalid proposed time." }, { status: 400 });
  }

  if (!isValidRescheduleDuration(proposedStartUtc, proposedEndUtc)) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "La duración permitida es entre 30 y 180 minutos." : "Allowed duration is between 30 and 180 minutes." }, { status: 400 });
  }

  const session = await db.classSession.findFirst({
    where: {
      id: payload.sessionId,
      studentId: auth.user.studentProfile.id,
      status: { in: [SessionStatus.SCHEDULED, SessionStatus.RESCHEDULE_PENDING] },
    },
  });

  if (!session) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Clase no encontrada" : "Class not found." }, { status: 404 });
  }

  const assignment = await db.teacherAssignment.findUnique({
    where: { studentId: auth.user.studentProfile.id },
    include: {
      teacher: {
        include: {
          user: true,
          availability: true,
          blackoutDates: true,
        },
      },
    },
  });

  if (!assignment || assignment.teacherId !== session.teacherId) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes una docente asignada para esta clase" : "You do not have an assigned teacher for this class." }, { status: 400 });
  }

  if (isTeacherBlackoutDate(proposedStartUtc, assignment.teacher.user.timezone, assignment.teacher.blackoutDates)) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "La docente marcó ese día como no disponible." : "The teacher marked that day as unavailable." }, { status: 409 });
  }

  if (!isSlotWithinAvailability(proposedStartUtc, proposedEndUtc, assignment.teacher.availability, assignment.teacher.user.timezone)) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "El horario propuesto no está dentro de la disponibilidad docente." : "The proposed time is outside teacher availability." }, { status: 409 });
  }

  const existingPending = await db.rescheduleRequest.findFirst({
    where: {
      sessionId: session.id,
      status: RescheduleStatus.PENDING,
    },
  });

  if (existingPending) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Ya existe una solicitud pendiente para esta clase." : "A pending request already exists for this class." }, { status: 409 });
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
    return NextResponse.json({ error: auth.user.locale === "es" ? "La docente ya tiene otra clase en ese horario." : "The teacher already has another class at that time." }, { status: 409 });
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
    title: "New reschedule request",
    body: "A student proposed a new time.",
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
    return NextResponse.json({ error: auth.user.locale === "es" ? "Payload inválido" : "Invalid payload." }, { status: 400 });
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
    return NextResponse.json({ error: auth.user.locale === "es" ? "Solicitud no encontrada" : "Request not found." }, { status: 404 });
  }

  if (!isValidRescheduleDuration(request.proposedStartUtc, request.proposedEndUtc)) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "La solicitud tiene una duración inválida." : "The request has an invalid duration." }, { status: 409 });
  }

  if (status === RescheduleStatus.ACCEPTED) {
    const availability = await db.teacherAvailability.findMany({
      where: { teacherId: request.session.teacherId },
    });

    const teacherUser = await db.teacherProfile.findUnique({
      where: { id: request.session.teacherId },
      include: { user: true, blackoutDates: true },
    });

    if (!teacherUser) {
      return NextResponse.json({ error: auth.user.locale === "es" ? "Docente no encontrada" : "Teacher not found." }, { status: 404 });
    }

    if (isTeacherBlackoutDate(request.proposedStartUtc, teacherUser.user.timezone, teacherUser.blackoutDates)) {
      return NextResponse.json({ error: auth.user.locale === "es" ? "La docente marcó ese día como no disponible." : "The teacher marked that day as unavailable." }, { status: 409 });
    }

    if (!isSlotWithinAvailability(request.proposedStartUtc, request.proposedEndUtc, availability, teacherUser.user.timezone)) {
      return NextResponse.json({ error: auth.user.locale === "es" ? "El horario propuesto ya no está disponible en agenda docente." : "The proposed time is no longer available." }, { status: 409 });
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
      return NextResponse.json({ error: auth.user.locale === "es" ? "La docente tiene una clase que se superpone con ese horario." : "The teacher has an overlapping class at that time." }, { status: 409 });
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
      title: status === RescheduleStatus.ACCEPTED ? "Class change approved" : "Class change rejected",
      body: status === RescheduleStatus.ACCEPTED ? "Your new time is confirmed." : "We kept your original time.",
      actionUrl: "/schedule",
    });
  }

  return NextResponse.json({ ok: true });
}
