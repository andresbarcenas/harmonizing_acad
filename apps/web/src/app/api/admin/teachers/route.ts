import { Prisma, NotificationType, Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { buildMagicLinkUrl, createMagicLinkToken, WELCOME_MAGIC_LINK_MAX_AGE_SECONDS } from "@/lib/auth/magic-link";
import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email/welcome";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";
import { getRequestLocale } from "@/lib/i18n/request";
import { createNotification } from "@/lib/notifications";
import { createTeacherSchema } from "@/lib/validators/admin";

function baseUrlFromRequest(request: Request) {
  return process.env.NEXTAUTH_URL?.trim() || new URL(request.url).origin;
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createTeacherSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const [existingUser, adminUser] = await Promise.all([
    db.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    }),
    db.user.findUnique({
      where: { id: auth.user.id },
      select: { timezone: true },
    }),
  ]);

  if (existingUser) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Ya existe un usuario con este email." : "A user with this email already exists." }, { status: 409 });
  }

  try {
    const adminTimezone = normalizeIanaTimezone(adminUser?.timezone ?? auth.user.timezone);
    const teacherTimezone = normalizeIanaTimezone(data.timezone ?? adminTimezone);
    const passwordHash = await hash(data.temporaryPassword, 10);

    const created = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name.trim(),
          email: data.email,
          passwordHash,
          role: Role.TEACHER,
          timezone: teacherTimezone,
          image: data.profileImage ?? null,
        },
      });

      const teacherProfile = await tx.teacherProfile.create({
        data: {
          userId: user.id,
          specialty: data.specialty.trim(),
          bio: data.bio ?? null,
        },
      });

      const availabilityRows = (data.availability ?? []).map((block) => ({
        teacherId: teacherProfile.id,
        weekday: block.weekday,
        startMinuteLocal: block.startMinuteLocal,
        endMinuteLocal: block.endMinuteLocal,
        timezone: teacherTimezone,
      }));

      if (availabilityRows.length) {
        await tx.teacherAvailability.createMany({
          data: availabilityRows,
        });
      }

      return { user, teacherProfile, availabilityCount: availabilityRows.length };
    });

    await createNotification({
      userId: created.user.id,
      type: NotificationType.SYSTEM,
      title: "Teacher account created",
      body: "Your teacher profile is now active in Harmonizing.",
      actionUrl: "/teacher/dashboard",
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
      const delivery = await sendWelcomeEmail({
        to: created.user.email,
        name: created.user.name,
        recipientUserId: created.user.id,
        role: Role.TEACHER,
        locale,
        magicLinkUrl,
        expiresHours: Math.round(WELCOME_MAGIC_LINK_MAX_AGE_SECONDS / 3600),
        instrument: created.teacherProfile.specialty,
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

    return NextResponse.json({
      teacher: {
        userId: created.user.id,
        teacherId: created.teacherProfile.id,
        name: created.user.name,
        email: created.user.email,
        image: created.user.image,
        specialty: created.teacherProfile.specialty,
        timezone: created.user.timezone,
        availabilityCount: created.availabilityCount,
      },
      welcomeEmail: {
        ...welcomeEmail,
        previewUrl: process.env.NODE_ENV !== "production" ? welcomePreviewUrl : undefined,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: auth.user.locale === "es" ? "Ya existe un usuario con este email." : "A user with this email already exists." }, { status: 409 });
    }

    return NextResponse.json({ error: auth.user.locale === "es" ? "No se pudo crear el docente." : "Could not create the teacher." }, { status: 500 });
  }
}
