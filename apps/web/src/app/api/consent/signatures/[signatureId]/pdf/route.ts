import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ signatureId: string }> };

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { signatureId } = await params;
  const signature = await db.consentSignature.findUnique({
    where: { id: signatureId },
    include: { user: true, document: true },
  });

  if (!signature) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Consentimiento no encontrado." : "Consent not found." }, { status: 404 });
  }

  const canDownload = auth.user.role === Role.ADMIN || signature.userId === auth.user.id;
  if (!canDownload) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes permisos para descargar este consentimiento." : "You do not have permission to download this consent." }, { status: 403 });
  }

  const safeEmail = signature.user.email.replace(/[^a-z0-9._-]/gi, "_");
  return new NextResponse(Buffer.from(signature.pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="harmonizing-consent-${safeEmail}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
