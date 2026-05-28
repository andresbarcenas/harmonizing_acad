-- Add Harmonizing-owned native invoicing while preserving Alegra-synced invoice cache tables.
ALTER TYPE "EmailDeliveryType" ADD VALUE IF NOT EXISTS 'INVOICE';

DO $$
BEGIN
  CREATE TYPE "NativeInvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'CLOSED', 'VOID');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "StudentBillingProfile" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "defaultSessionCount" INTEGER NOT NULL DEFAULT 4,
  "pricePerClassCop" INTEGER NOT NULL DEFAULT 70834,
  "notes" TEXT,
  "autoGenerateEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StudentBillingProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NativeInvoiceSequence" (
  "id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NativeInvoiceSequence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NativeInvoice" (
  "id" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "recipientUserId" TEXT,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "recipientName" TEXT NOT NULL,
  "recipientEmail" TEXT NOT NULL,
  "recipientRole" TEXT,
  "studentNameSnapshot" TEXT NOT NULL,
  "status" "NativeInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "currency" TEXT NOT NULL DEFAULT 'COP',
  "issueDate" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "sessionCount" INTEGER NOT NULL,
  "cadenceLabel" TEXT NOT NULL,
  "pricePerClassCop" INTEGER NOT NULL,
  "subtotalCop" INTEGER NOT NULL,
  "taxCop" INTEGER NOT NULL DEFAULT 0,
  "totalCop" INTEGER NOT NULL,
  "balanceCop" INTEGER NOT NULL,
  "pdfBytes" BYTEA,
  "pdfSha256" TEXT,
  "pdfGeneratedAt" TIMESTAMP(3),
  "emailedAt" TIMESTAMP(3),
  "emailStatus" "EmailDeliveryStatus",
  "emailError" TEXT,
  "paymentProvider" TEXT,
  "paymentUrl" TEXT,
  "paymentProviderStatus" TEXT,
  "legalFooter" TEXT,
  "notes" TEXT,
  "openedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NativeInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NativeInvoiceLineItem" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPriceCop" INTEGER NOT NULL,
  "totalCop" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NativeInvoiceLineItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudentBillingProfile_studentId_key" ON "StudentBillingProfile"("studentId");
CREATE INDEX IF NOT EXISTS "StudentBillingProfile_autoGenerateEnabled_idx" ON "StudentBillingProfile"("autoGenerateEnabled");

CREATE UNIQUE INDEX IF NOT EXISTS "NativeInvoiceSequence_year_key" ON "NativeInvoiceSequence"("year");

CREATE UNIQUE INDEX IF NOT EXISTS "NativeInvoice_invoiceNumber_key" ON "NativeInvoice"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "NativeInvoice_studentId_issueDate_idx" ON "NativeInvoice"("studentId", "issueDate");
CREATE INDEX IF NOT EXISTS "NativeInvoice_status_dueDate_idx" ON "NativeInvoice"("status", "dueDate");
CREATE INDEX IF NOT EXISTS "NativeInvoice_recipientUserId_issueDate_idx" ON "NativeInvoice"("recipientUserId", "issueDate");

CREATE INDEX IF NOT EXISTS "NativeInvoiceLineItem_invoiceId_sortOrder_idx" ON "NativeInvoiceLineItem"("invoiceId", "sortOrder");

DO $$
BEGIN
  ALTER TABLE "StudentBillingProfile"
    ADD CONSTRAINT "StudentBillingProfile_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "NativeInvoice"
    ADD CONSTRAINT "NativeInvoice_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "NativeInvoice"
    ADD CONSTRAINT "NativeInvoice_recipientUserId_fkey"
    FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "NativeInvoice"
    ADD CONSTRAINT "NativeInvoice_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "NativeInvoice"
    ADD CONSTRAINT "NativeInvoice_updatedByUserId_fkey"
    FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "NativeInvoiceLineItem"
    ADD CONSTRAINT "NativeInvoiceLineItem_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "NativeInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
