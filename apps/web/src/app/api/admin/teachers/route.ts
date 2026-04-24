import { Prisma, NotificationType, Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";
import { createNotification } from "@/lib/notifications";
import { createTeacherSchema } from "@/lib/validators/admin";

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
    return NextResponse.json({ error: "Ya existe un usuario con este email." }, { status: 409 });
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
          locale: "es",
          timezone: teacherTimezone,
          image: data.profileImage ?? null,
        },
      });

      const teacherProfile = await tx.teacherProfile.create({
        data: {
          userId: user.id,
          specialty: data.specialty.trim(),
          bio: data.bio ?? null,
          zoomLink: data.zoomLink ?? null,
          meetLink: data.meetLink ?? null,
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
      title: "Cuenta docente creada",
      body: "Tu perfil docente ya está activo en Harmonizing.",
      actionUrl: "/teacher/dashboard",
    });

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
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un usuario con este email." }, { status: 409 });
    }

    return NextResponse.json({ error: "No se pudo crear el docente." }, { status: 500 });
  }
}
