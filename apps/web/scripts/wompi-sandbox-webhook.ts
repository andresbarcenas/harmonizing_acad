import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

function argValue(name: string) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match?.slice(prefix.length);
}

function usage() {
  console.log("Usage: npm run wompi:webhook:test -- --invoice=HA-2026-0001 [--status=APPROVED]");
  console.log("       npm run wompi:webhook:test -- --invoiceId=<nativeInvoiceId> [--status=DECLINED]");
}

async function main() {
  const invoiceNumber = argValue("invoice");
  const invoiceId = argValue("invoiceId");
  const status = (argValue("status") || "APPROVED").toUpperCase();
  if (!invoiceNumber && !invoiceId) {
    usage();
    process.exit(1);
  }

  const secret = process.env.WOMPI_EVENTS_SECRET?.trim();
  if (!secret) throw new Error("WOMPI_EVENTS_SECRET is required to sign the local webhook payload.");

  const appBaseUrl = (process.env.WOMPI_APP_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3010").replace(/\/$/, "");
  const invoice = await prisma.nativeInvoice.findFirst({
    where: invoiceId ? { id: invoiceId } : { invoiceNumber },
  });
  if (!invoice) throw new Error("Invoice not found.");
  if (!invoice.paymentProviderLinkId) throw new Error("Invoice does not have a Wompi payment link yet. Create the link from /admin/invoices first.");

  const amountCop = invoice.paymentProviderAmountCop ?? invoice.balanceCop ?? invoice.totalCop;
  const transaction = {
    id: `local-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    amount_in_cents: amountCop * 100,
    reference: `LOCAL-${invoice.invoiceNumber}`,
    customer_email: invoice.recipientEmail,
    currency: "COP",
    payment_method_type: "CARD",
    redirect_url: `${appBaseUrl}/api/payments/wompi/return?invoiceId=${invoice.id}`,
    status,
    payment_link_id: invoice.paymentProviderLinkId,
    payment_source_id: null,
    finalized_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const timestamp = Math.floor(Date.now() / 1000);
  const properties = ["transaction.id", "transaction.status", "transaction.amount_in_cents"];
  const checksumInput = `${transaction.id}${transaction.status}${transaction.amount_in_cents}${timestamp}${secret}`;
  const checksum = crypto.createHash("sha256").update(checksumInput).digest("hex").toUpperCase();
  const payload = {
    event: "transaction.updated",
    data: { transaction },
    environment: process.env.WOMPI_ENV === "production" ? "prod" : "test",
    signature: { properties, checksum },
    timestamp,
    sent_at: new Date().toISOString(),
  };

  const response = await fetch(`${appBaseUrl}/api/payments/wompi/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Event-Checksum": checksum,
    },
    body: JSON.stringify(payload),
  });
  const body = await response.text();
  console.log(`POST ${response.status} ${response.statusText}`);
  console.log(body);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
