-- Extend report lifecycle values. GENERATED and FINALIZED are retained as legacy values.
ALTER TYPE "ProgressReportStatus" ADD VALUE IF NOT EXISTS 'PUBLISHED';
ALTER TYPE "ProgressReportStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

-- Add report workflow, rubric, summary, and metric fields.
ALTER TABLE "ProgressReport"
  ADD COLUMN "reportKey" TEXT,
  ADD COLUMN "publishedByUserId" TEXT,
  ADD COLUMN "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "rubricVersion" TEXT NOT NULL DEFAULT 'default-v1',
  ADD COLUMN "totalScheduledClasses" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "missedLessonsCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "cancelledLessonsCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "singleClassesCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "recurringClassesCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lessonNotesCompletedCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "missingLessonNotesCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "practiceLogCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "practiceAssignmentCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "completedAssignmentCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "overdueAssignmentCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reviewedVideoCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "repertoireWorkedCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "repertoireCompletedCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "averagePreparednessRating" DOUBLE PRECISION,
  ADD COLUMN "averageFocusRating" DOUBLE PRECISION,
  ADD COLUMN "averageEffortRating" DOUBLE PRECISION,
  ADD COLUMN "categoryScores" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "skillSummary" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "attendanceSummary" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "practiceSummary" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "videoSummary" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "repertoireSummary" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "gradeLetter" TEXT,
  ADD COLUMN "adminNote" TEXT,
  ADD COLUMN "studentVisibleSummary" TEXT;

-- Backfill lifecycle timestamps and preserve existing generated reports as student-visible published reports.
UPDATE "ProgressReport"
SET
  "generatedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP),
  "publishedAt" = CASE WHEN "status" IN ('GENERATED', 'FINALIZED') THEN COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP) ELSE "publishedAt" END,
  "gradeLetter" = COALESCE("gradeLetter", "finalGrade"),
  "studentVisibleSummary" = COALESCE("studentVisibleSummary", "teacherSummary"),
  "totalScheduledClasses" = GREATEST("attendanceCount", "completedLessonsCount" + "missedCancelledCount"),
  "missedLessonsCount" = "missedCancelledCount",
  "lessonNotesCompletedCount" = "completedLessonsCount";

UPDATE "ProgressReport"
SET "status" = 'PUBLISHED'
WHERE "status" IN ('GENERATED', 'FINALIZED');

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
WHERE report."id" = ranked_reports."id";

ALTER TABLE "ProgressReport" ALTER COLUMN "reportKey" SET NOT NULL;
ALTER TABLE "ProgressReport" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

CREATE UNIQUE INDEX "ProgressReport_reportKey_key" ON "ProgressReport"("reportKey");
CREATE INDEX "ProgressReport_studentId_status_startDate_endDate_idx" ON "ProgressReport"("studentId", "status", "startDate", "endDate");

ALTER TABLE "ProgressReport"
  ADD CONSTRAINT "ProgressReport_publishedByUserId_fkey"
  FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
