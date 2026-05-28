import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { parentCanAccessStudent } from "@/lib/parents";
import { readProtectedMedia } from "@/lib/storage";

type Params = { params: Promise<{ attachmentId: string }> };

export const runtime = "nodejs";

export async function GET(request: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { attachmentId } = await params;
  const attachment = await db.nativeInvoicePaymentAttachment.findUnique({
    where: { id: attachmentId },
    include: { payment: { include: { invoice: { select: { studentId: true } } } } },
  });

  if (!attachment) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Recibo no encontrado." : "Receipt not found." }, { status: 404 });
  }

  const studentId = attachment.payment.invoice.studentId;
  const isAdmin = auth.user.role === Role.ADMIN;
  const isOwnerStudent = auth.user.role === Role.STUDENT && auth.user.studentProfile?.id === studentId;
  const isLinkedParent = auth.user.role === Role.PARENT && await parentCanAccessStudent(auth.user.parentGuardianProfile?.id, studentId);
  if (!isAdmin && !isOwnerStudent && !isLinkedParent) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes permisos para ver este recibo." : "You do not have permission to view this receipt." }, { status: 403 });
  }

  const media = await readProtectedMedia({
    storageKey: attachment.storageKey,
    mediaType: "payment-receipt",
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
