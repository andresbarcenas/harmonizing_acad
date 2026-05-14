-- Extend report lifecycle values. GENERATED and FINALIZED are retained as legacy values.
-- Do not use newly added enum values in this migration; PostgreSQL requires the enum
-- addition to commit before values such as PUBLISHED can be written safely.
ALTER TYPE "ProgressReportStatus" ADD VALUE IF NOT EXISTS 'PUBLISHED';
ALTER TYPE "ProgressReportStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

-- Add report workflow, rubric, summary, and metric fields. IF NOT EXISTS keeps this
-- migration recoverable if a previous production attempt partially changed schema.
ALTER TABLE "ProgressReport"
  ADD COLUMN IF NOT EXISTS "reportKey" TEXT,
  ADD COLUMN IF NOT EXISTS "publishedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "generatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rubricVersion" TEXT DEFAULT 'default-v1',
  ADD COLUMN IF NOT EXISTS "totalScheduledClasses" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "missedLessonsCount" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "cancelledLessonsCount" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "singleClassesCount" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "recurringClassesCount" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lessonNotesCompletedCount" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "missingLessonNotesCount" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "practiceLogCount" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "practiceAssignmentCount" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "completedAssignmentCount" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "overdueAssignmentCount" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reviewedVideoCount" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "repertoireWorkedCount" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "repertoireCompletedCount" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "averagePreparednessRating" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "averageFocusRating" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "averageEffortRating" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "categoryScores" JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "skillSummary" JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "attendanceSummary" JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "practiceSummary" JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "videoSummary" JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "repertoireSummary" JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "gradeLetter" TEXT,
  ADD COLUMN IF NOT EXISTS "adminNote" TEXT,
  ADD COLUMN IF NOT EXISTS "studentVisibleSummary" TEXT;

-- Backfill required defaults and legacy narrative/metric fields without writing the
-- newly added enum values yet.
UPDATE "ProgressReport"
SET
  "generatedAt" = COALESCE("generatedAt", "createdAt", CURRENT_TIMESTAMP),
  "publishedAt" = CASE WHEN "status" IN ('GENERATED', 'FINALIZED') THEN COALESCE("publishedAt", "updatedAt", "createdAt", CURRENT_TIMESTAMP) ELSE "publishedAt" END,
  "rubricVersion" = COALESCE("rubricVersion", 'default-v1'),
  "gradeLetter" = COALESCE("gradeLetter", "finalGrade"),
  "studentVisibleSummary" = COALESCE("studentVisibleSummary", "teacherSummary"),
  "totalScheduledClasses" = COALESCE("totalScheduledClasses", GREATEST("attendanceCount", "completedLessonsCount" + "missedCancelledCount"), 0),
  "missedLessonsCount" = COALESCE("missedLessonsCount", "missedCancelledCount", 0),
  "cancelledLessonsCount" = COALESCE("cancelledLessonsCount", 0),
  "singleClassesCount" = COALESCE("singleClassesCount", 0),
  "recurringClassesCount" = COALESCE("recurringClassesCount", 0),
  "lessonNotesCompletedCount" = COALESCE("lessonNotesCompletedCount", "completedLessonsCount", 0),
  "missingLessonNotesCount" = COALESCE("missingLessonNotesCount", 0),
  "practiceLogCount" = COALESCE("practiceLogCount", 0),
  "practiceAssignmentCount" = COALESCE("practiceAssignmentCount", 0),
  "completedAssignmentCount" = COALESCE("completedAssignmentCount", 0),
  "overdueAssignmentCount" = COALESCE("overdueAssignmentCount", 0),
  "reviewedVideoCount" = COALESCE("reviewedVideoCount", 0),
  "repertoireWorkedCount" = COALESCE("repertoireWorkedCount", 0),
  "repertoireCompletedCount" = COALESCE("repertoireCompletedCount", 0),
  "categoryScores" = COALESCE("categoryScores", '{}'),
  "skillSummary" = COALESCE("skillSummary", '{}'),
  "attendanceSummary" = COALESCE("attendanceSummary", '{}'),
  "practiceSummary" = COALESCE("practiceSummary", '{}'),
  "videoSummary" = COALESCE("videoSummary", '{}'),
  "repertoireSummary" = COALESCE("repertoireSummary", '{}');

-- Deterministic anti-duplication key. If duplicate legacy rows exist, suffix later rows with their id.
WITH ranked_reports AS (
  SELECT
    "id",
    CONCAT(
      "studentId", ':', COALESCE("teacherId", 'academy'), ':',
      TO_CHAR("startDate", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), ':',
      TO_CHAR("endDate", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    ) AS base_key,
    ROW_NUMBER() OVER (
      PARTITION BY "studentId", COALESCE("teacherId", 'academy'), "startDate", "endDate"
      ORDER BY "createdAt", "id"
    ) AS row_number
  FROM "ProgressReport"
)
UPDATE "ProgressReport" report
SET "reportKey" = CASE
  WHEN ranked_reports.row_number = 1 THEN ranked_reports.base_key
  ELSE CONCAT(ranked_reports.base_key, ':', report."id")
END
FROM ranked_reports
WHERE report."id" = ranked_reports."id"
  AND (report."reportKey" IS NULL OR report."reportKey" = '');

ALTER TABLE "ProgressReport" ALTER COLUMN "reportKey" SET NOT NULL;
ALTER TABLE "ProgressReport" ALTER COLUMN "generatedAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ProgressReport" ALTER COLUMN "generatedAt" SET NOT NULL;
ALTER TABLE "ProgressReport" ALTER COLUMN "rubricVersion" SET DEFAULT 'default-v1';
ALTER TABLE "ProgressReport" ALTER COLUMN "rubricVersion" SET NOT NULL;
ALTER TABLE "ProgressReport" ALTER COLUMN "totalScheduledClasses" SET DEFAULT 0;
ALTER TABLE "ProgressReport" ALTER COLUMN "totalScheduledClasses" SET NOT NULL;
ALTER TABLE "ProgressReport" ALTER COLUMN "missedLessonsCount" SET DEFAULT 0;
ALTER TABLE "ProgressReport" ALTER COLUMN "missedLessonsCount" SET NOT NULL;
ALTER TABLE "ProgressReport" ALTER COLUMN "cancelledLessonsCount" SET DEFAULT 0;
ALTER TABLE "ProgressReport" ALTER COLUMN "cancelledLessonsCount" SET NOT NULL;
ALTER TABLE "ProgressReport" ALTER COLUMN "singleClassesCount" SET DEFAULT 0;
ALTER TABLE "ProgressReport" ALTER COLUMN "singleClassesCount" SET NOT NULL;
ALTER TABLE "ProgressReport" ALTER COLUMN "recurringClassesCount" SET DEFAULT 0;
ALTER TABLE "ProgressReport" ALTER COLUMN "recurringClassesCount" SET NOT NULL;
ALTER TABLE "ProgressReport" ALTER COLUMN "lessonNotesCompletedCount" SET DEFAULT 0;
ALTER TABLE "ProgressReport" ALTER COLUMN "lessonNotesCompletedCount" SET NOT NULL;
ALTER TABLE "ProgressReport" ALTER COLUMN "missingLessonNotesCount" SET DEFAULT 0;
ALTER TABLE "ProgressReport" ALTER COLUMN "missingLessonNotesCount" SET NOT NULL;
ALTER TABLE "ProgressReport" ALTER COLUMN "practiceLogCount" SET DEFAULT 0;
ALTER TABLE "ProgressReport" ALTER COLUMN "practiceLogCount" SET NOT NULL;
ALTER TABLE "ProgressReport" ALTER COLUMN "practiceAssignmentCount" SET DEFAULT 0;
ALTER TABLE "ProgressReport" ALTER COLUMN "practiceAssignmentCount" SET NOT NULL;
ALTER TABLE "ProgressReport" ALTER COLUMN "completedAssignmentCount" SET DEFAULT 0;
ALTER TABLE "ProgressReport" ALTER COLUMN "completedAssignmentCount" SET NOT NULL;
ALTER TABLE "ProgressReport" ALTER COLUMN "overdueAssignmentCount" SET DEFAULT 0;
ALTER TABLE "ProgressReport" ALTER COLUMN "overdueAssignmentCount" SET NOT NULL;
ALTER TABLE "ProgressReport" ALTER COLUMN "reviewedVideoCount" SET DEFAULT 0;
ALTER TABLE "ProgressReport" ALTER COLUMN "reviewedVideoCount" SET NOT NULL;
ALTER TABLE "ProgressReport" ALTER COLUMN "repertoireWorkedCount" SET DEFAULT 0;
ALTER TABLE "ProgressReport" ALTER COLUMN "repertoireWorkedCount" SET NOT NULL;
ALTER TABLE "ProgressReport" ALTER COLUMN "repertoireCompletedCount" SET DEFAULT 0;
ALTER TABLE "ProgressReport" ALTER COLUMN "repertoireCompletedCount" SET NOT NULL;
ALTER TABLE "ProgressReport" ALTER COLUMN "categoryScores" SET DEFAULT '{}';
ALTER TABLE "ProgressReport" ALTER COLUMN "categoryScores" SET NOT NULL;
ALTER TABLE "ProgressReport" ALTER COLUMN "skillSummary" SET DEFAULT '{}';
ALTER TABLE "ProgressReport" ALTER COLUMN "skillSummary" SET NOT NULL;
ALTER TABLE "ProgressReport" ALTER COLUMN "attendanceSummary" SET DEFAULT '{}';
ALTER TABLE "ProgressReport" ALTER COLUMN "attendanceSummary" SET NOT NULL;
ALTER TABLE "ProgressReport" ALTER COLUMN "practiceSummary" SET DEFAULT '{}';
ALTER TABLE "ProgressReport" ALTER COLUMN "practiceSummary" SET NOT NULL;
ALTER TABLE "ProgressReport" ALTER COLUMN "videoSummary" SET DEFAULT '{}';
ALTER TABLE "ProgressReport" ALTER COLUMN "videoSummary" SET NOT NULL;
ALTER TABLE "ProgressReport" ALTER COLUMN "repertoireSummary" SET DEFAULT '{}';
ALTER TABLE "ProgressReport" ALTER COLUMN "repertoireSummary" SET NOT NULL;
ALTER TABLE "ProgressReport" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

CREATE UNIQUE INDEX IF NOT EXISTS "ProgressReport_reportKey_key" ON "ProgressReport"("reportKey");
CREATE INDEX IF NOT EXISTS "ProgressReport_studentId_status_startDate_endDate_idx" ON "ProgressReport"("studentId", "status", "startDate", "endDate");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ProgressReport_publishedByUserId_fkey'
  ) THEN
    ALTER TABLE "ProgressReport"
      ADD CONSTRAINT "ProgressReport_publishedByUserId_fkey"
      FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
