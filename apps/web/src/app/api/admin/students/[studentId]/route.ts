import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
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
    include: { user: true, assignment: true },
  });

  if (!student) {
    return NextResponse.json({ error: "Estudiante no encontrado." }, { status: 404 });
  }

  if (data.teacherId) {
    const teacher = await db.teacherProfile.findUnique({
      where: { id: data.teacherId },
      select: { id: true },
    });
    if (!teacher) {
      return NextResponse.json({ error: "Docente no encontrado." }, { status: 404 });
    }
  }

  if (data.email !== student.user.email) {
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
        where: { id: student.userId },
        data: {
          name: data.name,
          email: data.email,
          timezone: data.timezone,
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

      return { user, profile };
    });

    return NextResponse.json({
      ok: true,
      student: {
        id: updated.profile.id,
        name: updated.user.name,
        email: updated.user.email,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Ya existe un usuario con este email." }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo actualizar el estudiante." }, { status: 500 });
  }
}
