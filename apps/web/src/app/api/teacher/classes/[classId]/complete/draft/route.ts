import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { validationErrorMessage } from "@/lib/validation-errors";
import { completeClassWorkflowDraftSchema } from "@/lib/validators/progress";

type RouteContext = {
  params: Promise<{ classId: string }>;
};

type ApiUser = Awaited<ReturnType<typeof requireApiUser>> extends infer Result
  ? Result extends { user: infer User }
    ? User
    : never
  : never;

const MAX_DRAFT_BYTES = 100_000;

const copy = {
  es: {
    forbidden: "No tienes permisos para gestionar el borrador de esta clase.",
    notFound: "Clase no encontrada o no asignada a esta docente.",
    invalid: "El borrador no es válido.",
    tooLarge: "El borrador es demasiado grande para guardarlo.",
  },
  en: {
    forbidden: "You do not have permission to manage this class draft.",
    notFound: "Class not found or not assigned to this teacher.",
    invalid: "The draft is invalid.",
    tooLarge: "The draft is too large to save.",
  },
} as const;

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const locale = auth.user.locale === "es" ? "es" : "en";
  if (auth.user.role !== Role.TEACHER || !auth.user.teacherProfile) {
    return NextResponse.json({ error: copy[locale].forbidden }, { status: 403 });
  }
  const session = await getTeacherOwnedSession(auth.user, (await context.params).classId);
  if (!session) return NextResponse.json({ error: copy[locale].notFound }, { status: 404 });

  const draft = await db.postClassWorkflowDraft.findUnique({
    where: { classSessionId: session.id },
    select: { payload: true, updatedAt: true },
  });

  return NextResponse.json({ draft: draft ? { payload: draft.payload, updatedAt: draft.updatedAt.toISOString() } : null });
}

export async function PUT(request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const locale = auth.user.locale === "es" ? "es" : "en";
  if (auth.user.role !== Role.TEACHER || !auth.user.teacherProfile) {
    return NextResponse.json({ error: copy[locale].forbidden }, { status: 403 });
  }
  const session = await getTeacherOwnedSession(auth.user, (await context.params).classId);
  if (!session) return NextResponse.json({ error: copy[locale].notFound }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = completeClassWorkflowDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: validationErrorMessage(parsed.error, auth.user.locale, copy[locale].invalid) }, { status: 400 });
  }

  const serialized = JSON.stringify(parsed.data);
  if (serialized.length > MAX_DRAFT_BYTES) {
    return NextResponse.json({ error: copy[locale].tooLarge }, { status: 413 });
  }

  const payload = JSON.parse(serialized) as Prisma.InputJsonValue;
  const draft = await db.postClassWorkflowDraft.upsert({
    where: { classSessionId: session.id },
    update: { payload },
    create: {
      classSessionId: session.id,
      studentId: session.studentId,
      teacherId: session.teacherId,
      payload,
    },
    select: { updatedAt: true },
  });

  return NextResponse.json({ ok: true, updatedAt: draft.updatedAt.toISOString() });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const locale = auth.user.locale === "es" ? "es" : "en";
  if (auth.user.role !== Role.TEACHER || !auth.user.teacherProfile) {
    return NextResponse.json({ error: copy[locale].forbidden }, { status: 403 });
  }
  const session = await getTeacherOwnedSession(auth.user, (await context.params).classId);
  if (!session) return NextResponse.json({ error: copy[locale].notFound }, { status: 404 });

  await db.postClassWorkflowDraft.deleteMany({ where: { classSessionId: session.id } });
  return NextResponse.json({ ok: true });
}

async function getTeacherOwnedSession(user: ApiUser, classId: string) {
  if (user.role !== Role.TEACHER || !user.teacherProfile) return null;
  return db.classSession.findFirst({
    where: {
      id: classId,
      teacherId: user.teacherProfile.id,
      student: { assignment: { teacherId: user.teacherProfile.id } },
    },
    select: { id: true, studentId: true, teacherId: true },
  });
}
