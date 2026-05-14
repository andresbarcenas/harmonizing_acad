import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { MAX_PROFILE_IMAGE_SIZE_BYTES, isAllowedProfileImageType, storeProfileImage } from "@/lib/storage";

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const formData = await req.formData();
  const file = formData.get("file");
  const targetUserIdRaw = formData.get("targetUserId");
  const assignRaw = formData.get("assign");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Archivo de imagen requerido." : "Image file is required." }, { status: 400 });
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
      return NextResponse.json({ error: auth.user.locale === "es" ? "Usuario destino no encontrado." : "Target user not found." }, { status: 404 });
    }
  }

  if (!isAllowedProfileImageType(file.type)) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "El archivo debe ser una imagen." : "The file must be an image." }, { status: 400 });
  }

  if (file.size > MAX_PROFILE_IMAGE_SIZE_BYTES) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "La imagen excede el límite de 5MB." : "The image exceeds the 5MB limit." }, { status: 400 });
  }

  const ownerIdForKey = assignedUserId ?? auth.user.id;
  let imageUrl: string;
  try {
    const stored = await storeProfileImage(file, ownerIdForKey);
    imageUrl = stored.imageUrl;
  } catch (error) {
    console.error("Profile image upload failed", error);
    return NextResponse.json(
      {
        error: auth.user.locale === "es"
          ? "No se pudo subir la imagen. Verifica la configuración de almacenamiento."
          : "Could not upload the image. Check storage configuration.",
      },
      { status: 500 },
    );
  }

  if (assignedUserId) {
    await db.user.update({
      where: { id: assignedUserId },
      data: { image: imageUrl },
    });
  }

  return NextResponse.json({ imageUrl, assignedUserId });
}
