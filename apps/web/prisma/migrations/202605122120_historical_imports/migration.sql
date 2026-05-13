-- Historical PDF import staging for reviewed, provenance-safe student history imports.
CREATE TYPE "HistoricalImportBatchStatus" AS ENUM ('STAGED', 'REVIEWING', 'APPLIED', 'CANCELLED', 'FAILED');
CREATE TYPE "HistoricalImportRowStatus" AS ENUM ('STAGED', 'APPROVED', 'APPLIED', 'SKIPPED', 'SOURCE_ONLY', 'ERROR');
CREATE TYPE "HistoricalImportSuggestionType" AS ENUM ('STUDENT_LOG', 'LESSON_NOTE', 'REPERTOIRE', 'PRACTICE_ASSIGNMENT', 'PROGRESS_REPORT', 'SKILL_EVIDENCE', 'SOURCE_ONLY', 'UNKNOWN');

CREATE TABLE "HistoricalImportBatch" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "sourceFilename" TEXT NOT NULL,
    "sourcePath" TEXT,
    "sourceSha256" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'PDF',
    "pageCount" INTEGER NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "status" "HistoricalImportBatchStatus" NOT NULL DEFAULT 'STAGED',
    "environmentNote" TEXT,
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HistoricalImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HistoricalImportRow" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sourcePage" INTEGER NOT NULL,
    "rowHash" TEXT NOT NULL,
    "rawText" TEXT,
    "suggestedType" "HistoricalImportSuggestionType" NOT NULL DEFAULT 'UNKNOWN',
    "suggestedPayload" JSONB NOT NULL DEFAULT '{}',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "HistoricalImportRowStatus" NOT NULL DEFAULT 'STAGED',
    "appliedEntityType" TEXT,
    "appliedEntityId" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HistoricalImportRow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HistoricalImportBatch_studentId_sourceFilename_sourceSha256_key" ON "HistoricalImportBatch"("studentId", "sourceFilename", "sourceSha256");
CREATE INDEX "HistoricalImportBatch_studentId_createdAt_idx" ON "HistoricalImportBatch"("studentId", "createdAt");
CREATE INDEX "HistoricalImportBatch_status_createdAt_idx" ON "HistoricalImportBatch"("status", "createdAt");

CREATE UNIQUE INDEX "HistoricalImportRow_batchId_sourcePage_rowHash_key" ON "HistoricalImportRow"("batchId", "sourcePage", "rowHash");
CREATE INDEX "HistoricalImportRow_batchId_status_sourcePage_idx" ON "HistoricalImportRow"("batchId", "status", "sourcePage");
CREATE INDEX "HistoricalImportRow_studentId_status_createdAt_idx" ON "HistoricalImportRow"("studentId", "status", "createdAt");
CREATE INDEX "HistoricalImportRow_suggestedType_confidence_idx" ON "HistoricalImportRow"("suggestedType", "confidence");

ALTER TABLE "HistoricalImportBatch" ADD CONSTRAINT "HistoricalImportBatch_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HistoricalImportBatch" ADD CONSTRAINT "HistoricalImportBatch_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HistoricalImportRow" ADD CONSTRAINT "HistoricalImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "HistoricalImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HistoricalImportRow" ADD CONSTRAINT "HistoricalImportRow_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HistoricalImportRow" ADD CONSTRAINT "HistoricalImportRow_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
