import { PracticeAssignmentStatus, RepertoireStatus, SessionStatus } from "@prisma/client";
import { z } from "zod";

import { normalizeInstrument } from "@/lib/instruments";

const optionalString = (max = 2000) => z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().max(max).optional());

const optionalDateString = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().datetime().optional());

const optionalId = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().min(1).optional());

const ratingSchema = z.number().int().min(1).max(5);
const lessonInstrumentSchema = z.enum(["PIANO", "VOICE"]);
const requiredInstrumentSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  return normalizeInstrument(value) ?? value.trim();
}, z.enum(["Piano", "Voice"], { message: "Selecciona Piano o Voz." }));
const optionalPositiveInt = (max = 600) => z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}, z.number().int().min(1).max(max).optional());

const optionalPercent = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}, z.number().int().min(0).max(100).optional());

const completionText = (max = 2000) => z.preprocess((value) => {
  if (typeof value !== "string") return "";
  return value.trim();
}, z.string().max(max));

export const skillRatingInputSchema = z.object({
  skillCategoryId: z.string().min(1),
  rating: ratingSchema,
  note: optionalString(500),
});

const completionStatuses = [
  SessionStatus.COMPLETED,
  SessionStatus.NO_SHOW,
  SessionStatus.CANCELLED,
  SessionStatus.RESCHEDULE_PENDING,
] as const;

export const completeClassWorkflowSchema = z.object({
  status: z.enum(completionStatuses),
  notifyStudent: z.boolean().default(true),
  lessonInstrument: lessonInstrumentSchema.optional(),
  lessonNote: z.object({
    summary: completionText(2000),
    taughtToday: completionText(2000),
    studentDidWell: completionText(2000),
    needsImprovement: completionText(2000),
    homework: completionText(2000),
    nextLessonFocus: completionText(1000),
    teacherPrivateNote: completionText(2000),
    studentVisibleNote: completionText(2000),
    preparednessRating: ratingSchema.optional(),
    focusRating: ratingSchema.optional(),
    effortRating: ratingSchema.optional(),
    overallLessonRating: ratingSchema.optional(),
  }),
  skillRatings: z.array(skillRatingInputSchema).max(24).default([]),
  repertoireUpdates: z.array(z.object({
    repertoireItemId: z.string().min(1),
    status: z.nativeEnum(RepertoireStatus).optional(),
    masteryPercent: optionalPercent,
    currentFocusSection: optionalString(180),
    currentTempo: optionalPositiveInt(400),
    targetTempo: optionalPositiveInt(400),
    teacherNotes: optionalString(2000),
    studentVisibleNotes: optionalString(2000),
    completedDate: optionalDateString,
  })).max(12).default([]),
  newRepertoireItems: z.array(z.object({
    clientId: optionalId,
    catalogItemId: optionalId,
    title: z.string().trim().min(2).max(180),
    composerOrArtist: optionalString(160),
    instrument: requiredInstrumentSchema,
    level: optionalString(80),
    status: z.nativeEnum(RepertoireStatus).default(RepertoireStatus.ASSIGNED),
    masteryPercent: z.number().int().min(0).max(100).default(0),
    currentFocusSection: optionalString(180),
    currentTempo: optionalPositiveInt(400),
    targetTempo: optionalPositiveInt(400),
    teacherNotes: optionalString(2000),
    studentVisibleNotes: optionalString(2000),
  })).max(3).default([]),
  assignments: z.array(z.object({
    title: z.string().trim().min(2).max(180),
    instructions: z.string().trim().min(3).max(3000),
    dueDate: optionalDateString,
    expectedMinutes: optionalPositiveInt(600),
    repertoireItemId: optionalId,
    newRepertoireClientId: optionalId,
    skillCategoryId: optionalId,
    requiresVideo: z.boolean().default(false),
  })).max(6).default([]),
}).superRefine((value, ctx) => {
  if (value.status === SessionStatus.COMPLETED && value.lessonNote.summary.length < 3) {
    ctx.addIssue({
      code: "custom",
      path: ["lessonNote", "summary"],
      message: "Lesson summary is required when completing a class.",
    });
  }
});

export const upsertLessonNoteSchema = z.object({
  sessionId: z.string().min(1),
  summary: z.string().min(3).max(2000),
  taughtToday: optionalString(2000),
  studentDidWell: optionalString(2000),
  needsImprovement: optionalString(2000),
  homework: optionalString(2000),
  nextLessonFocus: optionalString(1000),
  teacherPrivateNote: optionalString(2000),
  studentVisibleNote: optionalString(2000),
  preparednessRating: ratingSchema.optional(),
  focusRating: ratingSchema.optional(),
  effortRating: ratingSchema.optional(),
  overallLessonRating: ratingSchema.optional(),
  skillRatings: z.array(skillRatingInputSchema).max(24).default([]),
});

export const upsertRepertoireSchema = z.object({
  repertoireItemId: optionalId,
  studentId: z.string().min(1),
  title: z.string().min(2).max(180),
  composerOrArtist: optionalString(160),
  instrument: requiredInstrumentSchema,
  level: optionalString(80),
  status: z.nativeEnum(RepertoireStatus).default(RepertoireStatus.ASSIGNED),
  startDate: optionalDateString,
  targetDate: optionalDateString,
  completedDate: optionalDateString,
  masteryPercent: z.number().int().min(0).max(100).default(0),
  currentFocusSection: optionalString(180),
  currentTempo: z.number().int().min(1).max(400).optional(),
  targetTempo: z.number().int().min(1).max(400).optional(),
  teacherNotes: optionalString(2000),
  studentVisibleNotes: optionalString(2000),
});

export const upsertPracticeAssignmentSchema = z.object({
  assignmentId: optionalId,
  studentId: z.string().min(1),
  lessonNoteId: optionalId,
  classSessionId: optionalId,
  repertoireItemId: optionalId,
  skillCategoryId: optionalId,
  title: z.string().min(2).max(180),
  instructions: z.string().min(3).max(3000),
  assignedDate: optionalDateString,
  dueDate: optionalDateString,
  status: z.nativeEnum(PracticeAssignmentStatus).default(PracticeAssignmentStatus.ASSIGNED),
  expectedMinutes: z.number().int().min(1).max(600).optional(),
  requiresVideo: z.boolean().default(false),
  teacherReviewNote: optionalString(2000),
});

export const practiceAssignmentStatusSchema = z.object({
  assignmentId: z.string().min(1),
  status: z.enum([PracticeAssignmentStatus.IN_PROGRESS, PracticeAssignmentStatus.COMPLETED]),
  completionNote: optionalString(1000),
});

export const createPracticeLogSchema = z.object({
  assignmentId: optionalId,
  repertoireItemId: optionalId,
  skillCategoryId: optionalId,
  practicedOn: z.string().datetime(),
  minutesPracticed: z.number().int().min(1).max(600),
  notes: optionalString(2000),
  moodRating: ratingSchema.optional(),
  difficultyRating: ratingSchema.optional(),
  parentNote: optionalString(2000),
});

export const generateProgressReportSchema = z.object({
  studentId: z.string().min(1),
  teacherId: optionalId,
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  timezone: optionalString(80),
  regenerate: z.boolean().optional(),
  teacherSummary: optionalString(3000),
  strengths: optionalString(2000),
  improvementAreas: optionalString(2000),
  recommendedNextFocus: optionalString(2000),
  studentVisibleSummary: optionalString(3000),
  adminNote: optionalString(3000),
});

export const updateProgressReportSchema = z.object({
  teacherSummary: optionalString(3000),
  strengths: optionalString(2000),
  improvementAreas: optionalString(2000),
  recommendedNextFocus: optionalString(2000),
  studentVisibleSummary: optionalString(3000),
  adminNote: optionalString(3000),
});

export const publishProgressReportSchema = z.object({
  adminNote: optionalString(3000),
  studentVisibleSummary: optionalString(3000),
});
