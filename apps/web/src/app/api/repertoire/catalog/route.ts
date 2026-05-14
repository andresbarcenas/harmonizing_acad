import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { createCatalogItem, getRepertoireCatalogErrorMessage, searchRepertoireCatalog, assertCanManageCatalog } from "@/lib/data/repertoire-catalog";
import { repertoireCatalogItemSchema } from "@/lib/validators/repertoire-catalog";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  try {
    await assertCanManageCatalog(auth.user);
  } catch (error) {
    const catalogError = getRepertoireCatalogErrorMessage(error, auth.user.locale);
    if (catalogError) return NextResponse.json({ error: catalogError.message }, { status: catalogError.status });
    throw error;
  }

  const url = new URL(request.url);
  const items = await searchRepertoireCatalog({
    query: url.searchParams.get("query"),
    instrument: url.searchParams.get("instrument"),
    includeInactive: url.searchParams.get("includeInactive") === "true",
    limit: Number(url.searchParams.get("limit") ?? 50),
  });

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
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

  const item = await createCatalogItem(parsed.data, auth.user.id);
  return NextResponse.json({ item });
}
