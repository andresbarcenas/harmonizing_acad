import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { assertRepertoireForTeacherStudent, assertTeacherCanAccessStudent, getProgressErrorResponse } from "@/lib/data/progress";
import { upsertRepertoireSchema } from "@/lib/validators/progress";

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.TEACHER || !auth.user.teacherProfile) return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes permisos para editar repertorio." : "You do not have permission to edit repertoire." }, { status: 403 });

  const parsed = upsertRepertoireSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  const input = parsed.data;
  try {
    await assertTeacherCanAccessStudent(auth.user.teacherProfile.id, input.studentId);
    await assertRepertoireForTeacherStudent(auth.user.teacherProfile.id, input.studentId, input.repertoireItemId);
  } catch (error) {
    const progressError = getProgressErrorResponse(error, auth.user.locale);
    if (progressError) return NextResponse.json({ error: progressError.message }, { status: progressError.status });
    throw error;
  }

  const createOrUpdate = {
    title: input.title,
    composerOrArtist: input.composerOrArtist,
    instrument: input.instrument,
    level: input.level,
    status: input.status,
    startDate: input.startDate ? new Date(input.startDate) : undefined,
    targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
    completedDate: input.completedDate ? new Date(input.completedDate) : undefined,
    masteryPercent: input.masteryPercent,
    currentFocusSection: input.currentFocusSection,
    currentTempo: input.currentTempo,
    targetTempo: input.targetTempo,
    teacherNotes: input.teacherNotes,
    studentVisibleNotes: input.studentVisibleNotes,
  };

  const item = input.repertoireItemId
    ? await db.repertoireItem.update({ where: { id: input.repertoireItemId }, data: createOrUpdate })
    : await db.repertoireItem.create({ data: { ...createOrUpdate, studentId: input.studentId, teacherId: auth.user.teacherProfile.id } });

  return NextResponse.json({ item });
}
export const PATCH = POST;
