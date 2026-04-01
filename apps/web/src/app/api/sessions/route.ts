import { NextResponse } from "next/server";
import { Role, SessionStatus } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function PATCH(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.TEACHER || !auth.user.teacherProfile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { sessionId, status, notes } = (await req.json()) as {
    sessionId: string;
    status: "COMPLETED" | "NO_SHOW";
    notes?: string;
  };

  if (!sessionId || ![SessionStatus.COMPLETED, SessionStatus.NO_SHOW].includes(status)) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const session = await db.classSession.findFirst({
    where: {
      id: sessionId,
      teacherId: auth.user.teacherProfile.id,
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 });
  }

  await db.classSession.update({
    where: { id: session.id },
    data: {
      status,
      lastClassNotes: notes,
    },
  });

  const student = await db.studentProfile.findUnique({
    where: { id: session.studentId },
    select: { userId: true },
  });

  if (student) {
    await db.notification.create({
      data: {
        userId: student.userId,
        type: "CLASS_REMINDER",
        title: status === SessionStatus.COMPLETED ? "Clase completada" : "Clase marcada como no asistida",
        body: status === SessionStatus.COMPLETED ? "Tu profesora registró notas de progreso." : "Comunícate con tu profesora para reprogramar.",
        actionUrl: "/dashboard",
      },
    });
  }

  return NextResponse.json({ ok: true });
}
