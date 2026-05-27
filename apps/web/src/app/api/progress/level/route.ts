import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { updateStudentLevelSchema } from "@/lib/validators/progress";

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.ADMIN && auth.user.role !== Role.TEACHER) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes permisos para actualizar el nivel." : "You do not have permission to update the level." }, { status: 403 });
  }

  const parsed = updateStudentLevelSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const input = parsed.data;
  const student = await db.studentProfile.findUnique({
    where: { id: input.studentId },
    select: {
      id: true,
      assignment: { select: { teacherId: true } },
    },
  });

  if (!student) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Estudiante no encontrado." : "Student not found." }, { status: 404 });
  }

  if (auth.user.role === Role.TEACHER && auth.user.teacherProfile?.id !== student.assignment?.teacherId) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "El estudiante no está asignado a esta docente." : "The student is not assigned to this teacher." }, { status: 403 });
  }

  const record = await db.progressRecord.create({
    data: {
      studentId: input.studentId,
      level: input.level,
      summary: input.summary ?? (auth.user.locale === "es" ? "Nivel actualizado manualmente." : "Level updated manually."),
      updatedByUserId: auth.user.id,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ record });
}
