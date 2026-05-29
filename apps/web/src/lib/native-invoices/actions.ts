import "server-only";

import { EmailDeliveryStatus, NativeInvoiceStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { sendNativeInvoiceEmail } from "@/lib/email/native-invoice";
import { generateNativeInvoicePdf } from "@/lib/native-invoices/pdf";
import { markNativeInvoiceEmailResult, markNativeInvoicePdf, nativeInvoiceInclude, notifyNativeInvoiceRecipient, setNativeInvoiceStatus } from "@/lib/native-invoices/service";

const sendableStatuses: NativeInvoiceStatus[] = [NativeInvoiceStatus.DRAFT, NativeInvoiceStatus.OPEN];

export async function ensureNativeInvoicePdf(invoiceId: string) {
  const invoice = await db.nativeInvoice.findUnique({
    where: { id: invoiceId },
    include: nativeInvoiceInclude(),
  });
  if (!invoice) throw new Error("INVOICE_NOT_FOUND");
  if (!isNativeInvoicePdfStale(invoice)) {
    return { invoice, pdfBytes: Buffer.from(invoice.pdfBytes!), pdfSha256: invoice.pdfSha256 };
  }

  const generated = await generateNativeInvoicePdf(invoice);
  const updated = await markNativeInvoicePdf(invoice.id, generated.bytes, generated.sha256);
  return { invoice: updated, pdfBytes: generated.bytes, pdfSha256: generated.sha256 };
}

export async function regenerateNativeInvoicePdf(invoiceId: string) {
  const invoice = await db.nativeInvoice.findUnique({
    where: { id: invoiceId },
    include: nativeInvoiceInclude(),
  });
  if (!invoice) throw new Error("INVOICE_NOT_FOUND");
  const generated = await generateNativeInvoicePdf(invoice);
  const updated = await markNativeInvoicePdf(invoice.id, generated.bytes, generated.sha256);
  return { invoice: updated, pdfBytes: generated.bytes, pdfSha256: generated.sha256 };
}

export async function openAndSendNativeInvoice(invoiceId: string, adminUserId: string) {
  const before = await db.nativeInvoice.findUnique({ where: { id: invoiceId }, select: { status: true, openedAt: true } });
  if (!before) throw new Error("INVOICE_NOT_FOUND");
  if (!sendableStatuses.includes(before.status)) throw new Error("INVOICE_CANNOT_SEND");

  if (before.status === NativeInvoiceStatus.DRAFT) {
    await setNativeInvoiceStatus(invoiceId, NativeInvoiceStatus.OPEN, adminUserId);
  }

  const { invoice, pdfBytes } = await regenerateNativeInvoicePdf(invoiceId);
  const emailResult = await sendNativeInvoiceEmail({
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    recipientEmail: invoice.recipientEmail,
    recipientName: invoice.recipientName,
    recipientUserId: invoice.recipientUserId,
    studentName: invoice.studentNameSnapshot,
    totalCop: invoice.totalCop,
    pdfBytes,
  });

  await markNativeInvoiceEmailResult(invoice.id, {
    status: emailResult.status,
    error: emailResult.error,
  });

  if (!before.openedAt) {
    await notifyNativeInvoiceRecipient(invoice.id);
  }

  return {
    invoiceId: invoice.id,
    emailStatus: emailResult.status,
    emailError: emailResult.error,
    sent: emailResult.status === EmailDeliveryStatus.SENT,
  };
}

function isNativeInvoicePdfStale(invoice: {
  pdfBytes: Uint8Array | Buffer | null;
  pdfGeneratedAt: Date | null;
  updatedAt: Date;
}) {
  if (!invoice.pdfBytes || !invoice.pdfGeneratedAt) return true;

  // Saving regenerated PDF bytes also touches `updatedAt`; allow a small
  // tolerance so the PDF write itself does not make the cache stale forever.
  return invoice.updatedAt.getTime() > invoice.pdfGeneratedAt.getTime() + 1000;
}
