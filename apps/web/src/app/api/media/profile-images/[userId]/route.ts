import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { isPrivateProfileImageStorageKey, readPrivateProfileImage } from "@/lib/storage";

type Params = { params: Promise<{ userId: string }> };

export async function GET(request: Request, { params }: Params) {
  const auth = await requireApiUser({ skipConsent: true });
  if ("error" in auth) return auth.error;

  const { userId } = await params;
  const url = new URL(request.url);
  const storageKey = url.searchParams.get("key")?.trim();

  if (!storageKey || !isPrivateProfileImageStorageKey(storageKey)) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Imagen no encontrada." : "Image not found." }, { status: 404 });
  }

  const expectedPrefix = `profile-images/profiles/${userId}/`;
  if (!storageKey.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes permisos para ver esta imagen." : "You do not have permission to view this image." }, { status: 403 });
  }

  const targetUser = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, image: true },
  });

  if (!targetUser?.image?.includes(encodeURIComponent(storageKey))) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Imagen no encontrada." : "Image not found." }, { status: 404 });
  }

  const image = await readPrivateProfileImage({ storageKey });
  if (!image?.stream) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Archivo no encontrado." : "File not found." }, { status: 404 });
  }

  const headers = new Headers({
    "Cache-Control": "private, max-age=300",
    "Content-Type": image.contentType,
  });
  if (image.contentLength) headers.set("Content-Length", image.contentLength);

  return new Response(image.stream, { status: image.status, headers });
}
