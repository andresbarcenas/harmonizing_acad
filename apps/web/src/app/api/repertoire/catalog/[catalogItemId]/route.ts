import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { assertCanManageCatalog, getRepertoireCatalogErrorMessage, updateCatalogItem } from "@/lib/data/repertoire-catalog";
import { repertoireCatalogItemSchema } from "@/lib/validators/repertoire-catalog";

type Params = { params: Promise<{ catalogItemId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  try {
    await assertCanManageCatalog(auth.user);
  } catch (error) {
    const catalogError = getRepertoireCatalogErrorMessage(error, auth.user.locale);
    if (catalogError) return NextResponse.json({ error: catalogError.message }, { status: catalogError.status });
    throw error;
  }

  const parsed = repertoireCatalogItemSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });

  try {
    const { catalogItemId } = await params;
    const item = await updateCatalogItem(catalogItemId, parsed.data);
    return NextResponse.json({ item });
  } catch (error) {
    const catalogError = getRepertoireCatalogErrorMessage(error, auth.user.locale);
    if (catalogError) return NextResponse.json({ error: catalogError.message }, { status: catalogError.status });
    throw error;
  }
}
