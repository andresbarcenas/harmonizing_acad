import { NextResponse } from "next/server";
import { ClassRequestStatus, NotificationType, Role, SessionStatus } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { createNotifications } from "@/lib/notifications";
import { validateClassBookingWindow } from "@/lib/scheduling";
import { reviewClassRequestSchema } from "@/lib/validators/class-scheduling";

type Params = { params: Promise<{ requestId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.ADMIN && auth.user.role !== Role.TEACHER) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes permisos para revisar solicitudes." : "You do not have permission to review requests." }, { status: 403 });
  }

  const { requestId } = await params;
  const parsed = reviewClassRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const request = await db.classRequest.findFirst({
    where: {
      id: requestId,
      ...(auth.user.role === Role.TEACHER ? { teacherId: auth.user.teacherProfile?.id } : {}),
    },
    include: {
      student: { include: { user: true } },
      teacher: { include: { user: true } },
      createdSession: true,
    },
  });

  if (!request) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Solicitud no encontrada." : "Request not found." }, { status: 404 });
  }

  if (request.status !== ClassRequestStatus.PENDING) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "La solicitud ya fue revisada." : "This request was already reviewed." }, { status: 409 });
  }

  const input = parsed.data;
  if (input.status === ClassRequestStatus.REJECTED && !input.rejectionReason) {
    return NextResponse.json(
      {
        error: auth.user.locale === "es"
          ? "Agrega un motivo de rechazo visible para el estudiante."
          : "Add a student-visible rejection reason.",
      },
      { status: 400 },
    );
  }
  let createdSessionId: string | null = null;

  if (input.status === ClassRequestStatus.ACCEPTED) {
    const validation = await validateClassBookingWindow({
      teacherId: request.teacherId,
      studentId: request.studentId,
      startsAtUtc: request.preferredStartUtc,
      endsAtUtc: request.preferredEndUtc,
      durationMin: request.durationMin,
      timezone: request.timezone,
      locale: auth.user.locale,
    });

    if (!validation.ok) {
      return NextResponse.json({ error: validation.message, code: validation.code }, { status: validation.status });
    }
  }

  await db.$transaction(async (tx) => {
    await tx.classRequest.update({
      where: { id: request.id },
      data: {
        status: input.status,
        reviewerResponse: input.reviewerResponse,
        rejectionReason: input.status === ClassRequestStatus.REJECTED ? input.rejectionReason : null,
        internalNote: input.internalNote,
        reviewedByUserId: auth.user.id,
        decidedAt: new Date(),
      },
    });

    if (input.status === ClassRequestStatus.ACCEPTED) {
      const session = await tx.classSession.create({
        data: {
          studentId: request.studentId,
          teacherId: request.teacherId,
          classRequestId: request.id,
          type: request.type,
          startsAtUtc: request.preferredStartUtc,
          endsAtUtc: request.preferredEndUtc,
          timezone: request.timezone,
          instrument: request.student.preferredInstrument,
          locationMode: "ONLINE",
          meetingUrl: request.teacher.zoomLink ?? request.teacher.meetLink ?? "https://meet.google.com/harmonizing-class",
          status: SessionStatus.SCHEDULED,
          lessonFocus: input.reviewerResponse ?? request.studentMessage,
          studentVisibleNote: input.reviewerResponse,
        },
        select: { id: true },
      });
      createdSessionId = session.id;
    }
  });

  const isAccepted = input.status === ClassRequestStatus.ACCEPTED;
  const isSpanish = auth.user.locale === "es";
  await createNotifications([
    {
      userId: request.student.userId,
      type: NotificationType.CLASS_REMINDER,
      title: isAccepted
        ? isSpanish ? "Solicitud de clase aprobada" : "Class request approved"
        : isSpanish ? "Solicitud de clase rechazada" : "Class request rejected",
      body: isAccepted
        ? isSpanish ? "Tu nueva clase quedó confirmada." : "Your new class is confirmed."
        : input.rejectionReason ?? (isSpanish ? "Tu docente mantuvo la agenda actual." : "Your teacher kept the current schedule."),
      actionUrl: createdSessionId ? `/classes/${createdSessionId}` : "/schedule",
    },
    ...(auth.user.id !== request.teacher.userId && isAccepted
      ? [{
          userId: request.teacher.userId,
          type: NotificationType.CLASS_REMINDER,
          title: isSpanish ? "Clase aprobada en agenda" : "Class approved on schedule",
          body: isSpanish ? `Clase confirmada con ${request.student.user.name}.` : `Class confirmed with ${request.student.user.name}.`,
          actionUrl: createdSessionId ? `/classes/${createdSessionId}` : "/teacher/schedule",
        }]
      : []),
  ]);

  return NextResponse.json({ ok: true, sessionId: createdSessionId });
}
