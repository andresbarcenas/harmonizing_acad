import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { deleteProtectedMedia } from "@/lib/storage";

type Params = { params: Promise<{ classId: string; attachmentId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.TEACHER || !auth.user.teacherProfile) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes permisos para eliminar materiales." : "You do not have permission to delete class materials." }, { status: 403 });
  }

  const { classId, attachmentId } = await params;
  const attachment = await db.classSessionAttachment.findFirst({
    where: { id: attachmentId, classSessionId: classId },
    include: { classSession: { include: { student: { include: { assignment: true } } } } },
  });

  if (!attachment) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Adjunto no encontrado." : "Attachment not found." }, { status: 404 });
  }

  if (attachment.classSession.teacherId !== auth.user.teacherProfile.id || attachment.classSession.student.assignment?.teacherId !== auth.user.teacherProfile.id) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes permisos para esta clase." : "You do not have permission for this class." }, { status: 403 });
  }

  await db.classSessionAttachment.delete({ where: { id: attachment.id } });
  await deleteProtectedMedia(attachment.storageKey, "class");
  return NextResponse.json({ ok: true });
}
