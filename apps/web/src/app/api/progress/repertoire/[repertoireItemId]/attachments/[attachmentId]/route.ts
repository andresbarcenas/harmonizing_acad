import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { deleteProtectedMedia } from "@/lib/storage";

type Params = { params: Promise<{ repertoireItemId: string; attachmentId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.ADMIN && auth.user.role !== Role.TEACHER) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes permisos para eliminar partituras." : "You do not have permission to delete sheet music." }, { status: 403 });
  }

  const { repertoireItemId, attachmentId } = await params;
  const attachment = await db.repertoireAttachment.findFirst({
    where: { id: attachmentId, repertoireItemId },
    include: { repertoireItem: { include: { student: { include: { assignment: true } } } } },
  });

  if (!attachment) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Adjunto no encontrado." : "Attachment not found." }, { status: 404 });
  }

  if (auth.user.role === Role.TEACHER && attachment.repertoireItem.student.assignment?.teacherId !== auth.user.teacherProfile?.id) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Este estudiante no está asignado a esta docente." : "This student is not assigned to this teacher." }, { status: 403 });
  }

  await db.repertoireAttachment.delete({ where: { id: attachment.id } });
  await deleteProtectedMedia(attachment.storageKey, "repertoire");
  return NextResponse.json({ ok: true });
}
