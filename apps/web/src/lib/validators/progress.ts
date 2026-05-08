import { PracticeAssignmentStatus, ProgressReportStatus, RepertoireStatus } from "@prisma/client";
import { z } from "zod";

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

const ratingSchema = z.number().int().min(1).max(5);

export const skillRatingInputSchema = z.object({
  skillCategoryId: z.string().min(1),
  rating: ratingSchema,
  note: optionalString(500),
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
  repertoireItemId: z.string().optional(),
  studentId: z.string().min(1),
  title: z.string().min(2).max(180),
  composerOrArtist: optionalString(160),
  instrument: z.string().min(1).max(80),
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
  assignmentId: z.string().optional(),
  studentId: z.string().min(1),
  lessonNoteId: z.string().optional(),
  classSessionId: z.string().optional(),
  repertoireItemId: z.string().optional(),
  skillCategoryId: z.string().optional(),
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
});

export const createPracticeLogSchema = z.object({
  assignmentId: z.string().optional(),
  repertoireItemId: z.string().optional(),
  skillCategoryId: z.string().optional(),
  practicedOn: z.string().datetime(),
  minutesPracticed: z.number().int().min(1).max(600),
  notes: optionalString(2000),
  moodRating: ratingSchema.optional(),
  difficultyRating: ratingSchema.optional(),
  parentNote: optionalString(2000),
});

export const generateProgressReportSchema = z.object({
  studentId: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  teacherSummary: optionalString(3000),
  strengths: optionalString(2000),
  improvementAreas: optionalString(2000),
  recommendedNextFocus: optionalString(2000),
  finalGrade: optionalString(20),
  gradePercentage: z.number().min(0).max(100).optional(),
});

export const updateProgressReportSchema = z.object({
  teacherSummary: optionalString(3000),
  strengths: optionalString(2000),
  improvementAreas: optionalString(2000),
  recommendedNextFocus: optionalString(2000),
  finalGrade: optionalString(20),
  gradePercentage: z.number().min(0).max(100).optional(),
  status: z.nativeEnum(ProgressReportStatus).optional(),
});
