import { NextResponse } from "next/server";
import { Role, SessionStatus } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ classId: string }> };

const copy = {
  es: {
    forbidden: "No tienes permisos para iniciar esta clase.",
    notFound: "Clase no encontrada o no asignada a esta docente.",
    invalidStatus: "Solo se pueden iniciar clases programadas.",
  },
  en: {
    forbidden: "You do not have permission to start this class.",
    notFound: "Class not found or not assigned to this teacher.",
    invalidStatus: "Only scheduled classes can be started.",
  },
} as const;

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const locale = auth.user.locale === "es" ? "es" : "en";
  const c = copy[locale];

  if (auth.user.role !== Role.TEACHER || !auth.user.teacherProfile) {
    return NextResponse.json({ error: c.forbidden }, { status: 403 });
  }

  const { classId } = await params;
  const session = await db.classSession.findFirst({
    where: {
      id: classId,
      teacherId: auth.user.teacherProfile.id,
      student: { assignment: { teacherId: auth.user.teacherProfile.id } },
    },
    select: {
      id: true,
      status: true,
      startedAt: true,
      startedByUserId: true,
    },
  });

  if (!session) {
    return NextResponse.json({ error: c.notFound }, { status: 404 });
  }

  if (session.status !== SessionStatus.SCHEDULED) {
    return NextResponse.json({ error: c.invalidStatus }, { status: 409 });
  }

  if (session.startedAt) {
    return NextResponse.json({
      session: {
        id: session.id,
        startedAt: session.startedAt.toISOString(),
        startedByUserId: session.startedByUserId,
      },
      alreadyStarted: true,
    });
  }

  const startedAt = new Date();
  const updated = await db.classSession.update({
    where: { id: session.id },
    data: {
      startedAt,
      startedByUserId: auth.user.id,
    },
    select: {
      id: true,
      startedAt: true,
      startedByUserId: true,
    },
  });

  return NextResponse.json({
    session: {
      id: updated.id,
      startedAt: updated.startedAt?.toISOString() ?? startedAt.toISOString(),
      startedByUserId: updated.startedByUserId,
    },
  });
}
