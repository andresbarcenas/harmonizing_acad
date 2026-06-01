-- Piano exam assessment history for internal teacher/admin use.
DO $$
BEGIN
  CREATE TYPE "StudentExamArea" AS ENUM ('HARMONY', 'MUSIC_READING');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "StudentExamAssessment" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "classSessionId" TEXT,
  "examDate" TIMESTAMP(3) NOT NULL,
  "title" TEXT NOT NULL,
  "instrument" TEXT NOT NULL DEFAULT 'Piano',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StudentExamAssessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudentExamRepertoireScore" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "repertoireItemId" TEXT,
  "titleSnapshot" TEXT NOT NULL,
  "composerSnapshot" TEXT,
  "interpretationScore" DOUBLE PRECISION NOT NULL,
  "executionScore" DOUBLE PRECISION NOT NULL,
  "overallScore" DOUBLE PRECISION NOT NULL,
  "comments" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StudentExamRepertoireScore_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StudentExamAreaScore" (
  "id" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "area" "StudentExamArea" NOT NULL,
  "topic" TEXT NOT NULL,
  "objective" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "comments" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StudentExamAreaScore_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudentExamAssessment_classSessionId_key" ON "StudentExamAssessment"("classSessionId");
CREATE INDEX IF NOT EXISTS "StudentExamAssessment_studentId_examDate_idx" ON "StudentExamAssessment"("studentId", "examDate");
CREATE INDEX IF NOT EXISTS "StudentExamAssessment_teacherId_examDate_idx" ON "StudentExamAssessment"("teacherId", "examDate");
CREATE INDEX IF NOT EXISTS "StudentExamRepertoireScore_assessmentId_sortOrder_idx" ON "StudentExamRepertoireScore"("assessmentId", "sortOrder");
CREATE INDEX IF NOT EXISTS "StudentExamRepertoireScore_repertoireItemId_idx" ON "StudentExamRepertoireScore"("repertoireItemId");
CREATE INDEX IF NOT EXISTS "StudentExamAreaScore_assessmentId_area_sortOrder_idx" ON "StudentExamAreaScore"("assessmentId", "area", "sortOrder");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentExamAssessment_studentId_fkey') THEN
    ALTER TABLE "StudentExamAssessment"
      ADD CONSTRAINT "StudentExamAssessment_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentExamAssessment_teacherId_fkey') THEN
    ALTER TABLE "StudentExamAssessment"
      ADD CONSTRAINT "StudentExamAssessment_teacherId_fkey"
      FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentExamAssessment_classSessionId_fkey') THEN
    ALTER TABLE "StudentExamAssessment"
      ADD CONSTRAINT "StudentExamAssessment_classSessionId_fkey"
      FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentExamRepertoireScore_assessmentId_fkey') THEN
    ALTER TABLE "StudentExamRepertoireScore"
      ADD CONSTRAINT "StudentExamRepertoireScore_assessmentId_fkey"
      FOREIGN KEY ("assessmentId") REFERENCES "StudentExamAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentExamRepertoireScore_repertoireItemId_fkey') THEN
    ALTER TABLE "StudentExamRepertoireScore"
      ADD CONSTRAINT "StudentExamRepertoireScore_repertoireItemId_fkey"
      FOREIGN KEY ("repertoireItemId") REFERENCES "RepertoireItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentExamAreaScore_assessmentId_fkey') THEN
    ALTER TABLE "StudentExamAreaScore"
      ADD CONSTRAINT "StudentExamAreaScore_assessmentId_fkey"
      FOREIGN KEY ("assessmentId") REFERENCES "StudentExamAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
