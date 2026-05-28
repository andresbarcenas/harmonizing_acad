import "server-only";

import { createHash } from "node:crypto";
import { ConsentEmailStatus, Role } from "@prisma/client";

import { db } from "@/lib/db";
import { normalizeLocale, type AppLocale } from "@/lib/i18n/locales";
import { defaultConsentDocumentData, DEFAULT_CONSENT_VERSION } from "@/lib/consent/content";

export class ConsentRequiredError extends Error {
  constructor(public readonly locale: AppLocale) {
    super(locale === "es" ? "Debes firmar el consentimiento antes de continuar." : "You must sign the consent before continuing.");
    this.name = "ConsentRequiredError";
  }
}

export function consentTextHash(input: { version: string; titleEn: string; titleEs: string; bodyEn: string; bodyEs: string }) {
  return createHash("sha256")
    .update([input.version, input.titleEn, input.titleEs, input.bodyEn, input.bodyEs].join("\n---\n"), "utf8")
    .digest("hex");
}

export async function getActiveConsentDocument() {
  const active = await db.consentDocument.findFirst({
    where: { active: true },
    orderBy: { effectiveAt: "desc" },
  });
  if (active) return active;

  const data = defaultConsentDocumentData();
  return db.consentDocument.upsert({
    where: { version: DEFAULT_CONSENT_VERSION },
    update: { ...data, active: true },
    create: data,
  });
}

export async function getConsentStatusForStudent(studentId: string) {
  const document = await getActiveConsentDocument();
  const signature = await db.consentSignature.findUnique({
    where: { studentId_documentId: { studentId, documentId: document.id } },
    include: { document: true },
  });

  return {
    document,
    signature,
    signed: Boolean(signature),
  };
}

export async function getConsentStatusForUser(userId: string) {
  const student = await db.studentProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!student) {
    const document = await getActiveConsentDocument();
    return { document, signature: null, signed: false };
  }
  return getConsentStatusForStudent(student.id);
}

export async function hasSignedActiveConsentForStudent(studentId: string) {
  const status = await getConsentStatusForStudent(studentId);
  return status.signed;
}

export async function hasSignedActiveConsent(userId: string) {
  const status = await getConsentStatusForUser(userId);
  return status.signed;
}

export async function ensureStudentConsent(user: { id: string; role: Role; locale?: string | null; studentProfile?: { id: string } | null }) {
  if (user.role !== Role.STUDENT) return;
  const studentId = user.studentProfile?.id ?? (await db.studentProfile.findUnique({ where: { userId: user.id }, select: { id: true } }))?.id;
  const signed = studentId ? await hasSignedActiveConsentForStudent(studentId) : false;
  if (!signed) throw new ConsentRequiredError(normalizeLocale(user.locale));
}

export function consentRequiredResponse(locale: AppLocale) {
  return {
    error: locale === "es" ? "Debes firmar el consentimiento antes de continuar." : "You must sign the consent before continuing.",
    code: "CONSENT_REQUIRED",
  };
}

export function consentEmailStatusLabel(status: ConsentEmailStatus | null | undefined, locale: AppLocale) {
  if (status === ConsentEmailStatus.SENT) return locale === "es" ? "Enviado" : "Sent";
  if (status === ConsentEmailStatus.FAILED) return locale === "es" ? "Falló" : "Failed";
  if (status === ConsentEmailStatus.SKIPPED) return locale === "es" ? "Omitido" : "Skipped";
  return locale === "es" ? "Pendiente" : "Pending";
}
