import "server-only";

import { ClassSessionType, RepertoireStatus, Role, SessionStatus, StudentExamArea } from "@prisma/client";
import type { Prisma, PrismaClient } from "@prisma/client";

import { db } from "@/lib/db";
import { assignCatalogItemToStudent } from "@/lib/data/repertoire-catalog";
import { normalizeInstrument } from "@/lib/instruments";
import { syncClassSessionCreditConsumption } from "@/lib/native-invoices/ledger";
import type { ExamAssessmentInput } from "@/lib/validators/exam-assessments";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

type ExamActor = {
  id: string;
  role: Role;
  locale?: string | null;
  teacherProfile?: { id: string } | null;
};

export type StudentExamAssessmentWithScores = Prisma.StudentExamAssessmentGetPayload<{
  include: typeof examAssessmentInclude;
}>;

export const examAssessmentInclude = {
  student: { include: { user: true } },
  teacher: { include: { user: true } },
  classSession: true,
  publishedBy: true,
  repertoireScores: { include: { repertoireItem: true }, orderBy: { sortOrder: "asc" } },
  areaScores: { orderBy: [{ area: "asc" }, { sortOrder: "asc" }] },
} satisfies Prisma.StudentExamAssessmentInclude;

export class ExamAssessmentError extends Error {
  constructor(
    public code:
      | "FORBIDDEN"
      | "STUDENT_NOT_FOUND"
      | "TEACHER_REQUIRED"
      | "TEACHER_NOT_FOUND"
      | "CLASS_NOT_FOUND"
      | "CLASS_STUDENT_MISMATCH"
      | "EVALUATION_ONLY"
      | "PIANO_ONLY"
      | "ASSESSMENT_NOT_FOUND"
      | "REPERTOIRE_NOT_FOUND"
      | "ALREADY_PUBLISHED",
    public status = 400,
  ) {
    super(code);
    this.name = "ExamAssessmentError";
  }
}

export function getExamAssessmentErrorMessage(error: unknown, locale = "en") {
  if (!(error instanceof ExamAssessmentError)) return null;
  const es = locale === "es";
  const messages: Record<ExamAssessmentError["code"], string> = {
    FORBIDDEN: es ? "No tienes permisos para gestionar evaluaciones." : "You do not have permission to manage exam assessments.",
    STUDENT_NOT_FOUND: es ? "Estudiante no encontrado." : "Student not found.",
    TEACHER_REQUIRED: es ? "Selecciona una docente para esta evaluación." : "Select a teacher for this assessment.",
    TEACHER_NOT_FOUND: es ? "Docente no encontrada." : "Teacher not found.",
    CLASS_NOT_FOUND: es ? "Clase de evaluación no encontrada." : "Evaluation class not found.",
    CLASS_STUDENT_MISMATCH: es ? "La clase no pertenece a este estudiante." : "The class does not belong to this student.",
    EVALUATION_ONLY: es ? "Solo las clases de evaluación usan este flujo." : "Only evaluation classes use this workflow.",
    PIANO_ONLY: es ? "Las evaluaciones están disponibles solo para Piano en esta versión." : "Exam assessments are available for Piano only in this version.",
    ASSESSMENT_NOT_FOUND: es ? "Evaluación no encontrada." : "Exam assessment not found.",
    REPERTOIRE_NOT_FOUND: es ? "Una canción seleccionada no pertenece al estudiante." : "A selected repertoire item does not belong to the student.",
    ALREADY_PUBLISHED: es ? "No puedes editar una evaluación publicada. Despublícala primero." : "You cannot edit a published assessment. Unpublish it first.",
  };
  return { status: error.status, message: messages[error.code] };
}

export async function saveStudentExamAssessment(input: ExamAssessmentInput, actor: ExamActor, assessmentId?: string) {
  if (actor.role !== Role.ADMIN && actor.role !== Role.TEACHER) {
    throw new ExamAssessmentError("FORBIDDEN", 403);
  }

  const student = await db.studentProfile.findUnique({
    where: { id: input.studentId },
    include: { assignment: true },
  });
  if (!student) throw new ExamAssessmentError("STUDENT_NOT_FOUND", 404);

  let classSession: Awaited<ReturnType<typeof db.classSession.findUnique>> = null;
  if (input.classSessionId) {
    classSession = await db.classSession.findUnique({ where: { id: input.classSessionId } });
    if (!classSession) throw new ExamAssessmentError("CLASS_NOT_FOUND", 404);
    if (classSession.studentId !== input.studentId) throw new ExamAssessmentError("CLASS_STUDENT_MISMATCH", 400);
    if (classSession.type !== ClassSessionType.EVALUATION) throw new ExamAssessmentError("EVALUATION_ONLY", 400);
  }

  const inferredInstrument = normalizeInstrument(classSession?.instrument ?? student.preferredInstrument) ?? "Piano";
  if (inferredInstrument !== "Piano") throw new ExamAssessmentError("PIANO_ONLY", 400);

  const teacherId = classSession?.teacherId ?? (actor.role === Role.TEACHER ? actor.teacherProfile?.id : input.teacherId ?? student.assignment?.teacherId);
  if (!teacherId) throw new ExamAssessmentError("TEACHER_REQUIRED", 400);

  if (actor.role === Role.TEACHER) {
    if (!actor.teacherProfile?.id || teacherId !== actor.teacherProfile.id) throw new ExamAssessmentError("FORBIDDEN", 403);
    const assignment = await db.teacherAssignment.findFirst({ where: { teacherId, studentId: input.studentId }, select: { id: true } });
    if (!assignment) throw new ExamAssessmentError("FORBIDDEN", 403);
  }

  const teacher = await db.teacherProfile.findUnique({ where: { id: teacherId }, select: { id: true } });
  if (!teacher) throw new ExamAssessmentError("TEACHER_NOT_FOUND", 404);

  const existingAssessment = assessmentId
    ? await db.studentExamAssessment.findUnique({ where: { id: assessmentId } })
    : input.classSessionId
      ? await db.studentExamAssessment.findUnique({ where: { classSessionId: input.classSessionId } })
      : null;

  if (assessmentId && !existingAssessment) throw new ExamAssessmentError("ASSESSMENT_NOT_FOUND", 404);
  if (existingAssessment && actor.role === Role.TEACHER && existingAssessment.teacherId !== actor.teacherProfile?.id) {
    throw new ExamAssessmentError("FORBIDDEN", 403);
  }
  if (existingAssessment?.publishedAt) throw new ExamAssessmentError("ALREADY_PUBLISHED", 409);

  const examDate = new Date(input.examDate);
  const assessment = await db.$transaction(async (tx) => {
    const savedAssessment = existingAssessment
      ? await tx.studentExamAssessment.update({
          where: { id: existingAssessment.id },
          data: {
            studentId: input.studentId,
            teacherId,
            classSessionId: input.classSessionId ?? null,
            examDate,
            title: input.title,
            instrument: "Piano",
            notes: input.notes,
          },
        })
      : await tx.studentExamAssessment.create({
          data: {
            studentId: input.studentId,
            teacherId,
            classSessionId: input.classSessionId ?? null,
            examDate,
            title: input.title,
            instrument: "Piano",
            notes: input.notes,
          },
        });

    await tx.studentExamRepertoireScore.deleteMany({ where: { assessmentId: savedAssessment.id } });
    await tx.studentExamAreaScore.deleteMany({ where: { assessmentId: savedAssessment.id } });

    for (const [index, row] of input.repertoireScores.entries()) {
      const repertoireItem = await upsertExamRepertoireItem(tx, {
        studentId: input.studentId,
        teacherId,
        row,
        examDate,
      });

      await tx.studentExamRepertoireScore.create({
        data: {
          assessmentId: savedAssessment.id,
          repertoireItemId: repertoireItem.id,
          titleSnapshot: repertoireItem.title,
          composerSnapshot: repertoireItem.composerOrArtist,
          interpretationScore: row.interpretationScore,
          executionScore: row.executionScore,
          overallScore: row.overallScore,
          comments: row.comments,
          sortOrder: index,
        },
      });
    }

    await createAreaScores(tx, savedAssessment.id, StudentExamArea.HARMONY, input.harmonyScores);
    await createAreaScores(tx, savedAssessment.id, StudentExamArea.MUSIC_READING, input.musicReadingScores);

    if (input.classSessionId) {
      await tx.classSession.update({
        where: { id: input.classSessionId },
        data: {
          status: SessionStatus.COMPLETED,
          completedAt: new Date(),
          instrument: "Piano",
          lastClassNotes: input.notes ?? input.title,
        },
      });
      await syncClassSessionCreditConsumption(input.classSessionId, actor.id, tx);
    }

    return tx.studentExamAssessment.findUniqueOrThrow({ where: { id: savedAssessment.id }, include: examAssessmentInclude });
  });

  return assessment;
}

export async function setStudentExamAssessmentPublication(assessmentId: string, actor: ExamActor, published: boolean) {
  if (actor.role !== Role.ADMIN && actor.role !== Role.TEACHER) {
    throw new ExamAssessmentError("FORBIDDEN", 403);
  }

  const assessment = await db.studentExamAssessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, studentId: true, teacherId: true },
  });
  if (!assessment) throw new ExamAssessmentError("ASSESSMENT_NOT_FOUND", 404);

  if (actor.role === Role.TEACHER) {
    if (!actor.teacherProfile?.id || assessment.teacherId !== actor.teacherProfile.id) throw new ExamAssessmentError("FORBIDDEN", 403);
    const assignment = await db.teacherAssignment.findFirst({
      where: { teacherId: actor.teacherProfile.id, studentId: assessment.studentId },
      select: { id: true },
    });
    if (!assignment) throw new ExamAssessmentError("FORBIDDEN", 403);
  }

  return db.studentExamAssessment.update({
    where: { id: assessmentId },
    data: published
      ? { publishedAt: new Date(), publishedByUserId: actor.id }
      : { publishedAt: null, publishedByUserId: null },
    include: examAssessmentInclude,
  });
}

type ExamRepertoireRow = ExamAssessmentInput["repertoireScores"][number];

async function upsertExamRepertoireItem(
  tx: TxClient,
  input: { studentId: string; teacherId: string; row: ExamRepertoireRow; examDate: Date },
) {
  const masteryPercent = Math.max(0, Math.min(100, Math.round(input.row.overallScore * 10)));
  const status = input.row.status ?? RepertoireStatus.PERFORMANCE_READY;
  const completedDate = status === RepertoireStatus.COMPLETED ? input.examDate : undefined;

  if (input.row.repertoireItemId) {
    const existing = await tx.repertoireItem.findFirst({ where: { id: input.row.repertoireItemId, studentId: input.studentId } });
    if (!existing) throw new ExamAssessmentError("REPERTOIRE_NOT_FOUND", 404);
    return tx.repertoireItem.update({
      where: { id: existing.id },
      data: {
        teacherId: existing.teacherId ?? input.teacherId,
        status,
        masteryPercent,
        instrument: "Piano",
        completedDate,
      },
    });
  }

  if (input.row.catalogItemId) {
    const assigned = await assignCatalogItemToStudent({
      catalogItemId: input.row.catalogItemId,
      studentId: input.studentId,
      teacherId: input.teacherId,
      values: { status, masteryPercent },
      tx,
    });
    return tx.repertoireItem.update({
      where: { id: assigned.id },
      data: {
        status,
        masteryPercent,
        instrument: "Piano",
        completedDate,
      },
    });
  }

  return tx.repertoireItem.create({
    data: {
      studentId: input.studentId,
      teacherId: input.teacherId,
      title: input.row.title!,
      composerOrArtist: input.row.composerOrArtist,
      instrument: "Piano",
      status,
      startDate: input.examDate,
      completedDate,
      masteryPercent,
    },
  });
}

async function createAreaScores(
  tx: TxClient,
  assessmentId: string,
  area: StudentExamArea,
  rows: ExamAssessmentInput["harmonyScores"],
) {
  if (!rows.length) return;
  await tx.studentExamAreaScore.createMany({
    data: rows.map((row, index) => ({
      assessmentId,
      area,
      topic: row.topic,
      objective: row.objective,
      score: row.score,
      comments: row.comments,
      sortOrder: index,
    })),
  });
}
