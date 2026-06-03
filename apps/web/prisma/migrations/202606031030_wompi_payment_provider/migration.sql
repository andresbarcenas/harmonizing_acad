-- Add native payment-provider metadata for Wompi hosted payment links.
ALTER TABLE "NativeInvoice"
  ADD COLUMN IF NOT EXISTS "paymentProviderLinkId" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentProviderEnvironment" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentProviderTransactionId" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentProviderAmountCop" INTEGER,
  ADD COLUMN IF NOT EXISTS "paymentProviderExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "paymentProviderLastSyncedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "NativeInvoice_paymentProvider_paymentProviderLinkId_idx"
  ON "NativeInvoice"("paymentProvider", "paymentProviderLinkId");

-- Allow automated provider-created payment records without pretending an admin created them.
ALTER TABLE "NativeInvoicePayment"
  DROP CONSTRAINT IF EXISTS "NativeInvoicePayment_createdByUserId_fkey";

ALTER TABLE "NativeInvoicePayment"
  ALTER COLUMN "createdByUserId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "provider" TEXT,
  ADD COLUMN IF NOT EXISTS "providerTransactionId" TEXT,
  ADD COLUMN IF NOT EXISTS "providerStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "providerPayload" JSONB;

ALTER TABLE "NativeInvoicePayment"
  ADD CONSTRAINT "NativeInvoicePayment_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "NativeInvoicePayment_provider_providerStatus_idx"
  ON "NativeInvoicePayment"("provider", "providerStatus");

CREATE UNIQUE INDEX IF NOT EXISTS "NativeInvoicePayment_provider_providerTransactionId_key"
  ON "NativeInvoicePayment"("provider", "providerTransactionId");

CREATE TABLE IF NOT EXISTS "PaymentProviderWebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "environment" TEXT,
  "eventType" TEXT NOT NULL,
  "checksum" TEXT,
  "transactionId" TEXT,
  "invoiceId" TEXT,
  "status" TEXT,
  "processingStatus" TEXT NOT NULL DEFAULT 'RECEIVED',
  "error" TEXT,
  "payload" JSONB NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentProviderWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentProviderWebhookEvent_provider_checksum_key"
  ON "PaymentProviderWebhookEvent"("provider", "checksum");

CREATE INDEX IF NOT EXISTS "PaymentProviderWebhookEvent_provider_eventType_receivedAt_idx"
  ON "PaymentProviderWebhookEvent"("provider", "eventType", "receivedAt");

CREATE INDEX IF NOT EXISTS "PaymentProviderWebhookEvent_provider_transactionId_idx"
  ON "PaymentProviderWebhookEvent"("provider", "transactionId");

CREATE INDEX IF NOT EXISTS "PaymentProviderWebhookEvent_invoiceId_receivedAt_idx"
  ON "PaymentProviderWebhookEvent"("invoiceId", "receivedAt");
