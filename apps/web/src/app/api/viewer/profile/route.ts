import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { mediaBucket, minioClient } from "@/lib/minio";
import { viewerProfileSchema } from "@/lib/validators/viewer";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function PATCH(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const parsed = viewerProfileSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id: auth.user.id },
    data: { image: parsed.data.image },
    select: { image: true },
  });

  return NextResponse.json({ ok: true, image: user.image });
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo de imagen requerido." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "El archivo debe ser una imagen." }, { status: 400 });
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "La imagen excede el límite de 5MB." }, { status: 400 });
  }

  const mediaBase = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, "");
  if (!mediaBase) {
    return NextResponse.json({ error: "MEDIA base URL no configurada." }, { status: 500 });
  }

  const key = `profiles/${auth.user.id}/${Date.now()}-${safeFileName(file.name)}`;
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
  const user = await db.user.update({
    where: { id: auth.user.id },
    data: { image: imageUrl },
    select: { image: true },
  });

  return NextResponse.json({ ok: true, image: user.image });
}
