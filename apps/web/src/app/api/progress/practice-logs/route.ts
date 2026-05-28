import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { validationErrorMessage } from "@/lib/validation-errors";
import { assertActiveSkillCategories, assertPracticeAssignmentForStudent, assertRepertoireForStudent, getProgressErrorResponse } from "@/lib/data/progress";
import { ParentAccessError, resolveStudentIdForStudentOrParent } from "@/lib/parents";
import { createPracticeLogSchema } from "@/lib/validators/progress";

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.STUDENT && auth.user.role !== Role.PARENT) return NextResponse.json({ error: auth.user.locale === "es" ? "Solo estudiantes o acudientes pueden registrar práctica." : "Only students or guardians can log practice." }, { status: 403 });

  const parsed = createPracticeLogSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: validationErrorMessage(parsed.error, auth.user.locale) }, { status: 400 });
  const input = parsed.data;
  let studentId: string;
  try {
    studentId = await resolveStudentIdForStudentOrParent(auth.user, input.studentId);
  } catch (error) {
    if (error instanceof ParentAccessError) return NextResponse.json({ error: auth.user.locale === "es" ? "No autorizado." : "Forbidden." }, { status: error.status });
    throw error;
  }

  try {
    await assertPracticeAssignmentForStudent(studentId, input.assignmentId);
    await assertRepertoireForStudent(studentId, input.repertoireItemId);
    await assertActiveSkillCategories([input.skillCategoryId]);
  } catch (error) {
    const progressError = getProgressErrorResponse(error, auth.user.locale);
    if (progressError) return NextResponse.json({ error: progressError.message }, { status: progressError.status });
    throw error;
  }

  const log = await db.practiceLog.create({ data: { studentId, assignmentId: input.assignmentId, repertoireItemId: input.repertoireItemId, skillCategoryId: input.skillCategoryId, practicedOn: new Date(input.practicedOn), minutesPracticed: input.minutesPracticed, notes: input.notes, moodRating: input.moodRating, difficultyRating: input.difficultyRating, parentNote: input.parentNote } });
  return NextResponse.json({ log });
}
