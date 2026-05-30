-- CreateEnum
CREATE TYPE "StudentProvisioningImportBatchStatus" AS ENUM ('APPLIED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "StudentProvisioningImportRowStatus" AS ENUM ('APPLIED', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "StudentProvisioningImportBatch" (
    "id" TEXT NOT NULL,
    "filename" TEXT,
    "status" "StudentProvisioningImportBatchStatus" NOT NULL DEFAULT 'APPLIED',
    "totalRows" INTEGER NOT NULL,
    "validRows" INTEGER NOT NULL,
    "errorRows" INTEGER NOT NULL,
    "appliedRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "emailsSuppressed" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentProvisioningImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProvisioningImportRow" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "status" "StudentProvisioningImportRowStatus" NOT NULL,
    "studentEmail" TEXT NOT NULL,
    "studentName" TEXT,
    "teacherEmail" TEXT,
    "teacherName" TEXT,
    "guardianEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "errors" JSONB,
    "warnings" JSONB,
    "normalized" JSONB,
    "studentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentProvisioningImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentProvisioningImportBatch_createdAt_idx" ON "StudentProvisioningImportBatch"("createdAt");

-- CreateIndex
CREATE INDEX "StudentProvisioningImportBatch_status_createdAt_idx" ON "StudentProvisioningImportBatch"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StudentProvisioningImportRow_batchId_status_idx" ON "StudentProvisioningImportRow"("batchId", "status");

-- CreateIndex
CREATE INDEX "StudentProvisioningImportRow_studentEmail_idx" ON "StudentProvisioningImportRow"("studentEmail");

-- AddForeignKey
ALTER TABLE "StudentProvisioningImportBatch" ADD CONSTRAINT "StudentProvisioningImportBatch_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProvisioningImportRow" ADD CONSTRAINT "StudentProvisioningImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "StudentProvisioningImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
