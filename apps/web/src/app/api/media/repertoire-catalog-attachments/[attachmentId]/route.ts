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
  const attachment = await db.repertoireCatalogAttachment.findUnique({ where: { id: attachmentId } });

  if (!attachment) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Adjunto no encontrado." : "Attachment not found." }, { status: 404 });
  }

  const canView = await canViewCatalogAttachment(auth.user, attachment.catalogItemId);
  if (!canView) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes permisos para ver esta partitura." : "You do not have permission to view this sheet." }, { status: 403 });
  }

  const media = await readProtectedMedia({
    storageKey: attachment.storageKey,
    mediaType: "repertoire",
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

type AuthenticatedUser = Extract<Awaited<ReturnType<typeof requireApiUser>>, { user: unknown }>["user"];

async function canViewCatalogAttachment(user: AuthenticatedUser, catalogItemId: string) {
  if (user.role === Role.ADMIN || user.role === Role.TEACHER) return true;

  if (user.role === Role.STUDENT && user.studentProfile?.id) {
    const item = await db.repertoireItem.findFirst({ where: { catalogItemId, studentId: user.studentProfile.id }, select: { id: true } });
    return Boolean(item);
  }

  if (user.role === Role.PARENT && user.parentGuardianProfile?.id) {
    const item = await db.repertoireItem.findFirst({
      where: {
        catalogItemId,
        student: { parentLinks: { some: { parentId: user.parentGuardianProfile.id } } },
      },
      select: { id: true },
    });
    return Boolean(item);
  }

  return false;
}

function safeFilename(value: string) {
  return value.replace(/["\r\n]/g, "_");
}
