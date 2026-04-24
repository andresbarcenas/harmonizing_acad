import { NextResponse } from "next/server";
import { NotificationType, Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { reassignTeacherSchema } from "@/lib/validators/admin";

export async function PATCH(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = reassignTeacherSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { studentId, teacherId } = parsed.data;

  const [student, teacher] = await Promise.all([
    db.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: true },
    }),
    db.teacherProfile.findUnique({
      where: { id: teacherId },
      include: { user: true },
    }),
  ]);

  if (!student || !teacher) {
    return NextResponse.json({ error: "Estudiante o docente no encontrado" }, { status: 404 });
  }

  const assignment = await db.teacherAssignment.upsert({
    where: { studentId },
    update: {
      teacherId,
      assignedBy: auth.user.id,
      assignedAt: new Date(),
    },
    create: {
      studentId,
      teacherId,
      assignedBy: auth.user.id,
    },
  });

  await createNotification({
    userId: student.userId,
    type: NotificationType.SYSTEM,
    title: "Asignación docente actualizada",
    body: `Tu docente asignada ahora es ${teacher.user.name}.`,
    actionUrl: "/dashboard",
  });

  return NextResponse.json({ assignment });
}

