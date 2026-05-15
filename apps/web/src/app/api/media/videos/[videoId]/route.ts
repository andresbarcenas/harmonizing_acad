import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { readProtectedMedia } from "@/lib/storage";

type Params = { params: Promise<{ videoId: string }> };

export async function GET(request: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { videoId } = await params;
  const video = await db.practiceVideo.findUnique({
    where: { id: videoId },
    include: { student: { include: { assignment: true } } },
  });

  if (!video) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Video no encontrado." : "Video not found." }, { status: 404 });
  }

  const isOwnerStudent = auth.user.role === Role.STUDENT && auth.user.studentProfile?.id === video.studentId;
  const isAssignedTeacher = auth.user.role === Role.TEACHER && auth.user.teacherProfile?.id === video.teacherId;
  const isAdmin = auth.user.role === Role.ADMIN;
  if (!isAdmin && !isOwnerStudent && !isAssignedTeacher) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes permisos para ver este video." : "You do not have permission to view this video." }, { status: 403 });
  }

  const media = await readProtectedMedia({
    storageKey: video.storageKey,
    mediaType: "video",
    range: request.headers.get("range"),
    fallbackContentType: "video/mp4",
  });

  if (!media?.stream) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Archivo de video no encontrado." : "Video file not found." }, { status: 404 });
  }

  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=0, no-store",
    "Content-Type": media.contentType,
    "Content-Disposition": `inline; filename="${safeFilename(video.originalName)}"`,
  });
  if (media.contentLength) headers.set("Content-Length", media.contentLength);
  if (media.contentRange) headers.set("Content-Range", media.contentRange);

  return new Response(media.stream, { status: media.status, headers });
}

function safeFilename(value: string) {
  return value.replace(/["\r\n]/g, "_");
}
