import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  ALLOWED_CLASS_ATTACHMENT_MIME_TYPES,
  MAX_CLASS_ATTACHMENT_SIZE_BYTES,
  isAllowedClassAttachmentType,
  storeClassSessionAttachment,
} from "@/lib/storage";

type Params = { params: Promise<{ classId: string }> };

export async function POST(req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.TEACHER || !auth.user.teacherProfile) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes permisos para adjuntar materiales." : "You do not have permission to attach class materials." }, { status: 403 });
  }

  const { classId } = await params;
  const session = await db.classSession.findFirst({
    where: {
      id: classId,
      teacherId: auth.user.teacherProfile.id,
      student: { assignment: { teacherId: auth.user.teacherProfile.id } },
    },
    select: { id: true },
  });

  if (!session) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Clase no encontrada o no asignada a esta docente." : "Class not found or not assigned to this teacher." }, { status: 404 });
  }

  const formData = await req.formData();
  const files = [...formData.getAll("files"), ...formData.getAll("file")].filter((value): value is File => value instanceof File && value.size > 0);
  const description = String(formData.get("description") ?? "").trim() || undefined;

  if (!files.length) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Selecciona al menos un archivo." : "Select at least one file." }, { status: 400 });
  }

  for (const file of files) {
    if (!isAllowedClassAttachmentType(file.type)) {
      return NextResponse.json(
        { error: auth.user.locale === "es" ? `Formato no permitido. Usa PDF o imagen (${ALLOWED_CLASS_ATTACHMENT_MIME_TYPES.join(", ")}).` : `Unsupported format. Use PDF or image (${ALLOWED_CLASS_ATTACHMENT_MIME_TYPES.join(", ")}).` },
        { status: 400 },
      );
    }
    if (file.size > MAX_CLASS_ATTACHMENT_SIZE_BYTES) {
      return NextResponse.json({ error: auth.user.locale === "es" ? "Un archivo supera el límite de 20MB." : "A file exceeds the 20MB limit." }, { status: 400 });
    }
  }

  const attachments = [];
  for (const file of files) {
    const stored = await storeClassSessionAttachment(file, session.id);
    attachments.push(await db.classSessionAttachment.create({
      data: {
        classSessionId: session.id,
        uploadedByUserId: auth.user.id,
        storageKey: stored.storageKey,
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        description,
      },
    }));
  }

  return NextResponse.json({ attachments });
}
