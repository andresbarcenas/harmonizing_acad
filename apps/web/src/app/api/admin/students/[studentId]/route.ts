import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { manualPlanDescription, manualPlanId, manualPlanName, planLabel, type ManualMonthlyClassCount } from "@/lib/billing/manual-plans";
import { db } from "@/lib/db";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";
import { updateStudentSchema } from "@/lib/validators/admin";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { studentId } = await params;
  const parsed = updateStudentSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const student = await db.studentProfile.findUnique({
    where: { id: studentId },
    include: {
      user: true,
      assignment: true,
      subscriptions: {
        where: { active: true },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!student) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Estudiante no encontrado." : "Student not found." }, { status: 404 });
  }

  if (data.teacherId) {
    const teacher = await db.teacherProfile.findUnique({
      where: { id: data.teacherId },
      select: { id: true },
    });
    if (!teacher) {
      return NextResponse.json({ error: auth.user.locale === "es" ? "Docente no encontrado." : "Teacher not found." }, { status: 404 });
    }
  }

  if (data.email !== student.user.email) {
    const existing = await db.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: auth.user.locale === "es" ? "Ya existe un usuario con este email." : "A user with this email already exists." }, { status: 409 });
    }
  }

  try {
    const updated = await db.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: student.userId },
        data: {
          name: data.name,
          email: data.email,
          timezone: data.timezone ? normalizeIanaTimezone(data.timezone) : undefined,
          image: data.profileImage ?? null,
        },
      });

      const profile = await tx.studentProfile.update({
        where: { id: studentId },
        data: {
          phone: data.phone ?? null,
          preferredInstrument: data.preferredInstrument ?? null,
          bio: data.bio ?? null,
        },
      });

      if (data.teacherId) {
        if (student.assignment) {
          await tx.teacherAssignment.update({
            where: { studentId },
            data: { teacherId: data.teacherId, assignedBy: auth.user.id },
          });
        } else {
          await tx.teacherAssignment.create({
            data: { studentId, teacherId: data.teacherId, assignedBy: auth.user.id },
          });
        }
      }

      let activePlan = student.subscriptions[0]?.plan ?? null;
      if (typeof data.monthlyClassCount === "number" && typeof data.priceUsd === "number") {
        const monthlyClassCount = data.monthlyClassCount as ManualMonthlyClassCount;
        const currentSubscription = student.subscriptions[0] ?? null;
        const planChanged =
          !currentSubscription ||
          currentSubscription.monthlyClassLimit !== monthlyClassCount ||
          currentSubscription.plan.monthlyClassCount !== monthlyClassCount ||
          currentSubscription.plan.priceUsd !== data.priceUsd;

        if (planChanged) {
          const now = new Date();
          const plan = await tx.subscriptionPlan.upsert({
            where: { id: manualPlanId(monthlyClassCount, data.priceUsd) },
            update: {
              name: manualPlanName(monthlyClassCount, auth.user.locale),
              priceUsd: data.priceUsd,
              monthlyClassCount,
              description: manualPlanDescription(auth.user.locale),
              active: true,
            },
            create: {
              id: manualPlanId(monthlyClassCount, data.priceUsd),
              name: manualPlanName(monthlyClassCount, auth.user.locale),
              priceUsd: data.priceUsd,
              monthlyClassCount,
              description: manualPlanDescription(auth.user.locale),
              active: true,
            },
          });

          await tx.activeSubscription.updateMany({
            where: { studentId, active: true },
            data: { active: false, endsAt: now },
          });

          await tx.activeSubscription.create({
            data: {
              studentId,
              planId: plan.id,
              startsAt: now,
              monthlyClassLimit: monthlyClassCount,
              active: true,
            },
          });

          activePlan = plan;
        }
      }

      return { user, profile, activePlan };
    });

    return NextResponse.json({
      ok: true,
      student: {
        id: updated.profile.id,
        name: updated.user.name,
        email: updated.user.email,
        planLabel: updated.activePlan ? planLabel(updated.activePlan, auth.user.locale) : null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: auth.user.locale === "es" ? "Ya existe un usuario con este email." : "A user with this email already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: auth.user.locale === "es" ? "No se pudo actualizar el estudiante." : "Could not update the student." }, { status: 500 });
  }
}
