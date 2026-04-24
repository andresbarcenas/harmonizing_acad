import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getPublicMediaBaseUrl } from "@/lib/media-url";
import { mediaBucket, minioClient } from "@/lib/minio";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const formData = await req.formData();
  const file = formData.get("file");
  const targetUserIdRaw = formData.get("targetUserId");
  const assignRaw = formData.get("assign");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo de imagen requerido." }, { status: 400 });
  }

  const shouldAssign = assignRaw === null ? true : String(assignRaw).toLowerCase() !== "false";
  const targetUserId = typeof targetUserIdRaw === "string" && targetUserIdRaw.trim().length
    ? targetUserIdRaw.trim()
    : null;

  let assignedUserId: string | null = null;
  if (shouldAssign) {
    assignedUserId = targetUserId ?? auth.user.id;
    if (auth.user.role !== Role.ADMIN && assignedUserId !== auth.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const target = await db.user.findUnique({
      where: { id: assignedUserId },
      select: { id: true },
    });
    if (!target) {
      return NextResponse.json({ error: "Usuario destino no encontrado." }, { status: 404 });
    }
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "El archivo debe ser una imagen." }, { status: 400 });
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "La imagen excede el límite de 5MB." }, { status: 400 });
  }

  const mediaBase = getPublicMediaBaseUrl();
  if (!mediaBase) {
    return NextResponse.json(
      { error: "MEDIA base URL no configurada. Define NEXT_PUBLIC_MEDIA_BASE_URL." },
      { status: 500 },
    );
  }

  const ownerIdForKey = assignedUserId ?? auth.user.id;
  const key = `profiles/${ownerIdForKey}/${Date.now()}-${safeFileName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await minioClient.send(
    new PutObjectCommand({
      Bucket: mediaBucket,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }),
  );

  const imageUrl = `${mediaBase}/${key}`;

  if (assignedUserId) {
    await db.user.update({
      where: { id: assignedUserId },
      data: { image: imageUrl },
    });
  }

  return NextResponse.json({ imageUrl, assignedUserId });
}
