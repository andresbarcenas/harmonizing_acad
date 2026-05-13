import "server-only";

import {
  HistoricalImportBatchStatus,
  HistoricalImportRowStatus,
  HistoricalImportSuggestionType,
  LogEntryType,
  PracticeAssignmentStatus,
  ProgressReportStatus,
  RepertoireStatus,
} from "@prisma/client";

import { db } from "@/lib/db";

type HistoricalPayload = {
  title?: string;
  songs?: string[];
  notes?: string;
  instructions?: string;
  extractedDate?: string | null;
  gradePercentage?: number | null;
  gradeLetter?: string | null;
  reportSummary?: string;
  skillHints?: string[];
};

export async function applyHistoricalImportRow(rowId: string, reviewerUserId: string) {
  const row = await db.historicalImportRow.findUnique({
    where: { id: rowId },
    include: {
      batch: {
        include: {
          student: {
            include: {
              user: true,
              assignment: { include: { teacher: { include: { user: true } } } },
            },
          },
        },
      },
    },
  });

  if (!row) throw new Error("No encontramos esta fila de importación.");
  if (row.status === HistoricalImportRowStatus.APPLIED || row.status === HistoricalImportRowStatus.SOURCE_ONLY) return row;

  const payload = (row.suggestedPayload ?? {}) as HistoricalPayload;
  const metadata = {
    source: "historical-pdf-import",
    batchId: row.batchId,
    rowId: row.id,
    sourceFilename: row.batch.sourceFilename,
    sourcePage: row.sourcePage,
    confidence: row.confidence,
    suggestedType: row.suggestedType,
    rawText: row.rawText,
  };

  try {
    const applied = await db.$transaction(async (tx) => {
      if (row.suggestedType === HistoricalImportSuggestionType.SOURCE_ONLY) {
        return tx.historicalImportRow.update({
          where: { id: row.id },
          data: {
            status: HistoricalImportRowStatus.SOURCE_ONLY,
            appliedEntityType: "SOURCE_ONLY",
            appliedEntityId: null,
            reviewedByUserId: reviewerUserId,
            reviewedAt: new Date(),
            appliedAt: new Date(),
            errorMessage: null,
          },
        });
      }

      const teacherId = row.batch.student.assignment?.teacherId ?? null;
      const suggestedType = row.suggestedType;
      const appliedIds: string[] = [];
      let appliedEntityType = "StudentLogEntry";

      if (suggestedType === HistoricalImportSuggestionType.REPERTOIRE && payload.songs?.length) {
        appliedEntityType = "RepertoireItem";
        for (const song of payload.songs) {
          const existing = await tx.repertoireItem.findFirst({
            where: { studentId: row.studentId, title: { equals: song, mode: "insensitive" } },
          });
          const item = existing ?? await tx.repertoireItem.create({
            data: {
              studentId: row.studentId,
              teacherId,
              title: song,
              instrument: "Piano",
              status: RepertoireStatus.LEARNING,
              masteryPercent: 0,
              teacherNotes: `Importado desde ${row.batch.sourceFilename}, página ${row.sourcePage}.`,
              studentVisibleNotes: payload.notes ?? row.rawText ?? "Repertorio histórico importado.",
            },
          });
          appliedIds.push(item.id);
        }
      } else if (suggestedType === HistoricalImportSuggestionType.PRACTICE_ASSIGNMENT && teacherId) {
        appliedEntityType = "PracticeAssignment";
        const assignment = await tx.practiceAssignment.create({
          data: {
            studentId: row.studentId,
            teacherId,
            title: payload.title ?? `Tarea histórica página ${row.sourcePage}`,
            instructions: payload.instructions ?? row.rawText ?? "Tarea histórica importada.",
            status: PracticeAssignmentStatus.REVIEWED,
            requiresVideo: false,
            teacherReviewNote: "Importado como tarea histórica; no es una tarea pendiente.",
          },
        });
        appliedIds.push(assignment.id);
      } else if (suggestedType === HistoricalImportSuggestionType.PROGRESS_REPORT) {
        appliedEntityType = "ProgressReport";
        const reportDate = payload.extractedDate ? new Date(payload.extractedDate) : new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1, 12, 0, 0, 0));
        const rangeStart = new Date(Date.UTC(reportDate.getUTCFullYear(), reportDate.getUTCMonth(), reportDate.getUTCDate(), 0, 0, 0, 0));
        const rangeEnd = new Date(Date.UTC(reportDate.getUTCFullYear(), reportDate.getUTCMonth(), reportDate.getUTCDate(), 23, 59, 59, 999));
        const reportKey = `historical:${row.studentId}:${row.batch.sourceSha256}:page:${row.sourcePage}`;
        const gradePercentage = typeof payload.gradePercentage === "number" ? payload.gradePercentage : null;
        const report = await tx.progressReport.upsert({
          where: { reportKey },
          update: {
            gradePercentage,
            gradeLetter: payload.gradeLetter ?? null,
            teacherSummary: payload.reportSummary ?? row.rawText,
            studentVisibleSummary: payload.reportSummary ?? row.rawText,
            repertoireSummary: { songs: payload.songs ?? [] },
            repertoireProgressSummary: { songs: payload.songs ?? [] },
            skillSummary: { sourcePage: row.sourcePage, imported: true },
          },
          create: {
            reportKey,
            studentId: row.studentId,
            teacherId,
            generatedByUserId: reviewerUserId,
            publishedByUserId: reviewerUserId,
            startDate: rangeStart,
            endDate: rangeEnd,
            status: ProgressReportStatus.PUBLISHED,
            publishedAt: new Date(),
            gradePercentage,
            gradeLetter: payload.gradeLetter ?? null,
            averageSkillRatings: {},
            categoryScores: {},
            skillSummary: { sourcePage: row.sourcePage, imported: true },
            attendanceSummary: { importedHistorical: true, sourcePage: row.sourcePage },
            practiceSummary: {},
            videoSummary: {},
            repertoireSummary: { songs: payload.songs ?? [] },
            repertoireProgressSummary: { songs: payload.songs ?? [] },
            teacherSummary: payload.reportSummary ?? row.rawText,
            strengths: payload.gradePercentage && payload.gradePercentage >= 90 ? "Evaluación histórica con desempeño sobresaliente." : null,
            improvementAreas: payload.reportSummary ?? null,
            recommendedNextFocus: "Revisar observaciones históricas y continuar seguimiento estructurado.",
            studentVisibleSummary: payload.reportSummary ?? row.rawText,
          },
        });
        appliedIds.push(report.id);
      }

      if (!appliedIds.length) {
        const title = payload.title ?? titleForRow(row.suggestedType, row.sourcePage);
        const log = await tx.studentLogEntry.create({
          data: {
            studentId: row.studentId,
            authorId: reviewerUserId,
            type: row.suggestedType === HistoricalImportSuggestionType.SKILL_EVIDENCE ? LogEntryType.MILESTONE : LogEntryType.NOTE,
            title,
            content: row.rawText ?? "Página histórica importada sin texto extraíble.",
            metadata,
            occurredAt: payload.extractedDate ? new Date(payload.extractedDate) : null,
          },
        });
        appliedIds.push(log.id);
        appliedEntityType = "StudentLogEntry";
      }

      return tx.historicalImportRow.update({
        where: { id: row.id },
        data: {
          status: HistoricalImportRowStatus.APPLIED,
          appliedEntityType,
          appliedEntityId: appliedIds.join(","),
          reviewedByUserId: reviewerUserId,
          reviewedAt: new Date(),
          appliedAt: new Date(),
          errorMessage: null,
        },
      });
    });

    await refreshBatchStatus(row.batchId);
    return applied;
  } catch (error) {
    await db.historicalImportRow.update({
      where: { id: row.id },
      data: {
        status: HistoricalImportRowStatus.ERROR,
        reviewedByUserId: reviewerUserId,
        reviewedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "No se pudo aplicar la fila.",
      },
    });
    throw error;
  }
}

export async function markHistoricalImportRow(rowId: string, reviewerUserId: string, status: HistoricalImportRowStatus) {
  const row = await db.historicalImportRow.update({
    where: { id: rowId },
    data: {
      status,
      appliedEntityType: status === HistoricalImportRowStatus.SOURCE_ONLY ? "SOURCE_ONLY" : null,
      reviewedByUserId: reviewerUserId,
      reviewedAt: new Date(),
      appliedAt: status === HistoricalImportRowStatus.SOURCE_ONLY ? new Date() : null,
      errorMessage: null,
    },
  });
  await refreshBatchStatus(row.batchId);
  return row;
}

async function refreshBatchStatus(batchId: string) {
  const rows = await db.historicalImportRow.findMany({ where: { batchId }, select: { status: true } });
  if (!rows.length) return;

  const closedStatuses = new Set<HistoricalImportRowStatus>([
    HistoricalImportRowStatus.APPLIED,
    HistoricalImportRowStatus.SKIPPED,
    HistoricalImportRowStatus.SOURCE_ONLY,
  ]);
  const allClosed = rows.every((row) => closedStatuses.has(row.status));
  const anyReviewed = rows.some((row) => closedStatuses.has(row.status) || row.status === HistoricalImportRowStatus.ERROR);

  await db.historicalImportBatch.update({
    where: { id: batchId },
    data: {
      status: allClosed
        ? HistoricalImportBatchStatus.APPLIED
        : anyReviewed
          ? HistoricalImportBatchStatus.REVIEWING
          : HistoricalImportBatchStatus.STAGED,
    },
  });
}

function titleForRow(type: HistoricalImportSuggestionType, sourcePage: number) {
  if (type === HistoricalImportSuggestionType.SKILL_EVIDENCE) return `Evidencia técnica histórica página ${sourcePage}`;
  if (type === HistoricalImportSuggestionType.LESSON_NOTE) return `Nota de clase histórica página ${sourcePage}`;
  return `Nota histórica página ${sourcePage}`;
}
