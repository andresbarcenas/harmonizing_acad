import { Prisma, NotificationType, Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { buildMagicLinkUrl, createMagicLinkToken, WELCOME_MAGIC_LINK_MAX_AGE_SECONDS } from "@/lib/auth/magic-link";
import { requireApiUser } from "@/lib/api-auth";
import { createOrLinkGuardian } from "@/lib/admin/guardians";
import { INTERNAL_CLASS_ALLOWANCE_PRICE_USD, manualPlanDescription, manualPlanId, manualPlanName, planLabel, type ManualMonthlyClassCount } from "@/lib/billing/manual-plans";
import { db } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email/welcome";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";
import { getRequestLocale } from "@/lib/i18n/request";
import { createNotification } from "@/lib/notifications";
import { createStudentSchema } from "@/lib/validators/admin";

function baseUrlFromRequest(request: Request) {
  return process.env.NEXTAUTH_URL?.trim() || new URL(request.url).origin;
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No autorizado." : "Forbidden." }, { status: 403 });
  }

  const parsed = createStudentSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const [existingUser, teacher, adminUser] = await Promise.all([
    db.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    }),
    db.teacherProfile.findUnique({
      where: { id: data.teacherId },
      include: { user: true },
    }),
    db.user.findUnique({
      where: { id: auth.user.id },
      select: { timezone: true },
    }),
  ]);

  if (existingUser) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Ya existe un usuario con este email." : "A user with this email already exists." }, { status: 409 });
  }

  if (data.guardian?.email === data.email) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "El acudiente debe usar un correo diferente al estudiante." : "The guardian must use a different email than the student." }, { status: 400 });
  }

  if (data.guardian?.email) {
    const existingGuardianUser = await db.user.findUnique({
      where: { email: data.guardian.email },
      select: { role: true },
    });
    if (existingGuardianUser && existingGuardianUser.role !== Role.PARENT) {
      return NextResponse.json({ error: auth.user.locale === "es" ? "Ese email ya pertenece a otra cuenta." : "That email belongs to another account." }, { status: 409 });
    }
  }

  if (!teacher) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Docente no encontrado." : "Teacher not found." }, { status: 404 });
  }

  try {
    const adminTimezone = normalizeIanaTimezone(adminUser?.timezone ?? auth.user.timezone);
    const studentTimezone = normalizeIanaTimezone(data.timezone ?? adminTimezone);
    const monthlyClassCount = data.monthlyClassCount as ManualMonthlyClassCount;
    const passwordHash = await hash(data.temporaryPassword, 10);

    const created = await db.$transaction(async (tx) => {
      const plan = await tx.subscriptionPlan.upsert({
        where: { id: manualPlanId(monthlyClassCount) },
        update: {
          name: manualPlanName(monthlyClassCount, auth.user.locale),
          priceUsd: INTERNAL_CLASS_ALLOWANCE_PRICE_USD,
          monthlyClassCount,
          description: manualPlanDescription(auth.user.locale),
          active: true,
        },
        create: {
          id: manualPlanId(monthlyClassCount),
          name: manualPlanName(monthlyClassCount, auth.user.locale),
          priceUsd: INTERNAL_CLASS_ALLOWANCE_PRICE_USD,
          monthlyClassCount,
          description: manualPlanDescription(auth.user.locale),
          active: true,
        },
      });

      const user = await tx.user.create({
        data: {
          name: data.name.trim(),
          email: data.email,
          passwordHash,
          role: Role.STUDENT,
          timezone: studentTimezone,
          image: data.profileImage ?? null,
        },
      });

      const studentProfile = await tx.studentProfile.create({
        data: {
          userId: user.id,
          phone: data.phone?.trim() || null,
          preferredInstrument: data.preferredInstrument?.trim() || null,
          bio: data.bio?.trim() || null,
        },
      });

      await tx.teacherAssignment.create({
        data: {
          studentId: studentProfile.id,
          teacherId: data.teacherId,
          assignedBy: auth.user.id,
        },
      });

      const activeSubscription = await tx.activeSubscription.create({
        data: {
          studentId: studentProfile.id,
          planId: plan.id,
          startsAt: new Date(),
          monthlyClassLimit: monthlyClassCount,
          active: true,
        },
      });

      return { user, studentProfile, activeSubscription, plan };
    });

    await createNotification({
      userId: created.user.id,
      type: NotificationType.SYSTEM,
      title: "Account created and teacher assigned",
      body: `Your Harmonizing account is active. Assigned teacher: ${teacher.user.name}.`,
      actionUrl: "/dashboard",
    });

    let welcomeEmail: { sent: boolean; skipped?: boolean; reason?: string; messageId?: string } = { sent: false, skipped: true, reason: "not attempted" };
    let welcomePreviewUrl: string | undefined;
    try {
      const { token } = await createMagicLinkToken(created.user.email, { maxAgeSeconds: WELCOME_MAGIC_LINK_MAX_AGE_SECONDS });
      const magicLinkUrl = buildMagicLinkUrl({ baseUrl: baseUrlFromRequest(req), email: created.user.email, token });
      if (process.env.NODE_ENV !== "production") {
        welcomePreviewUrl = magicLinkUrl;
      }
      const locale = await getRequestLocale(created.user.locale);
      const label = planLabel(created.plan, locale);
      const delivery = await sendWelcomeEmail({
        to: created.user.email,
        name: created.user.name,
        recipientUserId: created.user.id,
        role: Role.STUDENT,
        locale,
        magicLinkUrl,
        expiresHours: Math.round(WELCOME_MAGIC_LINK_MAX_AGE_SECONDS / 3600),
        teacherName: teacher.user.name,
        planLabel: label,
        instrument: created.studentProfile.preferredInstrument,
      });
      welcomeEmail = delivery.sent
        ? { sent: true, messageId: delivery.messageId }
        : { sent: false, skipped: true, reason: delivery.reason };
    } catch (welcomeError) {
      console.error("Welcome email delivery failed", welcomeError);
      welcomeEmail = {
        sent: false,
        reason: welcomeError instanceof Error ? welcomeError.message : "Unknown welcome email error",
      };
    }

    const guardian = data.guardian
      ? await createOrLinkGuardian({
          studentId: created.studentProfile.id,
          ...data.guardian,
          actorLocale: auth.user.locale,
          baseUrl: baseUrlFromRequest(req),
        })
      : null;

    return NextResponse.json({
      student: {
        userId: created.user.id,
        studentId: created.studentProfile.id,
        name: created.user.name,
        email: created.user.email,
        image: created.user.image,
        teacherName: teacher.user.name,
        planLabel: planLabel(created.plan, auth.user.locale),
        guardianName: guardian?.parentUser.name ?? null,
        guardianEmail: guardian?.parentUser.email ?? null,
      },
      welcomeEmail: {
        ...welcomeEmail,
        previewUrl: process.env.NODE_ENV !== "production" ? welcomePreviewUrl : undefined,
      },
      guardianWelcomeEmail: guardian
        ? {
            ...guardian.welcomeEmail,
            previewUrl: process.env.NODE_ENV !== "production" ? guardian.previewUrl : undefined,
          }
        : null,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: auth.user.locale === "es" ? "Ya existe un usuario con este email." : "A user with this email already exists." }, { status: 409 });
    }

    return NextResponse.json({ error: auth.user.locale === "es" ? "No se pudo crear el estudiante." : "Could not create the student." }, { status: 500 });
  }
}
