-- Add manual payment records, protected payment receipts, and class credit ledger entries.
DO $$
BEGIN
  CREATE TYPE "NativeInvoicePaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CARD', 'WOMPI', 'MERCADO_PAGO', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "NativeInvoicePaymentStatus" AS ENUM ('ACTIVE', 'VOID');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ClassCreditLedgerEntryType" AS ENUM ('INVOICE_GRANT', 'CLASS_COMPLETED', 'CLASS_NO_SHOW', 'MANUAL_ADJUSTMENT', 'REVERSAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "NativeInvoicePayment" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "amountCop" INTEGER NOT NULL,
  "method" "NativeInvoicePaymentMethod" NOT NULL,
  "paymentDate" TIMESTAMP(3) NOT NULL,
  "reference" TEXT,
  "notes" TEXT,
  "status" "NativeInvoicePaymentStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdByUserId" TEXT NOT NULL,
  "voidedByUserId" TEXT,
  "voidedAt" TIMESTAMP(3),
  "voidReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NativeInvoicePayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NativeInvoicePaymentAttachment" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "uploadedByUserId" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NativeInvoicePaymentAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClassCreditLedgerEntry" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "invoiceId" TEXT,
  "classSessionId" TEXT,
  "type" "ClassCreditLedgerEntryType" NOT NULL,
  "delta" INTEGER NOT NULL,
  "reason" TEXT,
  "note" TEXT,
  "createdByUserId" TEXT,
  "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClassCreditLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NativeInvoicePayment_invoiceId_status_paymentDate_idx" ON "NativeInvoicePayment"("invoiceId", "status", "paymentDate");
CREATE INDEX IF NOT EXISTS "NativeInvoicePayment_studentId_paymentDate_idx" ON "NativeInvoicePayment"("studentId", "paymentDate");
CREATE INDEX IF NOT EXISTS "NativeInvoicePayment_createdByUserId_createdAt_idx" ON "NativeInvoicePayment"("createdByUserId", "createdAt");

CREATE INDEX IF NOT EXISTS "NativeInvoicePaymentAttachment_paymentId_createdAt_idx" ON "NativeInvoicePaymentAttachment"("paymentId", "createdAt");
CREATE INDEX IF NOT EXISTS "NativeInvoicePaymentAttachment_uploadedByUserId_createdAt_idx" ON "NativeInvoicePaymentAttachment"("uploadedByUserId", "createdAt");

CREATE INDEX IF NOT EXISTS "ClassCreditLedgerEntry_studentId_effectiveAt_idx" ON "ClassCreditLedgerEntry"("studentId", "effectiveAt");
CREATE INDEX IF NOT EXISTS "ClassCreditLedgerEntry_invoiceId_idx" ON "ClassCreditLedgerEntry"("invoiceId");
CREATE INDEX IF NOT EXISTS "ClassCreditLedgerEntry_classSessionId_idx" ON "ClassCreditLedgerEntry"("classSessionId");
CREATE INDEX IF NOT EXISTS "ClassCreditLedgerEntry_type_createdAt_idx" ON "ClassCreditLedgerEntry"("type", "createdAt");

DO $$
BEGIN
  ALTER TABLE "NativeInvoicePayment"
    ADD CONSTRAINT "NativeInvoicePayment_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "NativeInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "NativeInvoicePayment"
    ADD CONSTRAINT "NativeInvoicePayment_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "NativeInvoicePayment"
    ADD CONSTRAINT "NativeInvoicePayment_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "NativeInvoicePayment"
    ADD CONSTRAINT "NativeInvoicePayment_voidedByUserId_fkey"
    FOREIGN KEY ("voidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "NativeInvoicePaymentAttachment"
    ADD CONSTRAINT "NativeInvoicePaymentAttachment_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "NativeInvoicePayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "NativeInvoicePaymentAttachment"
    ADD CONSTRAINT "NativeInvoicePaymentAttachment_uploadedByUserId_fkey"
    FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClassCreditLedgerEntry"
    ADD CONSTRAINT "ClassCreditLedgerEntry_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClassCreditLedgerEntry"
    ADD CONSTRAINT "ClassCreditLedgerEntry_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "NativeInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClassCreditLedgerEntry"
    ADD CONSTRAINT "ClassCreditLedgerEntry_classSessionId_fkey"
    FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ClassCreditLedgerEntry"
    ADD CONSTRAINT "ClassCreditLedgerEntry_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
