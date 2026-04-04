import { Prisma, NotificationType, Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { createStudentSchema } from "@/lib/validators/admin";

const DEFAULT_PLAN_ID = "plan_harmonizing_90";

async function resolveDefaultPlan() {
  const configured = await db.subscriptionPlan.findUnique({
    where: { id: DEFAULT_PLAN_ID },
  });

  if (configured?.active) return configured;

  return db.subscriptionPlan.findFirst({
    where: {
      active: true,
      priceUsd: 90,
      monthlyClassCount: 4,
    },
    orderBy: { createdAt: "asc" },
  });
}

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

  const [existingUser, teacher, plan] = await Promise.all([
    db.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    }),
    db.teacherProfile.findUnique({
      where: { id: data.teacherId },
      include: { user: true },
    }),
    resolveDefaultPlan(),
  ]);

  if (existingUser) {
    return NextResponse.json({ error: "Ya existe un usuario con este email." }, { status: 409 });
  }

  if (!teacher) {
    return NextResponse.json({ error: "Docente no encontrado." }, { status: 404 });
  }

  if (!plan) {
    return NextResponse.json({ error: "No hay plan activo configurado." }, { status: 400 });
  }

  try {
    const passwordHash = await hash(data.temporaryPassword, 10);

    const created = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name.trim(),
          email: data.email,
          passwordHash,
          role: Role.STUDENT,
          locale: "es",
          timezone: data.timezone,
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
          monthlyClassLimit: plan.monthlyClassCount,
          active: true,
        },
      });

      return { user, studentProfile, activeSubscription };
    });

    await createNotification({
      userId: created.user.id,
      type: NotificationType.SYSTEM,
      title: "Cuenta creada y docente asignado",
      body: `Tu cuenta en Harmonizing está activa. Docente asignada: ${teacher.user.name}.`,
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
        planName: plan.name,
        planLabel: `$${plan.priceUsd} USD / ${plan.monthlyClassCount} clases`,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un usuario con este email." }, { status: 409 });
    }

    return NextResponse.json({ error: "No se pudo crear el estudiante." }, { status: 500 });
  }
}
