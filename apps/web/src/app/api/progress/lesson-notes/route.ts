import { NextResponse } from "next/server";
import { NotificationType, Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { upsertLessonNoteSchema } from "@/lib/validators/progress";

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.TEACHER || !auth.user.teacherProfile) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes permisos para editar notas." : "You do not have permission to edit notes." }, { status: 403 });
  }

  const parsed = upsertLessonNoteSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });

  const input = parsed.data;
  const session = await db.classSession.findFirst({ where: { id: input.sessionId, teacherId: auth.user.teacherProfile.id }, include: { student: true } });
  if (!session) return NextResponse.json({ error: auth.user.locale === "es" ? "Clase no encontrada." : "Class not found." }, { status: 404 });

  const teacherProfileId = auth.user.teacherProfile.id;
  const note = await db.$transaction(async (tx) => {
    const lessonNote = await tx.lessonNote.upsert({
      where: { sessionId: session.id },
      update: {
        summary: input.summary,
        taughtToday: input.taughtToday,
        studentDidWell: input.studentDidWell,
        needsImprovement: input.needsImprovement,
        homework: input.homework,
        nextLessonFocus: input.nextLessonFocus,
        teacherPrivateNote: input.teacherPrivateNote,
        studentVisibleNote: input.studentVisibleNote,
        preparednessRating: input.preparednessRating,
        focusRating: input.focusRating,
        effortRating: input.effortRating,
        overallLessonRating: input.overallLessonRating,
      },
      create: {
        sessionId: session.id,
        studentId: session.studentId,
        teacherId: teacherProfileId,
        summary: input.summary,
        taughtToday: input.taughtToday,
        studentDidWell: input.studentDidWell,
        needsImprovement: input.needsImprovement,
        homework: input.homework,
        nextLessonFocus: input.nextLessonFocus,
        teacherPrivateNote: input.teacherPrivateNote,
        studentVisibleNote: input.studentVisibleNote,
        preparednessRating: input.preparednessRating,
        focusRating: input.focusRating,
        effortRating: input.effortRating,
        overallLessonRating: input.overallLessonRating,
      },
    });
    await tx.lessonSkillRating.deleteMany({ where: { lessonNoteId: lessonNote.id } });
    if (input.skillRatings.length) {
      await tx.lessonSkillRating.createMany({ data: input.skillRatings.map((rating) => ({ lessonNoteId: lessonNote.id, skillCategoryId: rating.skillCategoryId, rating: rating.rating, note: rating.note })) });
    }
    if (input.studentVisibleNote) await tx.classSession.update({ where: { id: session.id }, data: { lastClassNotes: input.studentVisibleNote } });
    return lessonNote;
  });

  await createNotification({
    userId: session.student.userId,
    type: NotificationType.CLASS_REMINDER,
    title: auth.user.locale === "es" ? "Nueva nota de clase" : "New lesson note",
    body: auth.user.locale === "es" ? "Tu docente actualizó tu progreso." : "Your teacher updated your progress.",
    actionUrl: "/progress",
  });

  return NextResponse.json({ note });
}
export const PATCH = POST;
