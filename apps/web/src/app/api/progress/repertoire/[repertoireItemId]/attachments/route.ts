import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  ALLOWED_REPERTOIRE_ATTACHMENT_MIME_TYPES,
  MAX_REPERTOIRE_ATTACHMENT_SIZE_BYTES,
  isAllowedRepertoireAttachmentType,
  storeRepertoireAttachment,
} from "@/lib/storage";

type Params = { params: Promise<{ repertoireItemId: string }> };

export async function POST(req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.ADMIN && auth.user.role !== Role.TEACHER) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes permisos para adjuntar partituras." : "You do not have permission to attach sheet music." }, { status: 403 });
  }

  const { repertoireItemId } = await params;
  const item = await db.repertoireItem.findUnique({
    where: { id: repertoireItemId },
    include: { student: { include: { assignment: true } } },
  });

  if (!item) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Repertorio no encontrado." : "Repertoire item not found." }, { status: 404 });
  }

  if (auth.user.role === Role.TEACHER && item.student.assignment?.teacherId !== auth.user.teacherProfile?.id) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Este estudiante no está asignado a esta docente." : "This student is not assigned to this teacher." }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Selecciona un archivo." : "Select a file." }, { status: 400 });
  }

  if (!isAllowedRepertoireAttachmentType(file.type)) {
    return NextResponse.json(
      { error: auth.user.locale === "es" ? `Formato no permitido. Usa PDF o imagen (${ALLOWED_REPERTOIRE_ATTACHMENT_MIME_TYPES.join(", ")}).` : `Unsupported format. Use PDF or image (${ALLOWED_REPERTOIRE_ATTACHMENT_MIME_TYPES.join(", ")}).` },
      { status: 400 },
    );
  }

  if (file.size > MAX_REPERTOIRE_ATTACHMENT_SIZE_BYTES) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "El archivo supera el límite de 20MB." : "The file exceeds the 20MB limit." }, { status: 400 });
  }

  const stored = await storeRepertoireAttachment(file, item.id);
  const attachment = await db.repertoireAttachment.create({
    data: {
      repertoireItemId: item.id,
      uploadedByUserId: auth.user.id,
      storageKey: stored.storageKey,
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    },
  });

  return NextResponse.json({ attachment });
}
