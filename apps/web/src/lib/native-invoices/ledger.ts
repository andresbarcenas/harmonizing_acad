import "server-only";

import {
  ClassCreditLedgerEntryType,
  ClassSessionType,
  NativeInvoicePaymentStatus,
  NativeInvoiceStatus,
  Prisma,
  SessionStatus,
  type NativeInvoicePaymentMethod,
} from "@prisma/client";

import { db } from "@/lib/db";

// Makeup classes fulfill a previously missed/owed lesson and should not reduce purchased class credits again.
const billableClassTypes = new Set<ClassSessionType>([
  ClassSessionType.RECURRING,
  ClassSessionType.SINGLE,
  ClassSessionType.EXTRA,
  ClassSessionType.REPLACEMENT,
]);

const consumingStatuses = new Set<SessionStatus>([
  SessionStatus.COMPLETED,
  SessionStatus.NO_SHOW,
]);

type DbClient = Prisma.TransactionClient | typeof db;

function parseLedgerDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function recalculateNativeInvoicePaymentStatus(invoiceId: string, client: DbClient = db) {
  const invoice = await client.nativeInvoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, totalCop: true, status: true },
  });
  if (!invoice) throw new Error("INVOICE_NOT_FOUND");
  if (invoice.status === NativeInvoiceStatus.VOID || invoice.status === NativeInvoiceStatus.CLOSED || invoice.status === NativeInvoiceStatus.DRAFT) {
    return invoice;
  }

  const aggregate = await client.nativeInvoicePayment.aggregate({
    where: { invoiceId, status: NativeInvoicePaymentStatus.ACTIVE },
    _sum: { amountCop: true },
  });
  const paidCop = aggregate._sum.amountCop ?? 0;
  const balanceCop = Math.max(invoice.totalCop - paidCop, 0);
  const nextStatus = paidCop >= invoice.totalCop ? NativeInvoiceStatus.PAID : NativeInvoiceStatus.OPEN;

  return client.nativeInvoice.update({
    where: { id: invoiceId },
    data: {
      balanceCop,
      status: nextStatus,
      paidAt: nextStatus === NativeInvoiceStatus.PAID ? new Date() : null,
    },
  });
}

export async function createNativeInvoicePayment(input: {
  invoiceId: string;
  amountCop: number;
  method: NativeInvoicePaymentMethod;
  paymentDate: string;
  reference?: string;
  notes?: string;
  adminUserId: string;
}) {
  return db.$transaction(async (tx) => {
    const invoice = await tx.nativeInvoice.findUnique({
      where: { id: input.invoiceId },
      select: { id: true, studentId: true, status: true },
    });
    if (!invoice) throw new Error("INVOICE_NOT_FOUND");
    if (invoice.status !== NativeInvoiceStatus.OPEN && invoice.status !== NativeInvoiceStatus.PAID) {
      throw new Error("INVOICE_NOT_PAYABLE");
    }

    const payment = await tx.nativeInvoicePayment.create({
      data: {
        invoiceId: invoice.id,
        studentId: invoice.studentId,
        amountCop: input.amountCop,
        method: input.method,
        paymentDate: parseLedgerDate(input.paymentDate),
        reference: input.reference,
        notes: input.notes,
        createdByUserId: input.adminUserId,
      },
      include: { attachments: true },
    });

    await recalculateNativeInvoicePaymentStatus(invoice.id, tx);
    return payment;
  });
}

export async function voidNativeInvoicePayment(input: {
  paymentId: string;
  adminUserId: string;
  reason?: string;
}) {
  return db.$transaction(async (tx) => {
    const payment = await tx.nativeInvoicePayment.findUnique({
      where: { id: input.paymentId },
      select: { id: true, invoiceId: true, status: true },
    });
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
    if (payment.status === NativeInvoicePaymentStatus.VOID) return payment;

    const updated = await tx.nativeInvoicePayment.update({
      where: { id: payment.id },
      data: {
        status: NativeInvoicePaymentStatus.VOID,
        voidedByUserId: input.adminUserId,
        voidedAt: new Date(),
        voidReason: input.reason,
      },
    });

    await recalculateNativeInvoicePaymentStatus(payment.invoiceId, tx);
    return updated;
  });
}

export async function grantCreditsForOpenedInvoice(invoiceId: string, adminUserId?: string | null, client: DbClient = db) {
  const invoice = await client.nativeInvoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, studentId: true, sessionCount: true, invoiceNumber: true },
  });
  if (!invoice) throw new Error("INVOICE_NOT_FOUND");

  const aggregate = await client.classCreditLedgerEntry.aggregate({
    where: {
      invoiceId,
      type: { in: [ClassCreditLedgerEntryType.INVOICE_GRANT, ClassCreditLedgerEntryType.REVERSAL] },
    },
    _sum: { delta: true },
  });
  const netGranted = aggregate._sum.delta ?? 0;
  if (netGranted > 0) return null;

  return client.classCreditLedgerEntry.create({
    data: {
      studentId: invoice.studentId,
      invoiceId: invoice.id,
      delta: invoice.sessionCount,
      type: ClassCreditLedgerEntryType.INVOICE_GRANT,
      reason: `Invoice ${invoice.invoiceNumber}`,
      note: "Credits granted when invoice opened.",
      createdByUserId: adminUserId ?? undefined,
    },
  });
}

export async function reverseInvoiceCredits(invoiceId: string, adminUserId?: string | null, client: DbClient = db) {
  const invoice = await client.nativeInvoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, studentId: true, invoiceNumber: true },
  });
  if (!invoice) throw new Error("INVOICE_NOT_FOUND");

  const aggregate = await client.classCreditLedgerEntry.aggregate({
    where: {
      invoiceId,
      type: { in: [ClassCreditLedgerEntryType.INVOICE_GRANT, ClassCreditLedgerEntryType.REVERSAL] },
    },
    _sum: { delta: true },
  });
  const netGranted = aggregate._sum.delta ?? 0;
  if (netGranted <= 0) return null;

  return client.classCreditLedgerEntry.create({
    data: {
      studentId: invoice.studentId,
      invoiceId: invoice.id,
      delta: -netGranted,
      type: ClassCreditLedgerEntryType.REVERSAL,
      reason: `Void invoice ${invoice.invoiceNumber}`,
      note: "Credits reversed when invoice was voided.",
      createdByUserId: adminUserId ?? undefined,
    },
  });
}

export async function syncClassSessionCreditConsumption(classSessionId: string, userId?: string | null, client: DbClient = db) {
  const session = await client.classSession.findUnique({
    where: { id: classSessionId },
    select: { id: true, studentId: true, type: true, status: true },
  });
  if (!session) throw new Error("CLASS_SESSION_NOT_FOUND");

  const entries = await client.classCreditLedgerEntry.findMany({
    where: {
      classSessionId: session.id,
      type: {
        in: [
          ClassCreditLedgerEntryType.CLASS_COMPLETED,
          ClassCreditLedgerEntryType.CLASS_NO_SHOW,
          ClassCreditLedgerEntryType.REVERSAL,
        ],
      },
    },
    select: { type: true, delta: true },
  });
  const netDelta = entries.reduce((sum, entry) => sum + entry.delta, 0);
  const shouldConsume = billableClassTypes.has(session.type) && consumingStatuses.has(session.status);
  const targetType = session.status === SessionStatus.NO_SHOW
    ? ClassCreditLedgerEntryType.CLASS_NO_SHOW
    : ClassCreditLedgerEntryType.CLASS_COMPLETED;
  const hasTargetConsumption = entries.some((entry) => entry.type === targetType && entry.delta < 0);

  if (shouldConsume && netDelta === 0) {
    return client.classCreditLedgerEntry.create({
      data: {
        studentId: session.studentId,
        classSessionId: session.id,
        delta: -1,
        type: targetType,
        reason: session.status === SessionStatus.NO_SHOW ? "Class no-show" : "Class completed",
        createdByUserId: userId ?? undefined,
      },
    });
  }

  if (shouldConsume && netDelta < 0 && !hasTargetConsumption) {
    await client.classCreditLedgerEntry.create({
      data: {
        studentId: session.studentId,
        classSessionId: session.id,
        delta: Math.abs(netDelta),
        type: ClassCreditLedgerEntryType.REVERSAL,
        reason: "Class billable outcome changed",
        note: "Previous credit consumption was reclassified to match the current class status.",
        createdByUserId: userId ?? undefined,
      },
    });
    return client.classCreditLedgerEntry.create({
      data: {
        studentId: session.studentId,
        classSessionId: session.id,
        delta: -1,
        type: targetType,
        reason: session.status === SessionStatus.NO_SHOW ? "Class no-show" : "Class completed",
        createdByUserId: userId ?? undefined,
      },
    });
  }

  if (!shouldConsume && netDelta < 0) {
    return client.classCreditLedgerEntry.create({
      data: {
        studentId: session.studentId,
        classSessionId: session.id,
        delta: Math.abs(netDelta),
        type: ClassCreditLedgerEntryType.REVERSAL,
        reason: "Class status changed",
        note: "Previous credit consumption was reversed because the class is no longer billable/consuming.",
        createdByUserId: userId ?? undefined,
      },
    });
  }

  return null;
}

export async function createManualClassCreditAdjustment(input: {
  studentId: string;
  delta: number;
  reason?: string;
  note?: string;
  adminUserId: string;
}) {
  return db.classCreditLedgerEntry.create({
    data: {
      studentId: input.studentId,
      delta: input.delta,
      type: ClassCreditLedgerEntryType.MANUAL_ADJUSTMENT,
      reason: input.reason,
      note: input.note,
      createdByUserId: input.adminUserId,
    },
  });
}

export async function getStudentClassCreditSummary(studentId: string, take = 12) {
  const [aggregate, entries] = await Promise.all([
    db.classCreditLedgerEntry.aggregate({
      where: { studentId },
      _sum: { delta: true },
    }),
    db.classCreditLedgerEntry.findMany({
      where: { studentId },
      include: {
        invoice: { select: { invoiceNumber: true } },
        classSession: { select: { startsAtUtc: true, status: true, type: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: [{ effectiveAt: "desc" }, { createdAt: "desc" }],
      take,
    }),
  ]);

  return {
    balance: aggregate._sum.delta ?? 0,
    entries,
  };
}
