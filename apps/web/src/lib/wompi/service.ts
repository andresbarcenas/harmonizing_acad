import "server-only";

import { NativeInvoicePaymentMethod, NativeInvoicePaymentStatus, NativeInvoiceStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { recalculateNativeInvoicePaymentStatus } from "@/lib/native-invoices/ledger";
import { createWompiPaymentLink } from "@/lib/wompi/client";
import {
  WOMPI_PROVIDER,
  getAppBaseUrl,
  getWompiConfigurationStatus,
  getWompiEnvironment,
  isWompiEnabled,
} from "@/lib/wompi/config";
import { type WompiWebhookPayload, verifyWompiWebhookChecksum } from "@/lib/wompi/webhook";

const payableStatuses = new Set<NativeInvoiceStatus>([NativeInvoiceStatus.OPEN]);
const finalFailureStatuses = new Set(["DECLINED", "VOIDED", "ERROR"]);

export function getWompiAdminSummary() {
  return getWompiConfigurationStatus();
}

export async function ensureWompiPaymentLinkForInvoice(invoiceId: string) {
  const config = getWompiConfigurationStatus();
  if (!config.enabled) throw new Error("WOMPI_DISABLED");
  if (!config.configured) throw new Error(`WOMPI_NOT_CONFIGURED:${config.missing.join(",")}`);

  const invoice = await db.nativeInvoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error("INVOICE_NOT_FOUND");
  if (!payableStatuses.has(invoice.status)) throw new Error("INVOICE_NOT_PAYABLE_ONLINE");
  if (invoice.balanceCop <= 0) throw new Error("INVOICE_ALREADY_PAID");

  if (invoice.paymentProvider === WOMPI_PROVIDER && invoice.paymentProviderLinkId && invoice.paymentUrl) {
    if (invoice.paymentProviderAmountCop !== invoice.balanceCop) throw new Error("WOMPI_LINK_AMOUNT_STALE");
    return invoice;
  }

  const amountCop = invoice.balanceCop;
  const returnUrl = buildInvoiceReturnUrl(invoice.id);
  const { link, checkoutUrl } = await createWompiPaymentLink({
    name: `Factura ${invoice.invoiceNumber}`,
    description: `Harmonizing Academy - ${invoice.studentNameSnapshot} - ${invoice.invoiceNumber}`,
    single_use: true,
    collect_shipping: false,
    currency: "COP",
    amount_in_cents: amountCop * 100,
    redirect_url: returnUrl,
    sku: invoice.invoiceNumber.slice(0, 36),
  });

  return db.nativeInvoice.update({
    where: { id: invoice.id },
    data: {
      paymentProvider: WOMPI_PROVIDER,
      paymentUrl: checkoutUrl,
      paymentProviderStatus: "LINK_CREATED",
      paymentProviderLinkId: link.id,
      paymentProviderEnvironment: getWompiEnvironment(),
      paymentProviderAmountCop: amountCop,
      paymentProviderExpiresAt: link.expires_at ? new Date(link.expires_at) : null,
      paymentProviderLastSyncedAt: new Date(),
    },
  });
}

export async function processWompiWebhook(input: {
  payload: WompiWebhookPayload;
  checksumHeader?: string | null;
}) {
  if (!isWompiEnabled()) {
    return { processed: false, reason: "WOMPI_DISABLED" };
  }

  const checksum = input.checksumHeader || input.payload.signature?.checksum || null;
  if (!verifyWompiWebhookChecksum(input.payload, input.checksumHeader)) {
    throw new Error("INVALID_WOMPI_CHECKSUM");
  }

  const transaction = input.payload.data?.transaction;
  const existingEvent = checksum
    ? await db.paymentProviderWebhookEvent.findUnique({
        where: { provider_checksum: { provider: WOMPI_PROVIDER, checksum } },
      })
    : null;

  if (existingEvent?.processingStatus === "PROCESSED") {
    return { processed: false, duplicate: true, reason: "DUPLICATE_EVENT" };
  }

  const eventRecord = existingEvent ?? await db.paymentProviderWebhookEvent.create({
    data: {
      provider: WOMPI_PROVIDER,
      environment: input.payload.environment ?? null,
      eventType: input.payload.event || "unknown",
      checksum,
      transactionId: transaction?.id ?? null,
      status: transaction?.status ?? null,
      payload: input.payload as unknown as Prisma.InputJsonValue,
    },
  });

  try {
    const result = await processVerifiedWompiEvent(input.payload);
    await db.paymentProviderWebhookEvent.update({
      where: { id: eventRecord.id },
      data: {
        invoiceId: result.invoiceId ?? null,
        transactionId: transaction?.id ?? null,
        status: transaction?.status ?? null,
        processingStatus: result.processed ? "PROCESSED" : "IGNORED",
        error: result.reason ?? null,
        processedAt: new Date(),
      },
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Wompi webhook error";
    await db.paymentProviderWebhookEvent.update({
      where: { id: eventRecord.id },
      data: {
        transactionId: transaction?.id ?? null,
        status: transaction?.status ?? null,
        processingStatus: "FAILED",
        error: message,
        processedAt: new Date(),
      },
    });
    throw error;
  }
}

async function processVerifiedWompiEvent(payload: WompiWebhookPayload) {
  if (payload.event !== "transaction.updated") {
    return { processed: false, reason: "UNSUPPORTED_EVENT" };
  }

  const transaction = payload.data?.transaction;
  if (!transaction?.id) {
    return { processed: false, reason: "MISSING_TRANSACTION" };
  }
  if (!transaction.payment_link_id) {
    return { processed: false, transactionId: transaction.id, reason: "MISSING_PAYMENT_LINK_ID" };
  }

  const invoice = await db.nativeInvoice.findFirst({
    where: {
      paymentProvider: WOMPI_PROVIDER,
      paymentProviderLinkId: transaction.payment_link_id,
    },
  });
  if (!invoice) {
    return { processed: false, reason: "INVOICE_NOT_FOUND_FOR_PAYMENT_LINK" };
  }

  if (transaction.currency !== "COP") {
    await markInvoiceProviderStatus(invoice.id, transaction);
    return { processed: false, invoiceId: invoice.id, reason: "UNSUPPORTED_CURRENCY" };
  }

  const amountCop = Math.round(transaction.amount_in_cents / 100);
  const expectedCop = invoice.paymentProviderAmountCop ?? invoice.balanceCop;
  if (amountCop !== expectedCop) {
    await db.nativeInvoice.update({
      where: { id: invoice.id },
      data: {
        paymentProviderStatus: "AMOUNT_MISMATCH",
        paymentProviderTransactionId: transaction.id,
        paymentProviderLastSyncedAt: new Date(),
      },
    });
    return { processed: false, invoiceId: invoice.id, reason: "AMOUNT_MISMATCH" };
  }

  if (transaction.status === "APPROVED") {
    await recordApprovedWompiPayment(invoice.id, invoice.studentId, transaction, amountCop, payload);
    return { processed: true, invoiceId: invoice.id, transactionId: transaction.id };
  }

  if (finalFailureStatuses.has(transaction.status)) {
    await markInvoiceProviderStatus(invoice.id, transaction);
    return { processed: true, invoiceId: invoice.id, transactionId: transaction.id, reason: transaction.status };
  }

  await markInvoiceProviderStatus(invoice.id, transaction);
  return { processed: false, invoiceId: invoice.id, transactionId: transaction.id, reason: transaction.status || "PENDING" };
}

async function recordApprovedWompiPayment(
  invoiceId: string,
  studentId: string,
  transaction: NonNullable<WompiWebhookPayload["data"]>["transaction"] & { id: string },
  amountCop: number,
  payload: WompiWebhookPayload,
) {
  await db.$transaction(async (tx) => {
    const invoice = await tx.nativeInvoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, status: true },
    });
    if (!invoice) throw new Error("INVOICE_NOT_FOUND");
    if (invoice.status !== NativeInvoiceStatus.OPEN && invoice.status !== NativeInvoiceStatus.PAID) {
      throw new Error("INVOICE_NOT_PAYABLE");
    }

    await tx.nativeInvoicePayment.upsert({
      where: {
        provider_providerTransactionId: {
          provider: WOMPI_PROVIDER,
          providerTransactionId: transaction.id,
        },
      },
      update: {
        providerStatus: transaction.status,
        providerPayload: payload as unknown as Prisma.InputJsonValue,
      },
      create: {
        invoiceId,
        studentId,
        amountCop,
        method: NativeInvoicePaymentMethod.WOMPI,
        paymentDate: parseProviderPaymentDate(transaction.finalized_at || transaction.created_at),
        reference: transaction.reference || transaction.id,
        notes: `Wompi ${transaction.payment_method_type ?? "payment"} transaction ${transaction.id}`,
        status: NativeInvoicePaymentStatus.ACTIVE,
        provider: WOMPI_PROVIDER,
        providerTransactionId: transaction.id,
        providerStatus: transaction.status,
        providerPayload: payload as unknown as Prisma.InputJsonValue,
      },
    });

    await tx.nativeInvoice.update({
      where: { id: invoiceId },
      data: {
        paymentProvider: WOMPI_PROVIDER,
        paymentProviderStatus: transaction.status,
        paymentProviderTransactionId: transaction.id,
        paymentProviderLastSyncedAt: new Date(),
      },
    });

    await recalculateNativeInvoicePaymentStatus(invoiceId, tx);
  });
}

async function markInvoiceProviderStatus(invoiceId: string, transaction: { id: string; status: string }) {
  await db.nativeInvoice.update({
    where: { id: invoiceId },
    data: {
      paymentProvider: WOMPI_PROVIDER,
      paymentProviderStatus: transaction.status,
      paymentProviderTransactionId: transaction.id,
      paymentProviderLastSyncedAt: new Date(),
    },
  });
}

function parseProviderPaymentDate(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function buildInvoiceReturnUrl(invoiceId: string) {
  const appBaseUrl = getAppBaseUrl();
  if (!appBaseUrl) return undefined;
  const url = new URL("/api/payments/wompi/return", appBaseUrl);
  url.searchParams.set("invoiceId", invoiceId);
  return url.toString();
}
