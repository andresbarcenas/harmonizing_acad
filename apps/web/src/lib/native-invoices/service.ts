import "server-only";

import { addMonths, endOfMonth } from "date-fns";
import { EmailDeliveryStatus, NativeInvoiceStatus, NotificationType, Prisma, Role } from "@prisma/client";

import { db } from "@/lib/db";
import { grantCreditsForOpenedInvoice, recalculateNativeInvoicePaymentStatus, reverseInvoiceCredits } from "@/lib/native-invoices/ledger";
import { DEFAULT_PRICE_PER_CLASS_COP, DEFAULT_SESSION_COUNT, sessionCadenceLabel, VALID_NATIVE_SESSION_COUNTS, type NativeSessionCount } from "@/lib/native-invoices/shared";
import { createNotification } from "@/lib/notifications";
import { parentCanAccessStudent } from "@/lib/parents";
import { getWompiAdminSummary } from "@/lib/wompi/service";

const viewerVisibleStatuses: NativeInvoiceStatus[] = [
  NativeInvoiceStatus.OPEN,
  NativeInvoiceStatus.PAID,
  NativeInvoiceStatus.CLOSED,
];

type InvoiceCreateInput = {
  studentId: string;
  periodStart: string;
  periodEnd?: string;
  issueDate?: string;
  dueDate?: string;
  sessionCount: NativeSessionCount;
  pricePerClassCop: number;
  savePriceToStudent?: boolean;
  notes?: string;
};

type InvoiceUpdateInput = Partial<Omit<InvoiceCreateInput, "studentId">>;

export function parseInvoiceDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function invoiceDateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function defaultPeriodEnd(periodStart: Date) {
  return endOfMonth(periodStart);
}

function lineItemDescription(sessionCount: number) {
  return `Clases Harmonizing Academy (${sessionCount} sesiones)`;
}

function calculateTotals(sessionCount: number, pricePerClassCop: number) {
  const subtotalCop = sessionCount * pricePerClassCop;
  const taxCop = 0;
  const totalCop = subtotalCop + taxCop;
  return { subtotalCop, taxCop, totalCop, balanceCop: totalCop };
}

async function generateInvoiceNumber(tx: Prisma.TransactionClient, issueDate: Date) {
  const year = issueDate.getUTCFullYear();
  const sequence = await tx.nativeInvoiceSequence.upsert({
    where: { year },
    update: { lastNumber: { increment: 1 } },
    create: { year, lastNumber: 1 },
  });

  return `HA-${year}-${String(sequence.lastNumber).padStart(4, "0")}`;
}

async function resolveRecipient(tx: Prisma.TransactionClient, studentId: string) {
  const student = await tx.studentProfile.findUnique({
    where: { id: studentId },
    include: {
      user: true,
      parentLinks: {
        include: { parent: { include: { user: true } } },
        orderBy: [{ primaryContact: "desc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!student) throw new Error("STUDENT_NOT_FOUND");

  const primaryParent = student.parentLinks[0]?.parent.user ?? null;
  const recipient = primaryParent ?? student.user;

  return {
    student,
    recipient,
    recipientRole: primaryParent ? Role.PARENT : Role.STUDENT,
  };
}

function invoiceDataFromInput(input: InvoiceCreateInput | InvoiceUpdateInput, existing?: {
  periodStart: Date;
  periodEnd: Date;
  issueDate: Date;
  dueDate: Date;
  sessionCount: number;
  pricePerClassCop: number;
  notes: string | null;
}) {
  const periodStart = input.periodStart ? parseInvoiceDate(input.periodStart) : existing?.periodStart ?? new Date();
  const periodEnd = input.periodEnd ? parseInvoiceDate(input.periodEnd) : existing?.periodEnd ?? defaultPeriodEnd(periodStart);
  const issueDate = input.issueDate ? parseInvoiceDate(input.issueDate) : existing?.issueDate ?? new Date();
  const dueDate = input.dueDate ? parseInvoiceDate(input.dueDate) : existing?.dueDate ?? issueDate;
  const sessionCount = input.sessionCount ?? existing?.sessionCount ?? DEFAULT_SESSION_COUNT;
  const pricePerClassCop = input.pricePerClassCop ?? existing?.pricePerClassCop ?? DEFAULT_PRICE_PER_CLASS_COP;
  const notes = input.notes ?? existing?.notes ?? null;
  const totals = calculateTotals(sessionCount, pricePerClassCop);

  return {
    periodStart,
    periodEnd,
    issueDate,
    dueDate,
    sessionCount,
    pricePerClassCop,
    notes,
    cadenceLabel: sessionCadenceLabel(sessionCount, "es"),
    ...totals,
  };
}

export function nativeInvoiceInclude() {
  return {
    student: {
      include: {
        user: true,
        parentLinks: { include: { parent: { include: { user: true } } } },
      },
    },
    recipient: true,
    lineItems: { orderBy: { sortOrder: "asc" as const } },
    payments: {
      include: { attachments: { orderBy: { createdAt: "desc" as const } } },
      orderBy: { paymentDate: "desc" as const },
    },
    creditLedgerEntries: {
      include: {
        classSession: { select: { startsAtUtc: true, status: true, type: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: [{ effectiveAt: "desc" as const }, { createdAt: "desc" as const }],
      take: 12,
    },
  };
}

export async function getAdminNativeInvoiceWorkspace() {
  const students = await db.studentProfile.findMany({
    include: {
      user: true,
      billingProfile: true,
      parentLinks: {
        include: { parent: { include: { user: true } } },
        orderBy: [{ primaryContact: "desc" }, { createdAt: "asc" }],
      },
    },
    orderBy: { user: { name: "asc" } },
  });
  const studentIds = students.map((student) => student.id);

  const [invoices, summary, creditBalances, creditEntries] = await Promise.all([
    db.nativeInvoice.findMany({
      include: nativeInvoiceInclude(),
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      take: 80,
    }),
    db.nativeInvoice.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { totalCop: true, balanceCop: true },
    }),
    db.classCreditLedgerEntry.groupBy({
      by: ["studentId"],
      where: { studentId: { in: studentIds } },
      _sum: { delta: true },
    }),
    db.classCreditLedgerEntry.findMany({
      where: { studentId: { in: studentIds } },
      include: {
        invoice: { select: { invoiceNumber: true } },
        classSession: { select: { startsAtUtc: true, status: true, type: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: [{ effectiveAt: "desc" }, { createdAt: "desc" }],
      take: 120,
    }),
  ]);

  return { students, invoices, summary, creditBalances, creditEntries, wompi: getWompiAdminSummary() };
}

export async function createNativeInvoice(input: InvoiceCreateInput, adminUserId: string) {
  return db.$transaction(async (tx) => {
    const { student, recipient, recipientRole } = await resolveRecipient(tx, input.studentId);
    const invoiceValues = invoiceDataFromInput(input);
    const invoiceNumber = await generateInvoiceNumber(tx, invoiceValues.issueDate);

    if (input.savePriceToStudent) {
      await tx.studentBillingProfile.upsert({
        where: { studentId: input.studentId },
        update: {
          defaultSessionCount: input.sessionCount,
          pricePerClassCop: input.pricePerClassCop,
          notes: input.notes ?? undefined,
        },
        create: {
          studentId: input.studentId,
          defaultSessionCount: input.sessionCount,
          pricePerClassCop: input.pricePerClassCop,
          notes: input.notes ?? undefined,
        },
      });
    }

    return tx.nativeInvoice.create({
      data: {
        invoiceNumber,
        studentId: input.studentId,
        recipientUserId: recipient.id,
        createdByUserId: adminUserId,
        updatedByUserId: adminUserId,
        recipientName: recipient.name,
        recipientEmail: recipient.email,
        recipientRole,
        studentNameSnapshot: student.user.name,
        legalFooter: defaultLegalFooter(),
        ...invoiceValues,
        lineItems: {
          create: {
            description: lineItemDescription(input.sessionCount),
            quantity: input.sessionCount,
            unitPriceCop: input.pricePerClassCop,
            totalCop: invoiceValues.subtotalCop,
            sortOrder: 0,
          },
        },
      },
      include: nativeInvoiceInclude(),
    });
  });
}

export async function updateNativeInvoice(invoiceId: string, input: InvoiceUpdateInput, adminUserId: string) {
  return db.$transaction(async (tx) => {
    const existing = await tx.nativeInvoice.findUnique({
      where: { id: invoiceId },
      include: { lineItems: true },
    });
    if (!existing) throw new Error("INVOICE_NOT_FOUND");
    if (existing.status !== NativeInvoiceStatus.DRAFT) throw new Error("INVOICE_NOT_EDITABLE");

    const values = invoiceDataFromInput(input, existing);

    if (input.savePriceToStudent) {
      await tx.studentBillingProfile.upsert({
        where: { studentId: existing.studentId },
        update: {
          defaultSessionCount: values.sessionCount,
          pricePerClassCop: values.pricePerClassCop,
          notes: values.notes ?? undefined,
        },
        create: {
          studentId: existing.studentId,
          defaultSessionCount: values.sessionCount,
          pricePerClassCop: values.pricePerClassCop,
          notes: values.notes ?? undefined,
        },
      });
    }

    await tx.nativeInvoiceLineItem.deleteMany({ where: { invoiceId } });

    return tx.nativeInvoice.update({
      where: { id: invoiceId },
      data: {
        updatedByUserId: adminUserId,
        pdfBytes: null,
        pdfSha256: null,
        pdfGeneratedAt: null,
        ...values,
        lineItems: {
          create: {
            description: lineItemDescription(values.sessionCount),
            quantity: values.sessionCount,
            unitPriceCop: values.pricePerClassCop,
            totalCop: values.subtotalCop,
            sortOrder: 0,
          },
        },
      },
      include: nativeInvoiceInclude(),
    });
  });
}

export async function setNativeInvoiceStatus(invoiceId: string, status: NativeInvoiceStatus, adminUserId: string) {
  const now = new Date();
  return db.$transaction(async (tx) => {
    const existing = await tx.nativeInvoice.findUnique({ where: { id: invoiceId }, select: { totalCop: true } });
    if (!existing) throw new Error("INVOICE_NOT_FOUND");

    const data: Prisma.NativeInvoiceUpdateInput = {
      status,
      updatedBy: { connect: { id: adminUserId } },
    };

    if (status === NativeInvoiceStatus.OPEN) {
      data.openedAt = now;
      data.balanceCop = existing.totalCop;
    }
    if (status === NativeInvoiceStatus.PAID) {
      data.paidAt = now;
      data.balanceCop = 0;
    }
    if (status === NativeInvoiceStatus.CLOSED) {
      data.closedAt = now;
      data.balanceCop = 0;
    }
    if (status === NativeInvoiceStatus.VOID) {
      data.voidedAt = now;
      data.balanceCop = 0;
    }
    if (status === NativeInvoiceStatus.DRAFT) {
      data.openedAt = null;
      data.paidAt = null;
      data.closedAt = null;
      data.voidedAt = null;
      data.balanceCop = existing.totalCop;
    }

    await tx.nativeInvoice.update({ where: { id: invoiceId }, data });

    if (status === NativeInvoiceStatus.OPEN) {
      await grantCreditsForOpenedInvoice(invoiceId, adminUserId, tx);
      await recalculateNativeInvoicePaymentStatus(invoiceId, tx);
    }
    if (status === NativeInvoiceStatus.PAID) {
      await recalculateNativeInvoicePaymentStatus(invoiceId, tx);
    }
    if (status === NativeInvoiceStatus.VOID) {
      await reverseInvoiceCredits(invoiceId, adminUserId, tx);
    }

    const updated = await tx.nativeInvoice.findUnique({ where: { id: invoiceId }, include: nativeInvoiceInclude() });
    if (!updated) throw new Error("INVOICE_NOT_FOUND");
    return updated;
  });
}

export async function createNextMonthInvoice(invoiceId: string, adminUserId: string) {
  const source = await db.nativeInvoice.findUnique({ where: { id: invoiceId } });
  if (!source) throw new Error("INVOICE_NOT_FOUND");

  const nextPeriodStart = addMonths(source.periodStart, 1);
  const input: InvoiceCreateInput = {
    studentId: source.studentId,
    periodStart: invoiceDateInputValue(nextPeriodStart),
    periodEnd: invoiceDateInputValue(defaultPeriodEnd(nextPeriodStart)),
    issueDate: invoiceDateInputValue(new Date()),
    dueDate: invoiceDateInputValue(new Date()),
    sessionCount: source.sessionCount as NativeSessionCount,
    pricePerClassCop: source.pricePerClassCop,
    notes: source.notes ?? undefined,
  };

  return createNativeInvoice(input, adminUserId);
}

export async function bulkGenerateNativeInvoiceDrafts(periodStartValue: string, adminUserId: string) {
  const periodStart = parseInvoiceDate(periodStartValue);
  const periodEnd = defaultPeriodEnd(periodStart);
  const profiles = await db.studentBillingProfile.findMany({ include: { student: true } });
  const created = [];
  const skipped: Array<{ studentId: string; reason: string }> = [];

  for (const profile of profiles) {
    const existing = await db.nativeInvoice.findFirst({
      where: {
        studentId: profile.studentId,
        periodStart,
        periodEnd,
        status: { not: NativeInvoiceStatus.VOID },
      },
      select: { id: true },
    });

    if (existing) {
      skipped.push({ studentId: profile.studentId, reason: "EXISTS" });
      continue;
    }

    const sessionCount = VALID_NATIVE_SESSION_COUNTS.includes(profile.defaultSessionCount as NativeSessionCount)
      ? profile.defaultSessionCount as NativeSessionCount
      : DEFAULT_SESSION_COUNT;

    created.push(await createNativeInvoice({
      studentId: profile.studentId,
      periodStart: invoiceDateInputValue(periodStart),
      periodEnd: invoiceDateInputValue(periodEnd),
      issueDate: invoiceDateInputValue(new Date()),
      dueDate: invoiceDateInputValue(new Date()),
      sessionCount,
      pricePerClassCop: profile.pricePerClassCop,
      notes: profile.notes ?? undefined,
    }, adminUserId));
  }

  return { createdCount: created.length, skipped, created };
}

export async function getOrCreateStudentBillingProfile(studentId: string) {
  return db.studentBillingProfile.upsert({
    where: { studentId },
    update: {},
    create: { studentId, defaultSessionCount: DEFAULT_SESSION_COUNT, pricePerClassCop: DEFAULT_PRICE_PER_CLASS_COP },
  });
}

export async function updateStudentBillingProfile(studentId: string, input: {
  defaultSessionCount?: NativeSessionCount;
  pricePerClassCop?: number;
  notes?: string;
  autoGenerateEnabled?: boolean;
}) {
  return db.studentBillingProfile.upsert({
    where: { studentId },
    update: {
      defaultSessionCount: input.defaultSessionCount,
      pricePerClassCop: input.pricePerClassCop,
      notes: input.notes,
      autoGenerateEnabled: input.autoGenerateEnabled,
    },
    create: {
      studentId,
      defaultSessionCount: input.defaultSessionCount ?? DEFAULT_SESSION_COUNT,
      pricePerClassCop: input.pricePerClassCop ?? DEFAULT_PRICE_PER_CLASS_COP,
      notes: input.notes,
      autoGenerateEnabled: input.autoGenerateEnabled ?? false,
    },
  });
}

export async function notifyNativeInvoiceRecipient(invoiceId: string) {
  const invoice = await db.nativeInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice?.recipientUserId) return null;

  const recipient = await db.user.findUnique({ where: { id: invoice.recipientUserId }, select: { locale: true } });
  const isSpanish = recipient?.locale === "es";
  return createNotification({
    userId: invoice.recipientUserId,
    type: NotificationType.SYSTEM,
    title: isSpanish ? "Nueva factura disponible" : "New invoice available",
    body: isSpanish
      ? `La factura ${invoice.invoiceNumber} de ${invoice.studentNameSnapshot} está disponible para revisión.`
      : `Invoice ${invoice.invoiceNumber} for ${invoice.studentNameSnapshot} is ready to review.`,
    actionUrl: invoice.recipientRole === Role.PARENT ? "/parent/invoices" : "/invoices",
  });
}

export async function canViewerAccessNativeInvoice(viewer: {
  role: Role;
  studentProfileId?: string | null;
  parentGuardianProfileId?: string | null;
}, invoiceId: string) {
  const invoice = await db.nativeInvoice.findUnique({ where: { id: invoiceId }, select: { studentId: true, status: true } });
  if (!invoice) return { allowed: false, invoice: null };
  if (viewer.role === Role.ADMIN) return { allowed: true, invoice };
  if (!viewerVisibleStatuses.includes(invoice.status)) {
    return { allowed: false, invoice };
  }
  if (viewer.role === Role.STUDENT && viewer.studentProfileId === invoice.studentId) return { allowed: true, invoice };
  if (viewer.role === Role.PARENT && await parentCanAccessStudent(viewer.parentGuardianProfileId, invoice.studentId)) return { allowed: true, invoice };
  return { allowed: false, invoice };
}

export function defaultLegalFooter() {
  return process.env.BILLING_LEGAL_FOOTER?.trim()
    || "Documento interno de cobro de Harmonizing Academy. No reemplaza factura electrónica DIAN cuando aplique.";
}

export async function markNativeInvoicePdf(invoiceId: string, pdfBytes: Buffer, pdfSha256: string) {
  return db.nativeInvoice.update({
    where: { id: invoiceId },
    data: {
      pdfBytes,
      pdfSha256,
      pdfGeneratedAt: new Date(),
    },
    include: nativeInvoiceInclude(),
  });
}

export async function markNativeInvoiceEmailResult(invoiceId: string, result: {
  status: EmailDeliveryStatus;
  error?: string | null;
}) {
  return db.nativeInvoice.update({
    where: { id: invoiceId },
    data: {
      emailStatus: result.status,
      emailError: result.error ?? null,
      emailedAt: result.status === EmailDeliveryStatus.SENT ? new Date() : undefined,
    },
  });
}
