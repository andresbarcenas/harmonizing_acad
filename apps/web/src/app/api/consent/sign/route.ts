import { createHash } from "node:crypto";
import { ConsentEmailStatus, Prisma, Role } from "@prisma/client";
import { NextResponse } from "next/server";

import { getActiveConsentDocument, consentTextHash } from "@/lib/consent/service";
import { generateConsentPdf } from "@/lib/consent/pdf";
import { db } from "@/lib/db";
import { sendConsentSignedEmail } from "@/lib/email/consent";
import { normalizeLocale } from "@/lib/i18n/locales";
import { requireApiUser } from "@/lib/api-auth";
import { signConsentSchema } from "@/lib/validators/consent";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireApiUser({ skipConsent: true });
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.STUDENT) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Solo cuentas de estudiante pueden firmar este consentimiento." : "Only student accounts can sign this consent." }, { status: 403 });
  }

  const parsed = signConsentSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const document = await getActiveConsentDocument();
  const existing = await db.consentSignature.findUnique({
    where: { userId_documentId: { userId: auth.user.id, documentId: document.id } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Este consentimiento ya fue firmado." : "This consent has already been signed.", signatureId: existing.id }, { status: 409 });
  }

  const locale = normalizeLocale(auth.user.locale);
  const signedAt = new Date();
  const hash = consentTextHash(document);
  const pdf = await generateConsentPdf({
    document,
    student: {
      name: auth.user.name,
      email: auth.user.email,
      timezone: auth.user.timezone,
    },
    signer: {
      name: parsed.data.signerName,
      relationship: parsed.data.signerRelationship,
      email: parsed.data.signerEmail,
    },
    signedAt,
    locale,
    consentTextHash: hash,
  });
  const pdfSha256 = createHash("sha256").update(pdf).digest("hex");

  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
  const userAgent = req.headers.get("user-agent");

  try {
    const signature = await db.consentSignature.create({
      data: {
        userId: auth.user.id,
        documentId: document.id,
        signerName: parsed.data.signerName,
        signerRelationship: parsed.data.signerRelationship,
        signerEmail: parsed.data.signerEmail,
        signedAt,
        locale,
        ipAddress,
        userAgent,
        consentTextHash: hash,
        pdfBytes: pdf,
        pdfSha256,
        emailStatus: ConsentEmailStatus.PENDING,
      },
      select: { id: true },
    });

    const emailed = await sendConsentSignedEmail(signature.id);

    return NextResponse.json({
      ok: true,
      signatureId: signature.id,
      emailStatus: emailed?.emailStatus ?? ConsentEmailStatus.PENDING,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: auth.user.locale === "es" ? "Este consentimiento ya fue firmado." : "This consent has already been signed." }, { status: 409 });
    }
    return NextResponse.json({ error: auth.user.locale === "es" ? "No se pudo guardar el consentimiento." : "Could not save the consent." }, { status: 500 });
  }
}
