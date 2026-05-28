import "server-only";

import { Role } from "@prisma/client";

import { buildMagicLinkUrl, createMagicLinkToken, WELCOME_MAGIC_LINK_MAX_AGE_SECONDS } from "@/lib/auth/magic-link";
import { db } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email/welcome";
import { getRequestLocale } from "@/lib/i18n/request";

export type GuardianLinkInput = {
  studentId: string;
  name: string;
  email: string;
  relationship: string;
  phone?: string | null;
  primaryContact?: boolean;
  actorLocale: "en" | "es";
  baseUrl: string;
};

export class GuardianLinkError extends Error {
  constructor(public code: "STUDENT_NOT_FOUND" | "EMAIL_IN_USE" | "CREATE_FAILED", public status = 400) {
    super(code);
    this.name = "GuardianLinkError";
  }
}

export async function createOrLinkGuardian(input: GuardianLinkInput) {
  const normalizedEmail = input.email.toLowerCase().trim();
  const student = await db.studentProfile.findUnique({
    where: { id: input.studentId },
    include: { user: true, assignment: { include: { teacher: { include: { user: true } } } }, subscriptions: { where: { active: true }, take: 1 } },
  });
  if (!student) throw new GuardianLinkError("STUDENT_NOT_FOUND", 404);

  const existingUser = await db.user.findUnique({
    where: { email: normalizedEmail },
    include: { parentGuardianProfile: true },
  });

  if (existingUser && existingUser.role !== Role.PARENT) {
    throw new GuardianLinkError("EMAIL_IN_USE", 409);
  }

  const created = await db.$transaction(async (tx) => {
    let parentUser = existingUser;
    if (!parentUser) {
      parentUser = await tx.user.create({
        data: {
          name: input.name.trim(),
          email: normalizedEmail,
          role: Role.PARENT,
          timezone: student.user.timezone,
        },
        include: { parentGuardianProfile: true },
      });
    } else if (parentUser.name !== input.name.trim()) {
      parentUser = await tx.user.update({
        where: { id: parentUser.id },
        data: { name: input.name.trim() },
        include: { parentGuardianProfile: true },
      });
    }

    const parentProfile = parentUser.parentGuardianProfile ?? await tx.parentGuardianProfile.create({
      data: {
        userId: parentUser.id,
        phone: input.phone?.trim() || null,
      },
    });

    if (parentUser.parentGuardianProfile && input.phone !== undefined) {
      await tx.parentGuardianProfile.update({
        where: { id: parentProfile.id },
        data: { phone: input.phone?.trim() || null },
      });
    }

    if (input.primaryContact) {
      await tx.parentStudentLink.updateMany({
        where: { studentId: input.studentId, primaryContact: true },
        data: { primaryContact: false },
      });
    }

    const link = await tx.parentStudentLink.upsert({
      where: { parentId_studentId: { parentId: parentProfile.id, studentId: input.studentId } },
      update: {
        relationship: input.relationship.trim(),
        primaryContact: Boolean(input.primaryContact),
      },
      create: {
        parentId: parentProfile.id,
        studentId: input.studentId,
        relationship: input.relationship.trim(),
        primaryContact: Boolean(input.primaryContact),
      },
    });

    return { parentUser, parentProfile, link, isNewUser: !existingUser, student };
  });

  let welcomeEmail: { sent: boolean; skipped?: boolean; reason?: string; messageId?: string } = { sent: false, skipped: true, reason: "existing guardian" };
  let previewUrl: string | undefined;
  if (created.isNewUser) {
    try {
      const { token } = await createMagicLinkToken(created.parentUser.email, { maxAgeSeconds: WELCOME_MAGIC_LINK_MAX_AGE_SECONDS });
      const magicLinkUrl = buildMagicLinkUrl({ baseUrl: input.baseUrl, email: created.parentUser.email, token });
      if (process.env.NODE_ENV !== "production") previewUrl = magicLinkUrl;
      const locale = await getRequestLocale(created.parentUser.locale);
      const delivery = await sendWelcomeEmail({
        to: created.parentUser.email,
        name: created.parentUser.name,
        recipientUserId: created.parentUser.id,
        role: Role.PARENT,
        locale,
        magicLinkUrl,
        expiresHours: Math.round(WELCOME_MAGIC_LINK_MAX_AGE_SECONDS / 3600),
        teacherName: created.student.assignment?.teacher.user.name,
        planLabel: null,
        instrument: created.student.preferredInstrument,
      });
      welcomeEmail = delivery.sent ? { sent: true, messageId: delivery.messageId } : { sent: false, skipped: true, reason: delivery.reason };
    } catch (error) {
      welcomeEmail = { sent: false, reason: error instanceof Error ? error.message : "Unknown welcome email error" };
    }
  }

  return { ...created, welcomeEmail, previewUrl };
}
