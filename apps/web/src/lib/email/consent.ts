import "server-only";

import { ConsentEmailStatus, EmailDeliveryType } from "@prisma/client";

import { db } from "@/lib/db";
import { createEmailDeliveryLog, markEmailDeliveryFailed, markEmailDeliverySent, recordSkippedEmailDelivery } from "@/lib/email/delivery-log";
import { getResendClient } from "@/lib/resend";

function fromEmail() {
  return process.env.RESEND_FROM_EMAIL?.trim() || "Harmonizing Academy <no-reply@harmonizing.app>";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function consentEmailHtml(input: { signerName: string; studentName: string }) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f7f2ea;font-family:Arial,sans-serif;color:#211f1c;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <div style="background:#fff;border:1px solid #eadfce;border-radius:28px;padding:28px;box-shadow:0 18px 45px rgba(72,50,25,.08);">
        <p style="margin:0 0 12px;color:#c77400;font-size:11px;letter-spacing:.22em;text-transform:uppercase;font-weight:700;">Consentimiento firmado / Signed consent</p>
        <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:32px;line-height:1.05;font-weight:400;">Harmonizing Academy</h1>
        <p style="margin:0 0 14px;color:#6d675f;line-height:1.6;">Hola ${escapeHtml(input.signerName)}, adjuntamos una copia PDF del consentimiento de privacidad y medios firmado para ${escapeHtml(input.studentName)}.</p>
        <p style="margin:0;color:#6d675f;line-height:1.6;">Hi ${escapeHtml(input.signerName)}, attached is a PDF copy of the signed privacy and media consent for ${escapeHtml(input.studentName)}.</p>
      </div>
    </div>
  </body>
</html>`;
}

export async function sendConsentSignedEmail(signatureId: string) {
  const signature = await db.consentSignature.findUnique({
    where: { id: signatureId },
    include: {
      user: true,
      document: true,
    },
  });
  if (!signature) return null;

  const subject = signature.locale === "es"
    ? "Copia de consentimiento firmado - Harmonizing Academy"
    : "Signed consent copy - Harmonizing Academy";
  const logInput = {
    type: EmailDeliveryType.CONSENT_COPY,
    recipientEmail: signature.signerEmail,
    recipientUserId: signature.userId,
    subject,
    consentSignatureId: signature.id,
    metadata: {
      signerName: signature.signerName,
      signerRelationship: signature.signerRelationship,
      documentVersion: signature.document.version,
    },
  };
  const resend = getResendClient();
  if (!resend) {
    await recordSkippedEmailDelivery(logInput, "RESEND_API_KEY missing");
    return db.consentSignature.update({
      where: { id: signature.id },
      data: {
        emailStatus: ConsentEmailStatus.SKIPPED,
        emailError: "RESEND_API_KEY missing",
      },
    });
  }

  let logId: string | null = null;
  try {
    const text = [
      `Hola ${signature.signerName},`,
      "",
      `Adjuntamos una copia PDF del consentimiento de privacidad y medios firmado para ${signature.user.name}.`,
      "",
      `Hi ${signature.signerName},`,
      "",
      `Attached is a PDF copy of the signed privacy and media consent for ${signature.user.name}.`,
      "",
      "Harmonizing Academy",
    ].join("\n");

    logId = await createEmailDeliveryLog(logInput);
    const result = await resend.emails.send({
      from: fromEmail(),
      to: signature.signerEmail,
      subject,
      text,
      html: consentEmailHtml({ signerName: signature.signerName, studentName: signature.user.name }),
      attachments: [
        {
          filename: `harmonizing-consent-${signature.user.email.replace(/[^a-z0-9._-]/gi, "_")}.pdf`,
          content: Buffer.from(signature.pdfBytes).toString("base64"),
        },
      ],
    });

    if (result.error) throw new Error(result.error.message);
    await markEmailDeliverySent(logId, { providerMessageId: result.data?.id });

    return db.consentSignature.update({
      where: { id: signature.id },
      data: {
        emailStatus: ConsentEmailStatus.SENT,
        resendMessageId: result.data?.id,
        emailSentAt: new Date(),
        emailError: null,
      },
    });
  } catch (error) {
    await markEmailDeliveryFailed(logId, { errorMessage: error instanceof Error ? error.message : "Unknown Resend error" });
    return db.consentSignature.update({
      where: { id: signature.id },
      data: {
        emailStatus: ConsentEmailStatus.FAILED,
        emailError: error instanceof Error ? error.message : "Unknown Resend error",
      },
    });
  }
}
