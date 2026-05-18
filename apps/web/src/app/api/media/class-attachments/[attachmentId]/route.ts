import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { readProtectedMedia } from "@/lib/storage";

type Params = { params: Promise<{ attachmentId: string }> };

export async function GET(request: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { attachmentId } = await params;
  const attachment = await db.classSessionAttachment.findUnique({
    where: { id: attachmentId },
    include: { classSession: true },
  });

  if (!attachment) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Adjunto no encontrado." : "Attachment not found." }, { status: 404 });
  }

  const isAdmin = auth.user.role === Role.ADMIN;
  const isAssignedTeacher = auth.user.role === Role.TEACHER && auth.user.teacherProfile?.id === attachment.classSession.teacherId;
  const isOwnerStudent = auth.user.role === Role.STUDENT && auth.user.studentProfile?.id === attachment.classSession.studentId;
  if (!isAdmin && !isAssignedTeacher && !isOwnerStudent) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes permisos para ver este material." : "You do not have permission to view this material." }, { status: 403 });
  }

  const media = await readProtectedMedia({
    storageKey: attachment.storageKey,
    mediaType: "class",
    range: request.headers.get("range"),
    fallbackContentType: attachment.mimeType,
  });

  if (!media?.stream) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Archivo no encontrado." : "File not found." }, { status: 404 });
  }

  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=0, no-store",
    "Content-Type": media.contentType,
    "Content-Disposition": `inline; filename="${safeFilename(attachment.originalName)}"`,
  });
  if (media.contentLength) headers.set("Content-Length", media.contentLength);
  if (media.contentRange) headers.set("Content-Range", media.contentRange);

  return new Response(media.stream, { status: media.status, headers });
}

function safeFilename(value: string) {
  return value.replace(/["\r\n]/g, "_");
}
