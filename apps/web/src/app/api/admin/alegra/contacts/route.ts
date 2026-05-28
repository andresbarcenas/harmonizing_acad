import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { AlegraApiError, alegraClient, canUseAlegra } from "@/lib/alegra/client";
import { getAlegraStudentContexts, matchContactToLocalStudents } from "@/lib/alegra/admin-context";
import { requireApiUser } from "@/lib/api-auth";
import { alegraContactsQuerySchema, queryParamsFromUrl } from "@/lib/validators/alegra";

export async function GET(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const locale = auth.user.locale;
  if (auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: locale === "es" ? "No autorizado." : "Forbidden." }, { status: 403 });
  }

  if (!canUseAlegra()) {
    return NextResponse.json({ error: locale === "es" ? "Alegra aún no está configurado." : "Alegra is not configured yet." }, { status: 503 });
  }

  const parsed = alegraContactsQuerySchema.safeParse(queryParamsFromUrl(req.url));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const [contacts, studentContexts] = await Promise.all([
      alegraClient.searchContacts(parsed.data),
      getAlegraStudentContexts(),
    ]);

    const items = contacts.map((contact) => ({
      id: contact.id,
      name: contact.name ?? null,
      emails: contact.emails,
      identification: contact.identification ?? null,
      type: contact.type ?? null,
      phone: contact.phone ?? null,
      city: contact.city ?? null,
      rawPreview: contact.rawPreview,
      localMatches: matchContactToLocalStudents(contact, studentContexts),
    }));

    return NextResponse.json({
      items,
      start: parsed.data.start,
      limit: parsed.data.limit,
      hasNext: items.length === parsed.data.limit,
      nextStart: parsed.data.start + parsed.data.limit,
    });
  } catch (error) {
    return alegraErrorResponse(error, locale);
  }
}

function alegraErrorResponse(error: unknown, locale: string) {
  if (error instanceof AlegraApiError) {
    return NextResponse.json({ error: error.message, kind: error.kind }, { status: error.kind === "auth" ? 503 : 502 });
  }

  return NextResponse.json(
    { error: locale === "es" ? "No se pudo consultar Alegra." : "Could not query Alegra." },
    { status: 502 },
  );
}
