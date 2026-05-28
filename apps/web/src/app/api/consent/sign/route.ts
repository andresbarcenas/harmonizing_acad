import { createHash } from "node:crypto";
import { ConsentEmailStatus, Prisma, Role } from "@prisma/client";
import { NextResponse } from "next/server";

import { getActiveConsentDocument, consentTextHash } from "@/lib/consent/service";
import { generateConsentPdf } from "@/lib/consent/pdf";
import { db } from "@/lib/db";
import { validationErrorMessage } from "@/lib/validation-errors";
import { sendConsentSignedEmail } from "@/lib/email/consent";
import { normalizeLocale } from "@/lib/i18n/locales";
import { ParentAccessError, resolveStudentIdForStudentOrParent } from "@/lib/parents";
import { requireApiUser } from "@/lib/api-auth";
import { signConsentSchema } from "@/lib/validators/consent";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireApiUser({ skipConsent: true });
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.STUDENT && auth.user.role !== Role.PARENT) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Solo cuentas de estudiante o acudiente pueden firmar este consentimiento." : "Only student or guardian accounts can sign this consent." }, { status: 403 });
  }

  const parsed = signConsentSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: validationErrorMessage(parsed.error, auth.user.locale) }, { status: 400 });
  }

  const document = await getActiveConsentDocument();
  let studentId: string;
  try {
    studentId = await resolveStudentIdForStudentOrParent(auth.user, parsed.data.studentId);
  } catch (error) {
    if (error instanceof ParentAccessError) {
      return NextResponse.json({ error: auth.user.locale === "es" ? "No autorizado." : "Forbidden." }, { status: error.status });
    }
    throw error;
  }
  const coveredStudent = await db.studentProfile.findUnique({ where: { id: studentId }, include: { user: true } });
  if (!coveredStudent) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Estudiante no encontrado." : "Student not found." }, { status: 404 });
  }
  const existing = await db.consentSignature.findUnique({
    where: { studentId_documentId: { studentId, documentId: document.id } },
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
      name: coveredStudent.user.name,
      email: coveredStudent.user.email,
      timezone: coveredStudent.user.timezone,
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
        studentId,
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
