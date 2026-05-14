import { Prisma, NotificationType, Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { manualPlanDescription, manualPlanId, manualPlanName, planLabel } from "@/lib/billing/manual-plans";
import { db } from "@/lib/db";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";
import { createNotification } from "@/lib/notifications";
import { createStudentSchema } from "@/lib/validators/admin";

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  if (!teacher) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Docente no encontrado." : "Teacher not found." }, { status: 404 });
  }

  try {
    const adminTimezone = normalizeIanaTimezone(adminUser?.timezone ?? auth.user.timezone);
    const studentTimezone = normalizeIanaTimezone(data.timezone ?? adminTimezone);
    const passwordHash = await hash(data.temporaryPassword, 10);

    const created = await db.$transaction(async (tx) => {
      const plan = await tx.subscriptionPlan.upsert({
        where: { id: manualPlanId(data.monthlyClassCount, data.priceUsd) },
        update: {
          name: manualPlanName(data.monthlyClassCount, auth.user.locale),
          priceUsd: data.priceUsd,
          monthlyClassCount: data.monthlyClassCount,
          description: manualPlanDescription(auth.user.locale),
          active: true,
        },
        create: {
          id: manualPlanId(data.monthlyClassCount, data.priceUsd),
          name: manualPlanName(data.monthlyClassCount, auth.user.locale),
          priceUsd: data.priceUsd,
          monthlyClassCount: data.monthlyClassCount,
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
          locale: "en",
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
          monthlyClassLimit: data.monthlyClassCount,
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

    return NextResponse.json({
      student: {
        userId: created.user.id,
        studentId: created.studentProfile.id,
        name: created.user.name,
        email: created.user.email,
        image: created.user.image,
        teacherName: teacher.user.name,
        planName: created.plan.name,
        planLabel: planLabel(created.plan, auth.user.locale),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: auth.user.locale === "es" ? "Ya existe un usuario con este email." : "A user with this email already exists." }, { status: 409 });
    }

    return NextResponse.json({ error: auth.user.locale === "es" ? "No se pudo crear el estudiante." : "Could not create the student." }, { status: 500 });
  }
}
