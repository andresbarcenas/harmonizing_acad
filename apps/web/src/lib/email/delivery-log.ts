import "server-only";

import { EmailDeliveryStatus, EmailDeliveryType, EmailProvider, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

type EmailLogInput = {
  type: EmailDeliveryType;
  recipientEmail?: string | null;
  recipientUserId?: string | null;
  subject: string;
  provider?: EmailProvider;
  classSessionId?: string | null;
  consentSignatureId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

type EmailLogUpdate = {
  providerMessageId?: string | null;
  errorMessage?: string | null;
};

async function safeLog<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    console.error("Email delivery logging failed", error);
    return null;
  }
}

export async function createEmailDeliveryLog(input: EmailLogInput) {
  return safeLog(async () => {
    const record = await db.emailDeliveryLog.create({
      data: {
        status: EmailDeliveryStatus.PENDING,
        type: input.type,
        provider: input.provider ?? EmailProvider.RESEND,
        recipientEmail: input.recipientEmail?.trim() || null,
        recipientUserId: input.recipientUserId ?? null,
        subject: input.subject,
        classSessionId: input.classSessionId ?? null,
        consentSignatureId: input.consentSignatureId ?? null,
        metadata: input.metadata,
      },
      select: { id: true },
    });
    return record.id;
  });
}

export async function recordSkippedEmailDelivery(input: EmailLogInput, reason: string) {
  return safeLog(async () => {
    const record = await db.emailDeliveryLog.create({
      data: {
        status: EmailDeliveryStatus.SKIPPED,
        type: input.type,
        provider: input.provider ?? EmailProvider.RESEND,
        recipientEmail: input.recipientEmail?.trim() || null,
        recipientUserId: input.recipientUserId ?? null,
        subject: input.subject,
        errorMessage: reason,
        classSessionId: input.classSessionId ?? null,
        consentSignatureId: input.consentSignatureId ?? null,
        metadata: input.metadata,
      },
      select: { id: true },
    });
    return record.id;
  });
}

export async function markEmailDeliverySent(logId: string | null | undefined, update: EmailLogUpdate = {}) {
  if (!logId) return null;
  return safeLog(() => db.emailDeliveryLog.update({
    where: { id: logId },
    data: {
      status: EmailDeliveryStatus.SENT,
      providerMessageId: update.providerMessageId ?? null,
      errorMessage: null,
      sentAt: new Date(),
    },
  }));
}

export async function markEmailDeliveryFailed(logId: string | null | undefined, update: EmailLogUpdate) {
  if (!logId) return null;
  return safeLog(() => db.emailDeliveryLog.update({
    where: { id: logId },
    data: {
      status: EmailDeliveryStatus.FAILED,
      providerMessageId: update.providerMessageId ?? null,
      errorMessage: update.errorMessage ?? "Unknown email provider error",
    },
  }));
}
