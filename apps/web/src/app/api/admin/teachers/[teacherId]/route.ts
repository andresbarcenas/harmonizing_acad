import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { updateTeacherSchema } from "@/lib/validators/admin";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ teacherId: string }> },
) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { teacherId } = await params;
  const parsed = updateTeacherSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const teacher = await db.teacherProfile.findUnique({
    where: { id: teacherId },
    include: { user: true },
  });

  if (!teacher) {
    return NextResponse.json({ error: "Docente no encontrado." }, { status: 404 });
  }

  if (data.email !== teacher.user.email) {
    const existing = await db.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "Ya existe un usuario con este email." }, { status: 409 });
    }
  }

  try {
    const updated = await db.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: teacher.userId },
        data: {
          name: data.name,
          email: data.email,
          timezone: data.timezone,
          image: data.profileImage ?? null,
        },
      });

      const profile = await tx.teacherProfile.update({
        where: { id: teacherId },
        data: {
          specialty: data.specialty,
          bio: data.bio ?? null,
          zoomLink: data.zoomLink ?? null,
          meetLink: data.meetLink ?? null,
        },
      });

      return { user, profile };
    });

    return NextResponse.json({
      ok: true,
      teacher: {
        id: updated.profile.id,
        name: updated.user.name,
        email: updated.user.email,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un usuario con este email." }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo actualizar el docente." }, { status: 500 });
  }
}
