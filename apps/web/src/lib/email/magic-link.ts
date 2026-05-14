import "server-only";

import { EmailDeliveryType } from "@prisma/client";

import { createEmailDeliveryLog, markEmailDeliveryFailed, markEmailDeliverySent, recordSkippedEmailDelivery } from "@/lib/email/delivery-log";
import { getResendClient } from "@/lib/resend";
import type { AppLocale } from "@/lib/i18n/locales";

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

function magicLinkEmailHtml(input: { name: string; url: string; expiresMinutes: number; locale: AppLocale }) {
  const isSpanish = input.locale === "es";
  const title = isSpanish ? "Tu enlace seguro para ingresar" : "Your secure sign-in link";
  const intro = isSpanish
    ? "Usa este enlace para ingresar a Harmonizing Academy sin escribir tu contraseña."
    : "Use this link to sign in to Harmonizing Academy without typing your password.";
  const note = isSpanish
    ? `El enlace vence en ${input.expiresMinutes} minutos y solo puede usarse una vez.`
    : `This link expires in ${input.expiresMinutes} minutes and can only be used once.`;
  const button = isSpanish ? "Ingresar a mi cuenta" : "Sign in to my account";

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f7f2ea;font-family:Arial,sans-serif;color:#211f1c;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <div style="background:#fff;border:1px solid #eadfce;border-radius:28px;padding:30px;box-shadow:0 18px 45px rgba(72,50,25,.08);">
        <p style="margin:0 0 12px;color:#c77400;font-size:11px;letter-spacing:.22em;text-transform:uppercase;font-weight:700;">Harmonizing Academy</p>
        <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:32px;line-height:1.05;font-weight:400;">${escapeHtml(title)}</h1>
        <p style="margin:0 0 14px;color:#6d675f;line-height:1.6;">${escapeHtml(input.name)}, ${escapeHtml(intro)}</p>
        <p style="margin:0 0 24px;color:#6d675f;line-height:1.6;">${escapeHtml(note)}</p>
        <a href="${escapeHtml(input.url)}" style="display:inline-block;background:#d97900;color:#fff;text-decoration:none;border-radius:18px;padding:14px 22px;font-weight:700;">${escapeHtml(button)}</a>
        <p style="margin:24px 0 0;color:#9a8f82;font-size:12px;line-height:1.5;">${escapeHtml(isSpanish ? "Si no pediste este enlace, puedes ignorar este correo." : "If you did not request this link, you can ignore this email.")}</p>
      </div>
    </div>
  </body>
</html>`;
}

export async function sendMagicLinkEmail(input: {
  to: string;
  name: string;
  recipientUserId?: string;
  locale: AppLocale;
  url: string;
  expiresMinutes: number;
}) {
  const isSpanish = input.locale === "es";
  const subject = isSpanish ? "Tu enlace para ingresar - Harmonizing Academy" : "Your sign-in link - Harmonizing Academy";
  const logInput = {
    type: EmailDeliveryType.MAGIC_LINK,
    recipientEmail: input.to,
    recipientUserId: input.recipientUserId,
    subject,
  };
  const resend = getResendClient();
  if (!resend) {
    await recordSkippedEmailDelivery(logInput, "RESEND_API_KEY missing");
    return { sent: false, skipped: true, reason: "RESEND_API_KEY missing" } as const;
  }

  const text = [
    isSpanish ? `Hola ${input.name},` : `Hi ${input.name},`,
    "",
    isSpanish
      ? "Usa este enlace seguro para ingresar a Harmonizing Academy:"
      : "Use this secure link to sign in to Harmonizing Academy:",
    input.url,
    "",
    isSpanish
      ? `El enlace vence en ${input.expiresMinutes} minutos y solo puede usarse una vez.`
      : `This link expires in ${input.expiresMinutes} minutes and can only be used once.`,
    "",
    "Harmonizing Academy",
  ].join("\n");

  const logId = await createEmailDeliveryLog(logInput);
  const result = await resend.emails.send({
    from: fromEmail(),
    to: input.to,
    subject,
    text,
    html: magicLinkEmailHtml(input),
  });

  if (result.error) {
    await markEmailDeliveryFailed(logId, { errorMessage: result.error.message });
    throw new Error(result.error.message);
  }
  await markEmailDeliverySent(logId, { providerMessageId: result.data?.id });
  return { sent: true, messageId: result.data?.id } as const;
}
