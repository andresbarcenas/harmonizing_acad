import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { assertCanManageCatalog, getRepertoireCatalogErrorMessage } from "@/lib/data/repertoire-catalog";
import { db } from "@/lib/db";
import {
  ALLOWED_REPERTOIRE_ATTACHMENT_MIME_TYPES,
  MAX_REPERTOIRE_ATTACHMENT_SIZE_BYTES,
  isAllowedRepertoireAttachmentType,
  storeRepertoireCatalogAttachment,
} from "@/lib/storage";

type Params = { params: Promise<{ catalogItemId: string }> };

export async function POST(req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  try {
    await assertCanManageCatalog(auth.user);
  } catch (error) {
    const catalogError = getRepertoireCatalogErrorMessage(error, auth.user.locale);
    if (catalogError) return NextResponse.json({ error: catalogError.message }, { status: catalogError.status });
    throw error;
  }

  const { catalogItemId } = await params;
  const item = await db.repertoireCatalogItem.findUnique({ where: { id: catalogItemId }, select: { id: true } });
  if (!item) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Canción o pieza no encontrada." : "Song or piece not found." }, { status: 404 });
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

  const stored = await storeRepertoireCatalogAttachment(file, item.id);
  const attachment = await db.repertoireCatalogAttachment.create({
    data: {
      catalogItemId: item.id,
      uploadedByUserId: auth.user.id,
      storageKey: stored.storageKey,
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    },
  });

  return NextResponse.json({ attachment });
}
