import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { assertTeacherCanAccessStudent } from "@/lib/data/progress";
import { practiceAssignmentStatusSchema, upsertPracticeAssignmentSchema } from "@/lib/validators/progress";

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.TEACHER || !auth.user.teacherProfile) return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes permisos para asignar práctica." : "You do not have permission to assign practice." }, { status: 403 });

  const parsed = upsertPracticeAssignmentSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  const input = parsed.data;
  await assertTeacherCanAccessStudent(auth.user.teacherProfile.id, input.studentId);

  if (input.assignmentId) {
    const existing = await db.practiceAssignment.findFirst({ where: { id: input.assignmentId, studentId: input.studentId, teacherId: auth.user.teacherProfile.id } });
    if (!existing) return NextResponse.json({ error: auth.user.locale === "es" ? "Asignación no encontrada." : "Assignment not found." }, { status: 404 });
  }

  const createOrUpdate = {
    lessonNoteId: input.lessonNoteId,
    classSessionId: input.classSessionId,
    repertoireItemId: input.repertoireItemId,
    skillCategoryId: input.skillCategoryId,
    title: input.title,
    instructions: input.instructions,
    assignedDate: input.assignedDate ? new Date(input.assignedDate) : undefined,
    dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    status: input.status,
    expectedMinutes: input.expectedMinutes,
    requiresVideo: input.requiresVideo,
    teacherReviewNote: input.teacherReviewNote,
  };

  const assignment = input.assignmentId
    ? await db.practiceAssignment.update({ where: { id: input.assignmentId }, data: createOrUpdate })
    : await db.practiceAssignment.create({ data: { ...createOrUpdate, studentId: input.studentId, teacherId: auth.user.teacherProfile.id } });

  return NextResponse.json({ assignment });
}

export async function PATCH(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const parsed = practiceAssignmentStatusSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });

  const assignment = await db.practiceAssignment.findUnique({ where: { id: parsed.data.assignmentId } });
  if (!assignment) return NextResponse.json({ error: auth.user.locale === "es" ? "Asignación no encontrada." : "Assignment not found." }, { status: 404 });
  const canEdit = (auth.user.role === Role.STUDENT && auth.user.studentProfile?.id === assignment.studentId) || (auth.user.role === Role.TEACHER && auth.user.teacherProfile?.id === assignment.teacherId);
  if (!canEdit) return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes permisos para editar esta tarea." : "You cannot edit this assignment." }, { status: 403 });

  const updated = await db.practiceAssignment.update({ where: { id: assignment.id }, data: { status: parsed.data.status } });
  return NextResponse.json({ assignment: updated });
}
