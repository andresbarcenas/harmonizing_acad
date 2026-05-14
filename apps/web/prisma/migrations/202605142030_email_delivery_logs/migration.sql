-- Central admin audit log for outbound email attempts.

CREATE TYPE "EmailDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');
CREATE TYPE "EmailDeliveryType" AS ENUM ('MAGIC_LINK', 'WELCOME', 'CONSENT_COPY', 'CLASS_REMINDER');
CREATE TYPE "EmailProvider" AS ENUM ('RESEND');

CREATE TABLE "EmailDeliveryLog" (
    "id" TEXT NOT NULL,
    "status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "type" "EmailDeliveryType" NOT NULL,
    "provider" "EmailProvider" NOT NULL DEFAULT 'RESEND',
    "recipientEmail" TEXT,
    "recipientUserId" TEXT,
    "subject" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "classSessionId" TEXT,
    "consentSignatureId" TEXT,
    "metadata" JSONB,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailDeliveryLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailDeliveryLog_status_attemptedAt_idx" ON "EmailDeliveryLog"("status", "attemptedAt");
CREATE INDEX "EmailDeliveryLog_type_attemptedAt_idx" ON "EmailDeliveryLog"("type", "attemptedAt");
CREATE INDEX "EmailDeliveryLog_recipientUserId_attemptedAt_idx" ON "EmailDeliveryLog"("recipientUserId", "attemptedAt");
CREATE INDEX "EmailDeliveryLog_recipientEmail_idx" ON "EmailDeliveryLog"("recipientEmail");
CREATE INDEX "EmailDeliveryLog_classSessionId_idx" ON "EmailDeliveryLog"("classSessionId");
CREATE INDEX "EmailDeliveryLog_consentSignatureId_idx" ON "EmailDeliveryLog"("consentSignatureId");

ALTER TABLE "EmailDeliveryLog" ADD CONSTRAINT "EmailDeliveryLog_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailDeliveryLog" ADD CONSTRAINT "EmailDeliveryLog_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailDeliveryLog" ADD CONSTRAINT "EmailDeliveryLog_consentSignatureId_fkey" FOREIGN KEY ("consentSignatureId") REFERENCES "ConsentSignature"("id") ON DELETE SET NULL ON UPDATE CASCADE;
