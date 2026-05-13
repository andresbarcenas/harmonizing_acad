-- Add repertoire song sheet attachments and idempotent class email reminder deliveries.
CREATE TYPE "RepertoireAttachmentType" AS ENUM ('SHEET_MUSIC');
CREATE TYPE "ClassReminderChannel" AS ENUM ('EMAIL');
CREATE TYPE "ClassReminderStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

CREATE TABLE "RepertoireAttachment" (
    "id" TEXT NOT NULL,
    "repertoireItemId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "type" "RepertoireAttachmentType" NOT NULL DEFAULT 'SHEET_MUSIC',
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepertoireAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClassReminderDelivery" (
    "id" TEXT NOT NULL,
    "classSessionId" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "channel" "ClassReminderChannel" NOT NULL DEFAULT 'EMAIL',
    "offsetMinutes" INTEGER NOT NULL,
    "scheduledForUtc" TIMESTAMP(3) NOT NULL,
    "status" "ClassReminderStatus" NOT NULL DEFAULT 'SENT',
    "resendMessageId" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassReminderDelivery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RepertoireAttachment_repertoireItemId_createdAt_idx" ON "RepertoireAttachment"("repertoireItemId", "createdAt");
CREATE INDEX "RepertoireAttachment_uploadedByUserId_createdAt_idx" ON "RepertoireAttachment"("uploadedByUserId", "createdAt");

CREATE UNIQUE INDEX "ClassReminderDelivery_classSessionId_recipientUserId_channel_offsetMinutes_key" ON "ClassReminderDelivery"("classSessionId", "recipientUserId", "channel", "offsetMinutes");
CREATE INDEX "ClassReminderDelivery_recipientUserId_createdAt_idx" ON "ClassReminderDelivery"("recipientUserId", "createdAt");
CREATE INDEX "ClassReminderDelivery_status_createdAt_idx" ON "ClassReminderDelivery"("status", "createdAt");

ALTER TABLE "RepertoireAttachment" ADD CONSTRAINT "RepertoireAttachment_repertoireItemId_fkey" FOREIGN KEY ("repertoireItemId") REFERENCES "RepertoireItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RepertoireAttachment" ADD CONSTRAINT "RepertoireAttachment_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassReminderDelivery" ADD CONSTRAINT "ClassReminderDelivery_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassReminderDelivery" ADD CONSTRAINT "ClassReminderDelivery_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
