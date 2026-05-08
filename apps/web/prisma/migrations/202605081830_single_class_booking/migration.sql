-- CreateEnum
CREATE TYPE "ClassSessionType" AS ENUM ('RECURRING', 'SINGLE', 'TRIAL', 'MAKEUP', 'EXTRA', 'EVALUATION', 'REPLACEMENT');

-- CreateEnum
CREATE TYPE "ClassRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "ClassSession"
  ADD COLUMN "classRequestId" TEXT,
  ADD COLUMN "type" "ClassSessionType" NOT NULL DEFAULT 'RECURRING',
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
  ADD COLUMN "instrument" TEXT,
  ADD COLUMN "locationMode" TEXT NOT NULL DEFAULT 'ONLINE',
  ADD COLUMN "internalNote" TEXT,
  ADD COLUMN "studentVisibleNote" TEXT;

-- CreateTable
CREATE TABLE "ClassRequest" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "reviewedByUserId" TEXT,
  "type" "ClassSessionType" NOT NULL,
  "status" "ClassRequestStatus" NOT NULL DEFAULT 'PENDING',
  "preferredStartUtc" TIMESTAMP(3) NOT NULL,
  "preferredEndUtc" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
  "durationMin" INTEGER NOT NULL,
  "studentMessage" TEXT,
  "reviewerResponse" TEXT,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClassRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassSession_classRequestId_key" ON "ClassSession"("classRequestId");

-- CreateIndex
CREATE INDEX "ClassSession_type_startsAtUtc_idx" ON "ClassSession"("type", "startsAtUtc");

-- CreateIndex
CREATE INDEX "ClassRequest_studentId_status_createdAt_idx" ON "ClassRequest"("studentId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ClassRequest_teacherId_status_createdAt_idx" ON "ClassRequest"("teacherId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ClassRequest_preferredStartUtc_idx" ON "ClassRequest"("preferredStartUtc");

-- CreateIndex
CREATE INDEX "ClassRequest_type_status_idx" ON "ClassRequest"("type", "status");

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_classRequestId_fkey" FOREIGN KEY ("classRequestId") REFERENCES "ClassRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassRequest" ADD CONSTRAINT "ClassRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassRequest" ADD CONSTRAINT "ClassRequest_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassRequest" ADD CONSTRAINT "ClassRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassRequest" ADD CONSTRAINT "ClassRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
