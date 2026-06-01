import { RepertoireStatus, StudentExamArea } from "@prisma/client";
import { z } from "zod";

const optionalId = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().min(1).optional());

const optionalString = (max = 2000) => z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().max(max).optional());

const examDateSchema = z.preprocess((value) => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().datetime());

export const examScoreSchema = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}, z.number().min(1).max(10).refine((value) => Number.isInteger(value * 2), "Scores must use whole or half-point increments."));

const examAreaInputSchema = z.object({
  topic: z.string().trim().min(1).max(180),
  objective: z.string().trim().min(1).max(500),
  score: examScoreSchema,
  comments: optionalString(2000),
});

export const examAssessmentInputSchema = z.object({
  studentId: z.string().min(1),
  teacherId: optionalId,
  classSessionId: optionalId,
  examDate: examDateSchema,
  title: z.string().trim().min(2).max(180),
  notes: optionalString(3000),
  repertoireScores: z.array(z.object({
    repertoireItemId: optionalId,
    catalogItemId: optionalId,
    title: optionalString(180),
    composerOrArtist: optionalString(160),
    status: z.nativeEnum(RepertoireStatus).default(RepertoireStatus.PERFORMANCE_READY),
    interpretationScore: examScoreSchema,
    executionScore: examScoreSchema,
    overallScore: examScoreSchema,
    comments: optionalString(3000),
  })).min(1).max(40),
  harmonyScores: z.array(examAreaInputSchema).max(40).default([]),
  musicReadingScores: z.array(examAreaInputSchema).max(40).default([]),
}).superRefine((value, ctx) => {
  value.repertoireScores.forEach((row, index) => {
    if (!row.repertoireItemId && !row.catalogItemId && !row.title) {
      ctx.addIssue({
        code: "custom",
        path: ["repertoireScores", index, "title"],
        message: "Choose an existing song, select from catalog, or enter a title.",
      });
    }
  });
});

export type ExamAssessmentInput = z.infer<typeof examAssessmentInputSchema>;

export const examAreaLabels = {
  harmony: StudentExamArea.HARMONY,
  musicReading: StudentExamArea.MUSIC_READING,
} as const;
