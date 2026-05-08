-- Progress Intelligence foundation: structured lesson notes, skills, repertoire, practice work, and reports.
CREATE TYPE "RepertoireStatus" AS ENUM ('ASSIGNED', 'LEARNING', 'IMPROVING', 'PERFORMANCE_READY', 'COMPLETED', 'PAUSED');
CREATE TYPE "PracticeAssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED', 'OVERDUE');
CREATE TYPE "ProgressReportStatus" AS ENUM ('DRAFT', 'GENERATED', 'FINALIZED');

CREATE TABLE "LessonNote" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "taughtToday" TEXT,
  "studentDidWell" TEXT,
  "needsImprovement" TEXT,
  "homework" TEXT,
  "nextLessonFocus" TEXT,
  "teacherPrivateNote" TEXT,
  "studentVisibleNote" TEXT,
  "preparednessRating" INTEGER,
  "focusRating" INTEGER,
  "effortRating" INTEGER,
  "overallLessonRating" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LessonNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SkillCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "instrument" TEXT NOT NULL DEFAULT 'GENERAL',
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SkillCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LessonSkillRating" (
  "id" TEXT NOT NULL,
  "lessonNoteId" TEXT NOT NULL,
  "skillCategoryId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LessonSkillRating_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RepertoireItem" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "teacherId" TEXT,
  "title" TEXT NOT NULL,
  "composerOrArtist" TEXT,
  "instrument" TEXT NOT NULL,
  "level" TEXT,
  "status" "RepertoireStatus" NOT NULL DEFAULT 'ASSIGNED',
  "startDate" TIMESTAMP(3),
  "targetDate" TIMESTAMP(3),
  "completedDate" TIMESTAMP(3),
  "masteryPercent" INTEGER NOT NULL DEFAULT 0,
  "currentFocusSection" TEXT,
  "currentTempo" INTEGER,
  "targetTempo" INTEGER,
  "teacherNotes" TEXT,
  "studentVisibleNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RepertoireItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PracticeAssignment" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "lessonNoteId" TEXT,
  "classSessionId" TEXT,
  "repertoireItemId" TEXT,
  "skillCategoryId" TEXT,
  "title" TEXT NOT NULL,
  "instructions" TEXT NOT NULL,
  "assignedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3),
  "status" "PracticeAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
  "expectedMinutes" INTEGER,
  "requiresVideo" BOOLEAN NOT NULL DEFAULT false,
  "teacherReviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PracticeAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PracticeLog" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "assignmentId" TEXT,
  "repertoireItemId" TEXT,
  "skillCategoryId" TEXT,
  "practicedOn" TIMESTAMP(3) NOT NULL,
  "minutesPracticed" INTEGER NOT NULL,
  "notes" TEXT,
  "moodRating" INTEGER,
  "difficultyRating" INTEGER,
  "parentNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PracticeLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VideoSkillRating" (
  "id" TEXT NOT NULL,
  "videoFeedbackId" TEXT NOT NULL,
  "skillCategoryId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VideoSkillRating_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProgressReport" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "teacherId" TEXT,
  "generatedByUserId" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "status" "ProgressReportStatus" NOT NULL DEFAULT 'GENERATED',
  "attendanceCount" INTEGER NOT NULL DEFAULT 0,
  "completedLessonsCount" INTEGER NOT NULL DEFAULT 0,
  "missedCancelledCount" INTEGER NOT NULL DEFAULT 0,
  "totalPracticeMinutes" INTEGER NOT NULL DEFAULT 0,
  "practiceAssignmentCompletionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "videoSubmissionsCount" INTEGER NOT NULL DEFAULT 0,
  "averageLessonRating" DOUBLE PRECISION,
  "averageSkillRatings" JSONB NOT NULL,
  "repertoireProgressSummary" JSONB NOT NULL,
  "teacherSummary" TEXT,
  "strengths" TEXT,
  "improvementAreas" TEXT,
  "recommendedNextFocus" TEXT,
  "finalGrade" TEXT,
  "gradePercentage" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProgressReport_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PracticeVideo" ADD COLUMN "practiceAssignmentId" TEXT;
ALTER TABLE "PracticeVideo" ADD COLUMN "repertoireItemId" TEXT;
ALTER TABLE "PracticeVideo" ADD COLUMN "skillCategoryId" TEXT;

CREATE UNIQUE INDEX "LessonNote_sessionId_key" ON "LessonNote"("sessionId");
CREATE INDEX "LessonNote_studentId_createdAt_idx" ON "LessonNote"("studentId", "createdAt");
CREATE INDEX "LessonNote_teacherId_createdAt_idx" ON "LessonNote"("teacherId", "createdAt");
CREATE UNIQUE INDEX "SkillCategory_instrument_name_key" ON "SkillCategory"("instrument", "name");
CREATE INDEX "SkillCategory_instrument_active_sortOrder_idx" ON "SkillCategory"("instrument", "active", "sortOrder");
CREATE UNIQUE INDEX "LessonSkillRating_lessonNoteId_skillCategoryId_key" ON "LessonSkillRating"("lessonNoteId", "skillCategoryId");
CREATE INDEX "LessonSkillRating_skillCategoryId_idx" ON "LessonSkillRating"("skillCategoryId");
CREATE INDEX "RepertoireItem_studentId_status_idx" ON "RepertoireItem"("studentId", "status");
CREATE INDEX "RepertoireItem_teacherId_status_idx" ON "RepertoireItem"("teacherId", "status");
CREATE INDEX "PracticeAssignment_studentId_status_dueDate_idx" ON "PracticeAssignment"("studentId", "status", "dueDate");
CREATE INDEX "PracticeAssignment_teacherId_status_dueDate_idx" ON "PracticeAssignment"("teacherId", "status", "dueDate");
CREATE INDEX "PracticeAssignment_lessonNoteId_idx" ON "PracticeAssignment"("lessonNoteId");
CREATE INDEX "PracticeAssignment_classSessionId_idx" ON "PracticeAssignment"("classSessionId");
CREATE INDEX "PracticeAssignment_repertoireItemId_idx" ON "PracticeAssignment"("repertoireItemId");
CREATE INDEX "PracticeAssignment_skillCategoryId_idx" ON "PracticeAssignment"("skillCategoryId");
CREATE INDEX "PracticeLog_studentId_practicedOn_idx" ON "PracticeLog"("studentId", "practicedOn");
CREATE INDEX "PracticeLog_assignmentId_idx" ON "PracticeLog"("assignmentId");
CREATE INDEX "PracticeLog_repertoireItemId_idx" ON "PracticeLog"("repertoireItemId");
CREATE INDEX "PracticeLog_skillCategoryId_idx" ON "PracticeLog"("skillCategoryId");
CREATE UNIQUE INDEX "VideoSkillRating_videoFeedbackId_skillCategoryId_key" ON "VideoSkillRating"("videoFeedbackId", "skillCategoryId");
CREATE INDEX "VideoSkillRating_skillCategoryId_idx" ON "VideoSkillRating"("skillCategoryId");
CREATE INDEX "ProgressReport_studentId_startDate_endDate_idx" ON "ProgressReport"("studentId", "startDate", "endDate");
CREATE INDEX "ProgressReport_teacherId_createdAt_idx" ON "ProgressReport"("teacherId", "createdAt");
CREATE INDEX "ProgressReport_status_createdAt_idx" ON "ProgressReport"("status", "createdAt");
CREATE INDEX "PracticeVideo_practiceAssignmentId_idx" ON "PracticeVideo"("practiceAssignmentId");
CREATE INDEX "PracticeVideo_repertoireItemId_idx" ON "PracticeVideo"("repertoireItemId");
CREATE INDEX "PracticeVideo_skillCategoryId_idx" ON "PracticeVideo"("skillCategoryId");

ALTER TABLE "LessonNote" ADD CONSTRAINT "LessonNote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonNote" ADD CONSTRAINT "LessonNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonNote" ADD CONSTRAINT "LessonNote_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonSkillRating" ADD CONSTRAINT "LessonSkillRating_lessonNoteId_fkey" FOREIGN KEY ("lessonNoteId") REFERENCES "LessonNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonSkillRating" ADD CONSTRAINT "LessonSkillRating_skillCategoryId_fkey" FOREIGN KEY ("skillCategoryId") REFERENCES "SkillCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepertoireItem" ADD CONSTRAINT "RepertoireItem_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepertoireItem" ADD CONSTRAINT "RepertoireItem_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PracticeAssignment" ADD CONSTRAINT "PracticeAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PracticeAssignment" ADD CONSTRAINT "PracticeAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PracticeAssignment" ADD CONSTRAINT "PracticeAssignment_lessonNoteId_fkey" FOREIGN KEY ("lessonNoteId") REFERENCES "LessonNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PracticeAssignment" ADD CONSTRAINT "PracticeAssignment_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PracticeAssignment" ADD CONSTRAINT "PracticeAssignment_repertoireItemId_fkey" FOREIGN KEY ("repertoireItemId") REFERENCES "RepertoireItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PracticeAssignment" ADD CONSTRAINT "PracticeAssignment_skillCategoryId_fkey" FOREIGN KEY ("skillCategoryId") REFERENCES "SkillCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PracticeLog" ADD CONSTRAINT "PracticeLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PracticeLog" ADD CONSTRAINT "PracticeLog_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "PracticeAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PracticeLog" ADD CONSTRAINT "PracticeLog_repertoireItemId_fkey" FOREIGN KEY ("repertoireItemId") REFERENCES "RepertoireItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PracticeLog" ADD CONSTRAINT "PracticeLog_skillCategoryId_fkey" FOREIGN KEY ("skillCategoryId") REFERENCES "SkillCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VideoSkillRating" ADD CONSTRAINT "VideoSkillRating_videoFeedbackId_fkey" FOREIGN KEY ("videoFeedbackId") REFERENCES "VideoFeedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoSkillRating" ADD CONSTRAINT "VideoSkillRating_skillCategoryId_fkey" FOREIGN KEY ("skillCategoryId") REFERENCES "SkillCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProgressReport" ADD CONSTRAINT "ProgressReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProgressReport" ADD CONSTRAINT "ProgressReport_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProgressReport" ADD CONSTRAINT "ProgressReport_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PracticeVideo" ADD CONSTRAINT "PracticeVideo_practiceAssignmentId_fkey" FOREIGN KEY ("practiceAssignmentId") REFERENCES "PracticeAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PracticeVideo" ADD CONSTRAINT "PracticeVideo_repertoireItemId_fkey" FOREIGN KEY ("repertoireItemId") REFERENCES "RepertoireItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PracticeVideo" ADD CONSTRAINT "PracticeVideo_skillCategoryId_fkey" FOREIGN KEY ("skillCategoryId") REFERENCES "SkillCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
