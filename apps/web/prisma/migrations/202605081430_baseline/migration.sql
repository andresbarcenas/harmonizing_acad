-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'NO_SHOW', 'RESCHEDULE_PENDING', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ClassStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'NO_SHOW', 'RESCHEDULE_PENDING', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RescheduleStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('PENDING', 'REVIEWED', 'FEEDBACK_GIVEN');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CLASS_REMINDER', 'RESCHEDULE_UPDATE', 'VIDEO_REVIEW', 'MESSAGE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "StudentLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "TeacherStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "LogEntryType" AS ENUM ('NOTE', 'FEEDBACK', 'ATTENDANCE', 'GOAL_UPDATE', 'MILESTONE');

-- CreateEnum
CREATE TYPE "RepertoireStatus" AS ENUM ('ASSIGNED', 'LEARNING', 'IMPROVING', 'PERFORMANCE_READY', 'COMPLETED', 'PAUSED');

-- CreateEnum
CREATE TYPE "PracticeAssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "ProgressReportStatus" AS ENUM ('DRAFT', 'GENERATED', 'FINALIZED');

-- CreateEnum
CREATE TYPE "InvoiceContactLinkStrategy" AS ENUM ('EMAIL_AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "InvoiceSyncScope" AS ENUM ('STUDENT', 'ALL');

-- CreateEnum
CREATE TYPE "InvoiceSyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "bio" TEXT,
    "preferredInstrument" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "bio" TEXT,
    "zoomLink" TEXT,
    "meetLink" TEXT,
    "status" "TeacherStatus" NOT NULL DEFAULT 'ACTIVE',
    "statusUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherAssignment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "TeacherAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceUsd" INTEGER NOT NULL,
    "monthlyClassCount" INTEGER NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiveSubscription" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "monthlyClassLimit" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActiveSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSession" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "recurrenceId" TEXT,
    "startsAtUtc" TIMESTAMP(3) NOT NULL,
    "endsAtUtc" TIMESTAMP(3) NOT NULL,
    "meetingUrl" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "lessonFocus" TEXT,
    "lastClassNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringClassSeries" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "startsOnDate" TIMESTAMP(3) NOT NULL,
    "startTimeLocal" TEXT NOT NULL,
    "startMinuteLocal" INTEGER NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "intervalWeeks" INTEGER NOT NULL,
    "horizonWeeks" INTEGER NOT NULL,
    "weekdays" INTEGER[],
    "meetingUrl" TEXT NOT NULL,
    "lessonFocus" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "stoppedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringClassSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherAvailability" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinuteLocal" INTEGER NOT NULL,
    "endMinuteLocal" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RescheduleRequest" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "proposedStartUtc" TIMESTAMP(3) NOT NULL,
    "proposedEndUtc" TIMESTAMP(3) NOT NULL,
    "studentMessage" TEXT,
    "teacherResponse" TEXT,
    "status" "RescheduleStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "RescheduleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeVideo" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "practiceAssignmentId" TEXT,
    "repertoireItemId" TEXT,
    "skillCategoryId" TEXT,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "status" "VideoStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "PracticeVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoFeedback" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "ProgressRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "level" "StudentLevel" NOT NULL,
    "summary" TEXT NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearnedSong" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "learnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearnedSong_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentLogEntry" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" "LogEntryType" NOT NULL DEFAULT 'NOTE',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "token" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "acceptedByUserId" TEXT,
    "studentId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageThread" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "actionUrl" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "alegraInvoiceId" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "issueDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "totalAmount" DECIMAL(12,2),
    "balanceAmount" DECIMAL(12,2),
    "viewUrl" TEXT,
    "pdfUrl" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceContactLink" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "alegraContactId" TEXT,
    "strategy" "InvoiceContactLinkStrategy" NOT NULL DEFAULT 'EMAIL_AUTO',
    "lastResolvedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceContactLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceSyncRun" (
    "id" TEXT NOT NULL,
    "scope" "InvoiceSyncScope" NOT NULL,
    "status" "InvoiceSyncStatus" NOT NULL DEFAULT 'RUNNING',
    "studentId" TEXT,
    "triggeredByUserId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "studentsProcessed" INTEGER NOT NULL DEFAULT 0,
    "studentsFailed" INTEGER NOT NULL DEFAULT 0,
    "invoicesUpserted" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherProfile_userId_key" ON "TeacherProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAssignment_studentId_key" ON "TeacherAssignment"("studentId");

-- CreateIndex
CREATE INDEX "TeacherAssignment_teacherId_idx" ON "TeacherAssignment"("teacherId");

-- CreateIndex
CREATE INDEX "ActiveSubscription_studentId_active_idx" ON "ActiveSubscription"("studentId", "active");

-- CreateIndex
CREATE INDEX "ClassSession_teacherId_startsAtUtc_idx" ON "ClassSession"("teacherId", "startsAtUtc");

-- CreateIndex
CREATE INDEX "ClassSession_studentId_startsAtUtc_idx" ON "ClassSession"("studentId", "startsAtUtc");

-- CreateIndex
CREATE INDEX "ClassSession_recurrenceId_startsAtUtc_idx" ON "ClassSession"("recurrenceId", "startsAtUtc");

-- CreateIndex
CREATE INDEX "RecurringClassSeries_teacherId_active_createdAt_idx" ON "RecurringClassSeries"("teacherId", "active", "createdAt");

-- CreateIndex
CREATE INDEX "RecurringClassSeries_studentId_createdAt_idx" ON "RecurringClassSeries"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "TeacherAvailability_teacherId_weekday_idx" ON "TeacherAvailability"("teacherId", "weekday");

-- CreateIndex
CREATE INDEX "RescheduleRequest_sessionId_status_idx" ON "RescheduleRequest"("sessionId", "status");

-- CreateIndex
CREATE INDEX "PracticeVideo_teacherId_status_idx" ON "PracticeVideo"("teacherId", "status");

-- CreateIndex
CREATE INDEX "PracticeVideo_studentId_submittedAt_idx" ON "PracticeVideo"("studentId", "submittedAt");

-- CreateIndex
CREATE INDEX "PracticeVideo_practiceAssignmentId_idx" ON "PracticeVideo"("practiceAssignmentId");

-- CreateIndex
CREATE INDEX "PracticeVideo_repertoireItemId_idx" ON "PracticeVideo"("repertoireItemId");

-- CreateIndex
CREATE INDEX "PracticeVideo_skillCategoryId_idx" ON "PracticeVideo"("skillCategoryId");

-- CreateIndex
CREATE INDEX "VideoFeedback_videoId_idx" ON "VideoFeedback"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonNote_sessionId_key" ON "LessonNote"("sessionId");

-- CreateIndex
CREATE INDEX "LessonNote_studentId_createdAt_idx" ON "LessonNote"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "LessonNote_teacherId_createdAt_idx" ON "LessonNote"("teacherId", "createdAt");

-- CreateIndex
CREATE INDEX "SkillCategory_instrument_active_sortOrder_idx" ON "SkillCategory"("instrument", "active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SkillCategory_instrument_name_key" ON "SkillCategory"("instrument", "name");

-- CreateIndex
CREATE INDEX "LessonSkillRating_skillCategoryId_idx" ON "LessonSkillRating"("skillCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonSkillRating_lessonNoteId_skillCategoryId_key" ON "LessonSkillRating"("lessonNoteId", "skillCategoryId");

-- CreateIndex
CREATE INDEX "RepertoireItem_studentId_status_idx" ON "RepertoireItem"("studentId", "status");

-- CreateIndex
CREATE INDEX "RepertoireItem_teacherId_status_idx" ON "RepertoireItem"("teacherId", "status");

-- CreateIndex
CREATE INDEX "PracticeAssignment_studentId_status_dueDate_idx" ON "PracticeAssignment"("studentId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "PracticeAssignment_teacherId_status_dueDate_idx" ON "PracticeAssignment"("teacherId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "PracticeAssignment_lessonNoteId_idx" ON "PracticeAssignment"("lessonNoteId");

-- CreateIndex
CREATE INDEX "PracticeAssignment_classSessionId_idx" ON "PracticeAssignment"("classSessionId");

-- CreateIndex
CREATE INDEX "PracticeAssignment_repertoireItemId_idx" ON "PracticeAssignment"("repertoireItemId");

-- CreateIndex
CREATE INDEX "PracticeAssignment_skillCategoryId_idx" ON "PracticeAssignment"("skillCategoryId");

-- CreateIndex
CREATE INDEX "PracticeLog_studentId_practicedOn_idx" ON "PracticeLog"("studentId", "practicedOn");

-- CreateIndex
CREATE INDEX "PracticeLog_assignmentId_idx" ON "PracticeLog"("assignmentId");

-- CreateIndex
CREATE INDEX "PracticeLog_repertoireItemId_idx" ON "PracticeLog"("repertoireItemId");

-- CreateIndex
CREATE INDEX "PracticeLog_skillCategoryId_idx" ON "PracticeLog"("skillCategoryId");

-- CreateIndex
CREATE INDEX "VideoSkillRating_skillCategoryId_idx" ON "VideoSkillRating"("skillCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoSkillRating_videoFeedbackId_skillCategoryId_key" ON "VideoSkillRating"("videoFeedbackId", "skillCategoryId");

-- CreateIndex
CREATE INDEX "ProgressReport_studentId_startDate_endDate_idx" ON "ProgressReport"("studentId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "ProgressReport_teacherId_createdAt_idx" ON "ProgressReport"("teacherId", "createdAt");

-- CreateIndex
CREATE INDEX "ProgressReport_status_createdAt_idx" ON "ProgressReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StudentLogEntry_studentId_createdAt_idx" ON "StudentLogEntry"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "StudentLogEntry_authorId_createdAt_idx" ON "StudentLogEntry"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "StudentLogEntry_type_createdAt_idx" ON "StudentLogEntry"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_email_role_idx" ON "Invitation"("email", "role");

-- CreateIndex
CREATE INDEX "Invitation_invitedByUserId_createdAt_idx" ON "Invitation"("invitedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Invitation_studentId_createdAt_idx" ON "Invitation"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "Invitation_expiresAt_idx" ON "Invitation"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MessageThread_studentId_teacherId_key" ON "MessageThread"("studentId", "teacherId");

-- CreateIndex
CREATE INDEX "Message_threadId_createdAt_idx" ON "Message"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_alegraInvoiceId_key" ON "Invoice"("alegraInvoiceId");

-- CreateIndex
CREATE INDEX "Invoice_studentId_issueDate_idx" ON "Invoice"("studentId", "issueDate");

-- CreateIndex
CREATE INDEX "Invoice_studentId_status_updatedAt_idx" ON "Invoice"("studentId", "status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceContactLink_studentId_key" ON "InvoiceContactLink"("studentId");

-- CreateIndex
CREATE INDEX "InvoiceContactLink_alegraContactId_idx" ON "InvoiceContactLink"("alegraContactId");

-- CreateIndex
CREATE INDEX "InvoiceSyncRun_scope_status_startedAt_idx" ON "InvoiceSyncRun"("scope", "status", "startedAt");

-- CreateIndex
CREATE INDEX "InvoiceSyncRun_studentId_startedAt_idx" ON "InvoiceSyncRun"("studentId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAssignment" ADD CONSTRAINT "TeacherAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveSubscription" ADD CONSTRAINT "ActiveSubscription_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveSubscription" ADD CONSTRAINT "ActiveSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_recurrenceId_fkey" FOREIGN KEY ("recurrenceId") REFERENCES "RecurringClassSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringClassSeries" ADD CONSTRAINT "RecurringClassSeries_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringClassSeries" ADD CONSTRAINT "RecurringClassSeries_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherAvailability" ADD CONSTRAINT "TeacherAvailability_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescheduleRequest" ADD CONSTRAINT "RescheduleRequest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescheduleRequest" ADD CONSTRAINT "RescheduleRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "TeacherProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeVideo" ADD CONSTRAINT "PracticeVideo_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeVideo" ADD CONSTRAINT "PracticeVideo_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeVideo" ADD CONSTRAINT "PracticeVideo_practiceAssignmentId_fkey" FOREIGN KEY ("practiceAssignmentId") REFERENCES "PracticeAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeVideo" ADD CONSTRAINT "PracticeVideo_repertoireItemId_fkey" FOREIGN KEY ("repertoireItemId") REFERENCES "RepertoireItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeVideo" ADD CONSTRAINT "PracticeVideo_skillCategoryId_fkey" FOREIGN KEY ("skillCategoryId") REFERENCES "SkillCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoFeedback" ADD CONSTRAINT "VideoFeedback_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "PracticeVideo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoFeedback" ADD CONSTRAINT "VideoFeedback_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonNote" ADD CONSTRAINT "LessonNote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonNote" ADD CONSTRAINT "LessonNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonNote" ADD CONSTRAINT "LessonNote_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonSkillRating" ADD CONSTRAINT "LessonSkillRating_lessonNoteId_fkey" FOREIGN KEY ("lessonNoteId") REFERENCES "LessonNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonSkillRating" ADD CONSTRAINT "LessonSkillRating_skillCategoryId_fkey" FOREIGN KEY ("skillCategoryId") REFERENCES "SkillCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepertoireItem" ADD CONSTRAINT "RepertoireItem_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepertoireItem" ADD CONSTRAINT "RepertoireItem_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAssignment" ADD CONSTRAINT "PracticeAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAssignment" ADD CONSTRAINT "PracticeAssignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAssignment" ADD CONSTRAINT "PracticeAssignment_lessonNoteId_fkey" FOREIGN KEY ("lessonNoteId") REFERENCES "LessonNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAssignment" ADD CONSTRAINT "PracticeAssignment_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAssignment" ADD CONSTRAINT "PracticeAssignment_repertoireItemId_fkey" FOREIGN KEY ("repertoireItemId") REFERENCES "RepertoireItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeAssignment" ADD CONSTRAINT "PracticeAssignment_skillCategoryId_fkey" FOREIGN KEY ("skillCategoryId") REFERENCES "SkillCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeLog" ADD CONSTRAINT "PracticeLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeLog" ADD CONSTRAINT "PracticeLog_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "PracticeAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeLog" ADD CONSTRAINT "PracticeLog_repertoireItemId_fkey" FOREIGN KEY ("repertoireItemId") REFERENCES "RepertoireItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeLog" ADD CONSTRAINT "PracticeLog_skillCategoryId_fkey" FOREIGN KEY ("skillCategoryId") REFERENCES "SkillCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoSkillRating" ADD CONSTRAINT "VideoSkillRating_videoFeedbackId_fkey" FOREIGN KEY ("videoFeedbackId") REFERENCES "VideoFeedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoSkillRating" ADD CONSTRAINT "VideoSkillRating_skillCategoryId_fkey" FOREIGN KEY ("skillCategoryId") REFERENCES "SkillCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressReport" ADD CONSTRAINT "ProgressReport_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressReport" ADD CONSTRAINT "ProgressReport_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressReport" ADD CONSTRAINT "ProgressReport_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressRecord" ADD CONSTRAINT "ProgressRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressRecord" ADD CONSTRAINT "ProgressRecord_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnedSong" ADD CONSTRAINT "LearnedSong_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLogEntry" ADD CONSTRAINT "StudentLogEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentLogEntry" ADD CONSTRAINT "StudentLogEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceContactLink" ADD CONSTRAINT "InvoiceContactLink_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceSyncRun" ADD CONSTRAINT "InvoiceSyncRun_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceSyncRun" ADD CONSTRAINT "InvoiceSyncRun_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
