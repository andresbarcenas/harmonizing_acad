import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { assertActiveSkillCategories, assertPracticeAssignmentForStudent, assertRepertoireForStudent, getProgressErrorResponse } from "@/lib/data/progress";
import { createPracticeLogSchema } from "@/lib/validators/progress";

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.STUDENT || !auth.user.studentProfile) return NextResponse.json({ error: auth.user.locale === "es" ? "Solo estudiantes pueden registrar práctica." : "Only students can log practice." }, { status: 403 });

  const parsed = createPracticeLogSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  const input = parsed.data;

  try {
    await assertPracticeAssignmentForStudent(auth.user.studentProfile.id, input.assignmentId);
    await assertRepertoireForStudent(auth.user.studentProfile.id, input.repertoireItemId);
    await assertActiveSkillCategories([input.skillCategoryId]);
  } catch (error) {
    const progressError = getProgressErrorResponse(error, auth.user.locale);
    if (progressError) return NextResponse.json({ error: progressError.message }, { status: progressError.status });
    throw error;
  }

  const log = await db.practiceLog.create({ data: { studentId: auth.user.studentProfile.id, assignmentId: input.assignmentId, repertoireItemId: input.repertoireItemId, skillCategoryId: input.skillCategoryId, practicedOn: new Date(input.practicedOn), minutesPracticed: input.minutesPracticed, notes: input.notes, moodRating: input.moodRating, difficultyRating: input.difficultyRating, parentNote: input.parentNote } });
  return NextResponse.json({ log });
}
