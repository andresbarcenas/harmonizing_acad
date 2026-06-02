import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { assertCanManageCatalog, getRepertoireCatalogErrorMessage } from "@/lib/data/repertoire-catalog";
import { db } from "@/lib/db";
import { deleteProtectedMedia } from "@/lib/storage";

type Params = { params: Promise<{ catalogItemId: string; attachmentId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  try {
    await assertCanManageCatalog(auth.user);
  } catch (error) {
    const catalogError = getRepertoireCatalogErrorMessage(error, auth.user.locale);
    if (catalogError) return NextResponse.json({ error: catalogError.message }, { status: catalogError.status });
    throw error;
  }

  const { catalogItemId, attachmentId } = await params;
  const attachment = await db.repertoireCatalogAttachment.findFirst({ where: { id: attachmentId, catalogItemId } });

  if (!attachment) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Adjunto no encontrado." : "Attachment not found." }, { status: 404 });
  }

  await db.repertoireCatalogAttachment.delete({ where: { id: attachment.id } });
  await deleteProtectedMedia(attachment.storageKey, "repertoire");
  return NextResponse.json({ ok: true });
}
