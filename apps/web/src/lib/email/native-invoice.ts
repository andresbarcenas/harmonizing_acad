import "server-only";

import { EmailDeliveryStatus, EmailDeliveryType } from "@prisma/client";

import { createEmailDeliveryLog, markEmailDeliveryFailed, markEmailDeliverySent, recordSkippedEmailDelivery } from "@/lib/email/delivery-log";
import { formatCop } from "@/lib/native-invoices/shared";
import { getResendClient } from "@/lib/resend";

function fromEmail() {
  return process.env.RESEND_FROM_EMAIL?.trim() || "Harmonizing Academy <no-reply@harmonizing.app>";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function invoiceEmailHtml(input: { recipientName: string; studentName: string; invoiceNumber: string; totalCop: number }) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f7f2ea;font-family:Arial,sans-serif;color:#211f1c;">
    <div style="max-width:600px;margin:0 auto;padding:34px 20px;">
      <div style="background:#fff;border:1px solid #eadfce;border-radius:28px;padding:30px;box-shadow:0 18px 45px rgba(72,50,25,.08);">
        <p style="margin:0 0 12px;color:#c77400;font-size:11px;letter-spacing:.22em;text-transform:uppercase;font-weight:700;">Factura Harmonizing / Harmonizing invoice</p>
        <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:32px;line-height:1.05;font-weight:400;">Harmonizing Academy</h1>
        <p style="margin:0 0 14px;color:#6d675f;line-height:1.6;">Hola ${escapeHtml(input.recipientName)}, adjuntamos la factura ${escapeHtml(input.invoiceNumber)} para ${escapeHtml(input.studentName)} por ${escapeHtml(formatCop(input.totalCop, "es"))}.</p>
        <p style="margin:0;color:#6d675f;line-height:1.6;">Hi ${escapeHtml(input.recipientName)}, attached is invoice ${escapeHtml(input.invoiceNumber)} for ${escapeHtml(input.studentName)}.</p>
      </div>
    </div>
  </body>
</html>`;
}

export async function sendNativeInvoiceEmail(input: {
  invoiceId: string;
  invoiceNumber: string;
  recipientEmail: string;
  recipientName: string;
  recipientUserId?: string | null;
  studentName: string;
  totalCop: number;
  pdfBytes: Buffer;
}) {
  const subject = `Factura Harmonizing ${input.invoiceNumber}`;
  const logInput = {
    type: EmailDeliveryType.INVOICE,
    recipientEmail: input.recipientEmail,
    recipientUserId: input.recipientUserId ?? null,
    subject,
    metadata: {
      nativeInvoiceId: input.invoiceId,
      invoiceNumber: input.invoiceNumber,
      totalCop: input.totalCop,
      studentName: input.studentName,
    },
  };

  const resend = getResendClient();
  if (!resend) {
    await recordSkippedEmailDelivery(logInput, "RESEND_API_KEY missing");
    return { status: EmailDeliveryStatus.SKIPPED, error: "RESEND_API_KEY missing", providerMessageId: null };
  }

  let logId: string | null = null;
  try {
    const text = [
      `Hola ${input.recipientName},`,
      "",
      `Adjuntamos la factura ${input.invoiceNumber} para ${input.studentName} por ${formatCop(input.totalCop, "es")}.`,
      "",
      `Hi ${input.recipientName},`,
      "",
      `Attached is invoice ${input.invoiceNumber} for ${input.studentName}.`,
      "",
      "Harmonizing Academy",
    ].join("\n");

    logId = await createEmailDeliveryLog(logInput);
    const result = await resend.emails.send({
      from: fromEmail(),
      to: input.recipientEmail,
      subject,
      text,
      html: invoiceEmailHtml(input),
      attachments: [
        {
          filename: `harmonizing-invoice-${input.invoiceNumber}.pdf`,
          content: input.pdfBytes.toString("base64"),
        },
      ],
    });

    if (result.error) throw new Error(result.error.message);
    await markEmailDeliverySent(logId, { providerMessageId: result.data?.id });
    return { status: EmailDeliveryStatus.SENT, error: null, providerMessageId: result.data?.id ?? null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Resend error";
    await markEmailDeliveryFailed(logId, { errorMessage: message });
    return { status: EmailDeliveryStatus.FAILED, error: message, providerMessageId: null };
  }
}
