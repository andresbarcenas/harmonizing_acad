import { NextResponse } from "next/server";
import { NotificationType, RepertoireStatus, Role, SessionStatus } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { assertRepertoireForTeacherStudent, getProgressErrorResponse, inferLessonInstrument, skillInstrumentsForLesson } from "@/lib/data/progress";
import { createNotification } from "@/lib/notifications";
import { completeClassWorkflowSchema } from "@/lib/validators/progress";

type Params = { params: Promise<{ classId: string }> };

const copy = {
  es: {
    forbidden: "No tienes permisos para completar esta clase.",
    notFound: "Clase no encontrada o no asignada a esta docente.",
    invalid: "Revisa los campos del flujo antes de guardar.",
    completedTitle: "Clase completada",
    completedBody: "Tu docente agregó una nota de clase y nuevas indicaciones de práctica.",
    noShowTitle: "Clase marcada como ausencia",
    noShowBody: "Tu docente registró la ausencia. Contacta a la academia si necesitas apoyo.",
    cancelledTitle: "Clase cancelada",
    cancelledBody: "Tu docente actualizó el estado de una clase como cancelada.",
    rescheduleTitle: "Clase pendiente de reagendar",
    rescheduleBody: "Tu docente marcó una clase como pendiente de reagendar.",
  },
  en: {
    forbidden: "You do not have permission to complete this class.",
    notFound: "Class not found or not assigned to this teacher.",
    invalid: "Review the workflow fields before saving.",
    completedTitle: "Class completed",
    completedBody: "Your teacher added a lesson note and new practice guidance.",
    noShowTitle: "Class marked as absent",
    noShowBody: "Your teacher recorded the absence. Contact the academy if you need support.",
    cancelledTitle: "Class cancelled",
    cancelledBody: "Your teacher updated a class as cancelled.",
    rescheduleTitle: "Class needs rescheduling",
    rescheduleBody: "Your teacher marked a class as needing rescheduling.",
  },
} as const;

export async function POST(req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const locale = auth.user.locale === "es" ? "es" : "en";
  const c = copy[locale];

  if (auth.user.role !== Role.TEACHER || !auth.user.teacherProfile) {
    return NextResponse.json({ error: c.forbidden }, { status: 403 });
  }

  const { classId } = await params;
  const parsed = completeClassWorkflowSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? c.invalid }, { status: 400 });
  }

  const input = parsed.data;
  const teacherProfileId = auth.user.teacherProfile.id;
  const session = await db.classSession.findFirst({
    where: {
      id: classId,
      teacherId: teacherProfileId,
      student: { assignment: { teacherId: teacherProfileId } },
    },
    include: { student: { include: { user: true } }, lessonNote: true },
  });

  if (!session) {
    return NextResponse.json({ error: c.notFound }, { status: 404 });
  }

  try {
    const skillCategoryIds = [
      ...input.skillRatings.map((rating) => rating.skillCategoryId),
      ...input.assignments.map((assignment) => assignment.skillCategoryId),
    ].filter((id): id is string => Boolean(id));
    if (skillCategoryIds.length) {
      const allowedInstruments = skillInstrumentsForLesson(input.lessonInstrument ?? session.instrument ?? session.student.preferredInstrument);
      const validSkillCount = await db.skillCategory.count({
        where: {
          id: { in: Array.from(new Set(skillCategoryIds)) },
          active: true,
          instrument: { in: [...allowedInstruments] },
        },
      });
      if (validSkillCount !== new Set(skillCategoryIds).size) {
        return NextResponse.json(
          {
            error: auth.user.locale === "es"
              ? "Las habilidades seleccionadas no corresponden al tipo de clase."
              : "Selected skills do not match the class lesson type.",
          },
          { status: 400 },
        );
      }
    }

    const repertoireIds = new Set<string>();
    input.repertoireUpdates.forEach((item) => repertoireIds.add(item.repertoireItemId));
    input.assignments.forEach((assignment) => {
      if (assignment.repertoireItemId) repertoireIds.add(assignment.repertoireItemId);
    });

    for (const repertoireItemId of repertoireIds) {
      await assertRepertoireForTeacherStudent(teacherProfileId, session.studentId, repertoireItemId);
    }
  } catch (error) {
    const progressError = getProgressErrorResponse(error, auth.user.locale);
    if (progressError) return NextResponse.json({ error: progressError.message }, { status: progressError.status });
    throw error;
  }

  const now = new Date();
  const completed = input.status === SessionStatus.COMPLETED;
  const lessonNote = completed ? input.lessonNote : null;

  const result = await db.$transaction(async (tx) => {
    const updatedSession = await tx.classSession.update({
      where: { id: session.id },
      data: {
        status: input.status,
        completedAt: completed ? now : null,
        instrument: completed ? (input.lessonInstrument ?? inferLessonInstrument(session.instrument ?? session.student.preferredInstrument)) : session.instrument,
        lastClassNotes: completed ? (lessonNote?.studentVisibleNote || lessonNote?.summary || session.lastClassNotes) : session.lastClassNotes,
      },
    });

    let savedLessonNote = session.lessonNote;
    if (completed && lessonNote) {
      savedLessonNote = await tx.lessonNote.upsert({
        where: { sessionId: session.id },
        update: {
          summary: lessonNote.summary,
          taughtToday: lessonNote.taughtToday || null,
          studentDidWell: lessonNote.studentDidWell || null,
          needsImprovement: lessonNote.needsImprovement || null,
          homework: lessonNote.homework || null,
          nextLessonFocus: lessonNote.nextLessonFocus || null,
          teacherPrivateNote: lessonNote.teacherPrivateNote || null,
          studentVisibleNote: lessonNote.studentVisibleNote || null,
          preparednessRating: lessonNote.preparednessRating,
          focusRating: lessonNote.focusRating,
          effortRating: lessonNote.effortRating,
          overallLessonRating: lessonNote.overallLessonRating,
        },
        create: {
          sessionId: session.id,
          studentId: session.studentId,
          teacherId: teacherProfileId,
          summary: lessonNote.summary,
          taughtToday: lessonNote.taughtToday || null,
          studentDidWell: lessonNote.studentDidWell || null,
          needsImprovement: lessonNote.needsImprovement || null,
          homework: lessonNote.homework || null,
          nextLessonFocus: lessonNote.nextLessonFocus || null,
          teacherPrivateNote: lessonNote.teacherPrivateNote || null,
          studentVisibleNote: lessonNote.studentVisibleNote || null,
          preparednessRating: lessonNote.preparednessRating,
          focusRating: lessonNote.focusRating,
          effortRating: lessonNote.effortRating,
          overallLessonRating: lessonNote.overallLessonRating,
        },
      });

      await tx.lessonSkillRating.deleteMany({ where: { lessonNoteId: savedLessonNote.id } });
      if (input.skillRatings.length) {
        await tx.lessonSkillRating.createMany({
          data: input.skillRatings.map((rating) => ({
            lessonNoteId: savedLessonNote!.id,
            skillCategoryId: rating.skillCategoryId,
            rating: rating.rating,
            note: rating.note,
          })),
        });
      }

      for (const item of input.repertoireUpdates) {
        await tx.repertoireItem.update({
          where: { id: item.repertoireItemId },
          data: {
            status: item.status,
            masteryPercent: item.masteryPercent,
            currentFocusSection: item.currentFocusSection,
            currentTempo: item.currentTempo,
            targetTempo: item.targetTempo,
            teacherNotes: item.teacherNotes,
            studentVisibleNotes: item.studentVisibleNotes,
            completedDate: item.completedDate ? new Date(item.completedDate) : item.status === RepertoireStatus.COMPLETED ? now : undefined,
          },
        });
      }

      const createdRepertoire = [];
      for (const item of input.newRepertoireItems) {
        createdRepertoire.push(await tx.repertoireItem.create({
          data: {
            studentId: session.studentId,
            teacherId: teacherProfileId,
            title: item.title,
            composerOrArtist: item.composerOrArtist,
            instrument: item.instrument,
            level: item.level,
            status: item.status,
            startDate: now,
            masteryPercent: item.masteryPercent,
            currentFocusSection: item.currentFocusSection,
            currentTempo: item.currentTempo,
            targetTempo: item.targetTempo,
            teacherNotes: item.teacherNotes,
            studentVisibleNotes: item.studentVisibleNotes,
          },
        }));
      }

      const createdAssignments = [];
      if (completed && savedLessonNote) {
        for (const assignment of input.assignments) {
          createdAssignments.push(await tx.practiceAssignment.create({
            data: {
              studentId: session.studentId,
              teacherId: teacherProfileId,
              lessonNoteId: savedLessonNote.id,
              classSessionId: session.id,
              repertoireItemId: assignment.repertoireItemId,
              skillCategoryId: assignment.skillCategoryId,
              title: assignment.title,
              instructions: assignment.instructions,
              dueDate: assignment.dueDate ? new Date(assignment.dueDate) : undefined,
              expectedMinutes: assignment.expectedMinutes,
              requiresVideo: assignment.requiresVideo,
            },
          }));
        }
      }

      return { session: updatedSession, lessonNote: savedLessonNote, createdAssignments, createdRepertoire };
    }
  });

  if (input.notifyStudent) {
    const notificationCopy = notificationForStatus(input.status, c);
    await createNotification({
      userId: session.student.userId,
      type: NotificationType.CLASS_REMINDER,
      title: notificationCopy.title,
      body: notificationCopy.body,
      actionUrl: completed ? "/progress" : "/schedule",
    });
  }

  return NextResponse.json({ ok: true, ...result });
}

function notificationForStatus(status: SessionStatus, c: typeof copy.es | typeof copy.en) {
  if (status === SessionStatus.NO_SHOW) return { title: c.noShowTitle, body: c.noShowBody };
  if (status === SessionStatus.CANCELLED) return { title: c.cancelledTitle, body: c.cancelledBody };
  if (status === SessionStatus.RESCHEDULE_PENDING) return { title: c.rescheduleTitle, body: c.rescheduleBody };
  return { title: c.completedTitle, body: c.completedBody };
}
