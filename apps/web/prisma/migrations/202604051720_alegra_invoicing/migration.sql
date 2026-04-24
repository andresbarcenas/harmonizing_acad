-- CreateEnum
CREATE TYPE "InvoiceContactLinkStrategy" AS ENUM ('EMAIL_AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "InvoiceSyncScope" AS ENUM ('STUDENT', 'ALL');

-- CreateEnum
CREATE TYPE "InvoiceSyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

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

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceContactLink" ADD CONSTRAINT "InvoiceContactLink_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceSyncRun" ADD CONSTRAINT "InvoiceSyncRun_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceSyncRun" ADD CONSTRAINT "InvoiceSyncRun_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
