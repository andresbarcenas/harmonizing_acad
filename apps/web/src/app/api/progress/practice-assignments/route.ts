import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  assertActiveSkillCategories,
  assertClassSessionForTeacherStudent,
  assertLessonNoteForTeacherStudent,
  assertPracticeAssignmentForTeacherStudent,
  assertRepertoireForTeacherStudent,
  assertTeacherCanAccessStudent,
  getProgressErrorResponse,
} from "@/lib/data/progress";
import { practiceAssignmentStatusSchema, upsertPracticeAssignmentSchema } from "@/lib/validators/progress";

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.TEACHER || !auth.user.teacherProfile) return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes permisos para asignar práctica." : "You do not have permission to assign practice." }, { status: 403 });

  const parsed = upsertPracticeAssignmentSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  const input = parsed.data;
  try {
    await assertTeacherCanAccessStudent(auth.user.teacherProfile.id, input.studentId);
    await assertPracticeAssignmentForTeacherStudent(auth.user.teacherProfile.id, input.studentId, input.assignmentId);
    await assertClassSessionForTeacherStudent(auth.user.teacherProfile.id, input.studentId, input.classSessionId);
    await assertLessonNoteForTeacherStudent(auth.user.teacherProfile.id, input.studentId, input.lessonNoteId);
    await assertRepertoireForTeacherStudent(auth.user.teacherProfile.id, input.studentId, input.repertoireItemId);
    await assertActiveSkillCategories([input.skillCategoryId]);
  } catch (error) {
    const progressError = getProgressErrorResponse(error, auth.user.locale);
    if (progressError) return NextResponse.json({ error: progressError.message }, { status: progressError.status });
    throw error;
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
