import { InvoiceContactLinkStrategy, InvoiceSyncScope, InvoiceSyncStatus, Prisma } from "@prisma/client";
import { format, subMonths } from "date-fns";

import { AlegraApiError, alegraClient, canUseAlegra } from "@/lib/alegra/client";
import { db } from "@/lib/db";

type NormalizedInvoice = {
  alegraInvoiceId: string;
  invoiceNumber: string | null;
  issueDate: Date | null;
  dueDate: Date | null;
  status: string;
  currency: string;
  totalAmount: number | null;
  balanceAmount: number | null;
  viewUrl: string | null;
  pdfUrl: string | null;
  contactId: string | null;
  rawPayload: Record<string, unknown>;
};

type StudentSyncResult = {
  status: InvoiceSyncStatus;
  invoicesUpserted: number;
  errorSummary: string | null;
};

const DEFAULT_SYNC_HOURS = 6;
const HISTORY_MONTHS = 12;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(source: Record<string, unknown>, ...paths: string[]): string | null {
  for (const path of paths) {
    const parts = path.split(".");
    let current: unknown = source;

    for (const part of parts) {
      const asObject = asRecord(current);
      if (!asObject) {
        current = undefined;
        break;
      }
      current = asObject[part];
    }

    if (typeof current === "string" && current.trim()) {
      return current.trim();
    }

    if (typeof current === "number") {
      return String(current);
    }
  }

  return null;
}

function readNumber(source: Record<string, unknown>, ...paths: string[]): number | null {
  for (const path of paths) {
    const value = readString(source, path);
    if (!value) continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

function readDate(source: Record<string, unknown>, ...paths: string[]): Date | null {
  for (const path of paths) {
    const value = readString(source, path);
    if (!value) continue;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

function normalizeStatus(value: string | null): string {
  if (!value) return "UNKNOWN";
  return value.trim().toUpperCase() || "UNKNOWN";
}

function normalizeInvoice(raw: Record<string, unknown>): NormalizedInvoice | null {
  const alegraInvoiceId = readString(raw, "id", "_id", "invoice.id");
  if (!alegraInvoiceId) return null;

  const invoiceNumber = readString(raw, "number", "numberTemplate.number", "invoiceNumber");
  const issueDate = readDate(raw, "date", "issueDate", "createdAt");
  const dueDate = readDate(raw, "dueDate", "expirationDate", "datePayment");
  const status = normalizeStatus(readString(raw, "status", "state", "statusInvoice"));
  const currency = readString(raw, "currency.code", "currency", "currencyCode") ?? "USD";
  const totalAmount = readNumber(raw, "total", "totalPrice", "totalAmount", "amount");
  const balanceAmount = readNumber(raw, "balance", "balanceAmount", "amountDue");
  const viewUrl = readString(raw, "url", "publicUrl", "shareLink", "htmlUrl");
  const pdfUrl = readString(raw, "pdf", "pdfUrl", "pdfURL", "pdf.url");
  const contactId = readString(raw, "client.id", "contact.id", "customer.id", "client._id", "contact._id");

  return {
    alegraInvoiceId,
    invoiceNumber,
    issueDate,
    dueDate,
    status,
    currency,
    totalAmount,
    balanceAmount,
    viewUrl,
    pdfUrl,
    contactId,
    rawPayload: raw,
  };
}

function mergeInvoice(primary: NormalizedInvoice, secondary: NormalizedInvoice): NormalizedInvoice {
  return {
    ...primary,
    invoiceNumber: primary.invoiceNumber ?? secondary.invoiceNumber,
    issueDate: primary.issueDate ?? secondary.issueDate,
    dueDate: primary.dueDate ?? secondary.dueDate,
    status: primary.status !== "UNKNOWN" ? primary.status : secondary.status,
    currency: primary.currency || secondary.currency,
    totalAmount: primary.totalAmount ?? secondary.totalAmount,
    balanceAmount: primary.balanceAmount ?? secondary.balanceAmount,
    viewUrl: primary.viewUrl ?? secondary.viewUrl,
    pdfUrl: primary.pdfUrl ?? secondary.pdfUrl,
    contactId: primary.contactId ?? secondary.contactId,
    rawPayload: { ...secondary.rawPayload, ...primary.rawPayload },
  };
}

function staleHours() {
  const parsed = Number(process.env.INVOICE_SYNC_HOURS ?? DEFAULT_SYNC_HOURS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SYNC_HOURS;
}

export function isInvoiceDataStale(lastSyncedAt: Date | null | undefined) {
  if (!lastSyncedAt) return true;
  const thresholdMs = staleHours() * 60 * 60 * 1000;
  return Date.now() - lastSyncedAt.getTime() > thresholdMs;
}

async function resolveAlegraContactId(studentProfileId: string, studentEmail: string) {
  const link = await db.invoiceContactLink.findUnique({
    where: { studentId: studentProfileId },
  });

  if (link?.strategy === InvoiceContactLinkStrategy.MANUAL && link.alegraContactId) {
    return { contactId: link.alegraContactId, link };
  }

  const contact = await alegraClient.findContactByEmail(studentEmail);

  if (!contact) {
    await db.invoiceContactLink.upsert({
      where: { studentId: studentProfileId },
      update: {
        strategy: InvoiceContactLinkStrategy.EMAIL_AUTO,
        alegraContactId: null,
        lastResolvedAt: new Date(),
        lastError: "No se encontró contacto en Alegra con email exacto.",
      },
      create: {
        studentId: studentProfileId,
        strategy: InvoiceContactLinkStrategy.EMAIL_AUTO,
        alegraContactId: null,
        lastResolvedAt: new Date(),
        lastError: "No se encontró contacto en Alegra con email exacto.",
      },
    });

    return { contactId: null, link };
  }

  await db.invoiceContactLink.upsert({
    where: { studentId: studentProfileId },
    update: {
      strategy: InvoiceContactLinkStrategy.EMAIL_AUTO,
      alegraContactId: contact.id,
      lastResolvedAt: new Date(),
      lastError: null,
    },
    create: {
      studentId: studentProfileId,
      strategy: InvoiceContactLinkStrategy.EMAIL_AUTO,
      alegraContactId: contact.id,
      lastResolvedAt: new Date(),
      lastError: null,
    },
  });

  return { contactId: contact.id, link };
}

async function syncStudentInvoicesInternal(studentProfileId: string): Promise<StudentSyncResult> {
  const student = await db.studentProfile.findUnique({
    where: { id: studentProfileId },
    include: { user: true },
  });

  if (!student) {
    return {
      status: InvoiceSyncStatus.FAILED,
      invoicesUpserted: 0,
      errorSummary: "Estudiante no encontrado.",
    };
  }

  if (!canUseAlegra()) {
    const cachedInvoiceCount = await db.invoice.count({
      where: { studentId: student.id },
    });
    if (cachedInvoiceCount > 0) {
      await db.invoice.updateMany({
        where: { studentId: student.id },
        data: { lastSyncedAt: new Date() },
      });
    }

    return {
      status: cachedInvoiceCount > 0 ? InvoiceSyncStatus.SUCCESS : InvoiceSyncStatus.PARTIAL,
      invoicesUpserted: 0,
      errorSummary:
        cachedInvoiceCount > 0
          ? "Modo demo activo: Alegra no está configurado. Mostrando facturas locales en cache."
          : "Modo demo activo: Alegra no está configurado y este estudiante aún no tiene facturas en cache.",
    };
  }

  let contactId: string | null;
  try {
    const resolved = await resolveAlegraContactId(student.id, student.user.email);
    contactId = resolved.contactId;
  } catch (error) {
    const summary = error instanceof Error ? error.message : "No se pudo resolver el contacto en Alegra.";
    return {
      status: InvoiceSyncStatus.FAILED,
      invoicesUpserted: 0,
      errorSummary: summary,
    };
  }

  if (!contactId) {
    return {
      status: InvoiceSyncStatus.FAILED,
      invoicesUpserted: 0,
      errorSummary: "No se encontró contacto en Alegra para este estudiante.",
    };
  }

  const now = new Date();
  const startDate = subMonths(now, HISTORY_MONTHS);
  const startDateIso = format(startDate, "yyyy-MM-dd");
  const endDateIso = format(now, "yyyy-MM-dd");

  let remoteInvoices: Record<string, unknown>[] = [];
  try {
    remoteInvoices = await alegraClient.listInvoices(startDateIso, endDateIso);
  } catch (error) {
    const summary =
      error instanceof AlegraApiError
        ? `[${error.kind}] ${error.message}`
        : error instanceof Error
          ? error.message
          : "No se pudieron consultar facturas en Alegra.";

    await db.invoiceContactLink.upsert({
      where: { studentId: student.id },
      update: { lastError: summary, lastResolvedAt: now },
      create: {
        studentId: student.id,
        strategy: InvoiceContactLinkStrategy.EMAIL_AUTO,
        alegraContactId: contactId,
        lastResolvedAt: now,
        lastError: summary,
      },
    });

    return {
      status: InvoiceSyncStatus.FAILED,
      invoicesUpserted: 0,
      errorSummary: summary,
    };
  }

  let invoicesUpserted = 0;
  let skippedRecords = 0;

  for (const rawInvoice of remoteInvoices) {
    const baseNormalized = normalizeInvoice(rawInvoice);
    if (!baseNormalized) {
      skippedRecords += 1;
      continue;
    }

    let normalized = baseNormalized;

    const needsDetails = !normalized.contactId || !normalized.pdfUrl || !normalized.viewUrl;
    if (needsDetails) {
      try {
        const detailPayload = await alegraClient.getInvoiceById(normalized.alegraInvoiceId);
        const detailNormalized = detailPayload ? normalizeInvoice(detailPayload) : null;
        if (detailNormalized) {
          normalized = mergeInvoice(normalized, detailNormalized);
        }
      } catch {
        // No bloqueamos sincronización por errores de enriquecimiento.
      }
    }

    if (!normalized.contactId || normalized.contactId !== contactId) {
      continue;
    }

    if (normalized.issueDate && normalized.issueDate < startDate) {
      continue;
    }

    await db.invoice.upsert({
      where: { alegraInvoiceId: normalized.alegraInvoiceId },
      update: {
        studentId: student.id,
        invoiceNumber: normalized.invoiceNumber,
        issueDate: normalized.issueDate,
        dueDate: normalized.dueDate,
        status: normalized.status,
        currency: normalized.currency,
        totalAmount: normalized.totalAmount,
        balanceAmount: normalized.balanceAmount,
        viewUrl: normalized.viewUrl,
        pdfUrl: normalized.pdfUrl,
        lastSyncedAt: now,
        rawPayload: normalized.rawPayload as Prisma.InputJsonValue,
      },
      create: {
        studentId: student.id,
        alegraInvoiceId: normalized.alegraInvoiceId,
        invoiceNumber: normalized.invoiceNumber,
        issueDate: normalized.issueDate,
        dueDate: normalized.dueDate,
        status: normalized.status,
        currency: normalized.currency,
        totalAmount: normalized.totalAmount,
        balanceAmount: normalized.balanceAmount,
        viewUrl: normalized.viewUrl,
        pdfUrl: normalized.pdfUrl,
        lastSyncedAt: now,
        rawPayload: normalized.rawPayload as Prisma.InputJsonValue,
      },
    });

    invoicesUpserted += 1;
  }

  await db.invoiceContactLink.upsert({
    where: { studentId: student.id },
    update: {
      alegraContactId: contactId,
      strategy: InvoiceContactLinkStrategy.EMAIL_AUTO,
      lastResolvedAt: now,
      lastError: null,
    },
    create: {
      studentId: student.id,
      alegraContactId: contactId,
      strategy: InvoiceContactLinkStrategy.EMAIL_AUTO,
      lastResolvedAt: now,
      lastError: null,
    },
  });

  const status = skippedRecords > 0 ? InvoiceSyncStatus.PARTIAL : InvoiceSyncStatus.SUCCESS;
  const errorSummary = skippedRecords > 0 ? `Se omitieron ${skippedRecords} registro(s) con formato incompleto.` : null;

  return { status, invoicesUpserted, errorSummary };
}

export async function syncStudentInvoices(studentProfileId: string, triggeredByUserId?: string) {
  const run = await db.invoiceSyncRun.create({
    data: {
      scope: InvoiceSyncScope.STUDENT,
      status: InvoiceSyncStatus.RUNNING,
      studentId: studentProfileId,
      triggeredByUserId: triggeredByUserId ?? null,
      studentsProcessed: 0,
      studentsFailed: 0,
      invoicesUpserted: 0,
    },
  });

  const result = await syncStudentInvoicesInternal(studentProfileId);

  const updatedRun = await db.invoiceSyncRun.update({
    where: { id: run.id },
    data: {
      status: result.status,
      finishedAt: new Date(),
      studentsProcessed: 1,
      studentsFailed: result.status === InvoiceSyncStatus.FAILED ? 1 : 0,
      invoicesUpserted: result.invoicesUpserted,
      errorSummary: result.errorSummary,
    },
  });

  return updatedRun;
}

export async function syncAllStudentsInvoices(triggeredByUserId?: string) {
  const run = await db.invoiceSyncRun.create({
    data: {
      scope: InvoiceSyncScope.ALL,
      status: InvoiceSyncStatus.RUNNING,
      triggeredByUserId: triggeredByUserId ?? null,
      studentsProcessed: 0,
      studentsFailed: 0,
      invoicesUpserted: 0,
    },
  });

  const students = await db.studentProfile.findMany({
    select: { id: true },
    orderBy: { joinedAt: "asc" },
  });

  let studentsProcessed = 0;
  let studentsFailed = 0;
  let studentsPartial = 0;
  let invoicesUpserted = 0;
  const failures: string[] = [];

  for (const student of students) {
    const result = await syncStudentInvoicesInternal(student.id);
    studentsProcessed += 1;
    invoicesUpserted += result.invoicesUpserted;

    if (result.status === InvoiceSyncStatus.FAILED) {
      studentsFailed += 1;
      if (result.errorSummary) {
        failures.push(`${student.id}: ${result.errorSummary}`);
      }
      continue;
    }

    if (result.status === InvoiceSyncStatus.PARTIAL) {
      studentsPartial += 1;
      if (result.errorSummary) {
        failures.push(`${student.id}: ${result.errorSummary}`);
      }
    }
  }

  const status =
    studentsFailed === 0 && studentsPartial === 0
      ? InvoiceSyncStatus.SUCCESS
      : studentsFailed === studentsProcessed
        ? InvoiceSyncStatus.FAILED
        : InvoiceSyncStatus.PARTIAL;

  const updatedRun = await db.invoiceSyncRun.update({
    where: { id: run.id },
    data: {
      status,
      finishedAt: new Date(),
      studentsProcessed,
      studentsFailed,
      invoicesUpserted,
      errorSummary: failures.length ? failures.slice(0, 4).join(" | ") : null,
      details: failures.length ? ({ failures } as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });

  return updatedRun;
}

export async function getLatestStudentSyncRun(studentProfileId: string) {
  return db.invoiceSyncRun.findFirst({
    where: {
      scope: InvoiceSyncScope.STUDENT,
      studentId: studentProfileId,
    },
    orderBy: { startedAt: "desc" },
  });
}

export async function getRecentStudentSyncCooldownHit(studentProfileId: string, seconds: number) {
  const since = new Date(Date.now() - seconds * 1000);

  return db.invoiceSyncRun.findFirst({
    where: {
      scope: InvoiceSyncScope.STUDENT,
      studentId: studentProfileId,
      startedAt: { gte: since },
      status: { in: [InvoiceSyncStatus.RUNNING, InvoiceSyncStatus.SUCCESS, InvoiceSyncStatus.PARTIAL] },
    },
    orderBy: { startedAt: "desc" },
  });
}
