import "server-only";

import { EmailDeliveryType, Role } from "@prisma/client";

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

type WelcomeEmailInput = {
  to: string;
  name: string;
  recipientUserId?: string;
  role: Role;
  locale: AppLocale;
  magicLinkUrl: string;
  expiresHours: number;
  teacherName?: string;
  planLabel?: string | null;
  instrument?: string | null;
};

function logoHtml() {
  return `
    <div style="display:inline-flex;align-items:center;gap:12px;margin-bottom:22px;">
      <div style="width:54px;height:54px;border:1px solid #eadfce;border-radius:22px;background:#fff;box-shadow:0 12px 30px rgba(212,122,0,.12);text-align:center;line-height:1;">
        <div style="font-family:Georgia,serif;color:#a95f00;font-size:10px;text-transform:uppercase;letter-spacing:.22em;margin-top:10px;">h</div>
        <div style="font-family:Georgia,serif;color:#d47a00;font-size:26px;margin-top:-3px;">2</div>
      </div>
      <div>
        <div style="font-family:Georgia,serif;font-size:30px;letter-spacing:-.04em;color:#211f1c;line-height:1;">harmoni<span style="color:#d47a00;">zing</span></div>
        <div style="font-size:9px;letter-spacing:.34em;text-transform:uppercase;color:#9a8f82;margin-top:6px;">Academia musical</div>
      </div>
    </div>`;
}

function welcomeBullets(input: WelcomeEmailInput) {
  const isSpanish = input.locale === "es";
  if (input.role === Role.TEACHER) {
    return isSpanish
      ? [
          "Revisa tu agenda docente y tus clases próximas.",
          "Completa clases con notas, habilidades, repertorio y tareas.",
          "Da feedback a videos de práctica y acompaña el progreso de tus estudiantes.",
        ]
      : [
          "Review your teacher schedule and upcoming classes.",
          "Complete lessons with notes, skills, repertoire, and practice assignments.",
          "Give feedback on practice videos and track student progress.",
        ];
  }

  return isSpanish
    ? [
        input.teacherName ? `Tu docente asignado/a es ${input.teacherName}.` : "Tu docente asignado/a aparecerá en tu panel.",
        input.planLabel ? `Tu plan registrado es ${input.planLabel}.` : "Tu plan y clases disponibles aparecerán en tu panel.",
        "Desde tu cuenta podrás ver agenda, tareas, progreso, videos y mensajes.",
        "En el primer ingreso te pediremos firmar el consentimiento de privacidad y medios.",
      ]
    : [
        input.teacherName ? `Your assigned teacher is ${input.teacherName}.` : "Your assigned teacher will appear in your dashboard.",
        input.planLabel ? `Your recorded plan is ${input.planLabel}.` : "Your plan and available classes will appear in your dashboard.",
        "From your account you can view schedule, assignments, progress, videos, and messages.",
        "On first sign-in, we will ask you to sign the privacy and media consent.",
      ];
}

function welcomeEmailHtml(input: WelcomeEmailInput) {
  const isSpanish = input.locale === "es";
  const roleLabel = input.role === Role.TEACHER
    ? isSpanish ? "docente" : "teacher"
    : isSpanish ? "estudiante/familia" : "student/family";
  const title = isSpanish ? "Bienvenido/a a Harmonizing" : "Welcome to Harmonizing";
  const intro = isSpanish
    ? `Tu cuenta de ${roleLabel} ya está activa. Usa el enlace seguro para ingresar sin contraseña y luego configura tu contraseña desde Perfil / Configuración.`
    : `Your ${roleLabel} account is active. Use the secure link to sign in without a password, then set your password from Profile / Settings.`;
  const button = isSpanish ? "Ingresar con enlace mágico" : "Sign in with magic link";
  const expiry = isSpanish
    ? `Este enlace vence en ${input.expiresHours} horas y solo puede usarse una vez.`
    : `This link expires in ${input.expiresHours} hours and can only be used once.`;
  const fallback = isSpanish
    ? "Si vence, puedes pedir un nuevo enlace mágico desde la pantalla de inicio de sesión."
    : "If it expires, you can request a new magic link from the sign-in page.";
  const password = isSpanish
    ? "Después de entrar, ve a Configuración para cambiar o definir tu contraseña. No compartimos contraseñas por correo."
    : "After signing in, go to Settings to change or set your password. We do not send passwords by email.";

  const bullets = welcomeBullets(input).map((item) => `<li style="margin:0 0 10px;color:#6d675f;line-height:1.55;">${escapeHtml(item)}</li>`).join("");

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f7f2ea;font-family:Arial,sans-serif;color:#211f1c;">
    <div style="max-width:620px;margin:0 auto;padding:34px 20px;">
      <div style="background:#fff;border:1px solid #eadfce;border-radius:30px;padding:30px;box-shadow:0 18px 45px rgba(72,50,25,.08);">
        ${logoHtml()}
        <p style="margin:0 0 12px;color:#c77400;font-size:11px;letter-spacing:.22em;text-transform:uppercase;font-weight:700;">${escapeHtml(isSpanish ? "Cuenta creada" : "Account created")}</p>
        <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:36px;line-height:1.04;font-weight:400;color:#211f1c;">${escapeHtml(title)}</h1>
        <p style="margin:0 0 16px;color:#6d675f;line-height:1.65;">${escapeHtml(input.name)}, ${escapeHtml(intro)}</p>
        <div style="border:1px solid #eadfce;border-radius:20px;background:#fbf8f3;padding:18px 18px 8px;margin:22px 0;">
          <ul style="padding-left:18px;margin:0;">${bullets}</ul>
        </div>
        <a href="${escapeHtml(input.magicLinkUrl)}" style="display:inline-block;background:#d47a00;color:#fff;text-decoration:none;border-radius:999px;padding:14px 22px;font-weight:700;">${escapeHtml(button)}</a>
        <p style="margin:20px 0 0;color:#6d675f;font-size:14px;line-height:1.6;">${escapeHtml(expiry)}</p>
        <p style="margin:8px 0 0;color:#6d675f;font-size:14px;line-height:1.6;">${escapeHtml(password)}</p>
        <p style="margin:8px 0 0;color:#9a8f82;font-size:12px;line-height:1.5;">${escapeHtml(fallback)}</p>
      </div>
    </div>
  </body>
</html>`;
}

function welcomeEmailText(input: WelcomeEmailInput) {
  const isSpanish = input.locale === "es";
  const lines = [
    isSpanish ? `Hola ${input.name},` : `Hi ${input.name},`,
    "",
    isSpanish
      ? "Bienvenido/a a Harmonizing Academy. Tu cuenta ya está activa."
      : "Welcome to Harmonizing Academy. Your account is now active.",
    "",
    ...welcomeBullets(input).map((item) => `- ${item}`),
    "",
    isSpanish ? "Ingresa con este enlace mágico:" : "Sign in with this magic link:",
    input.magicLinkUrl,
    "",
    isSpanish
      ? `Este enlace vence en ${input.expiresHours} horas y solo puede usarse una vez.`
      : `This link expires in ${input.expiresHours} hours and can only be used once.`,
    isSpanish
      ? "Después de entrar, ve a Configuración para cambiar o definir tu contraseña."
      : "After signing in, go to Settings to change or set your password.",
    "",
    "Harmonizing Academy",
  ];
  return lines.join("\n");
}

export async function sendWelcomeEmail(input: WelcomeEmailInput) {
  const isSpanish = input.locale === "es";
  const subject = isSpanish ? "Bienvenido/a a Harmonizing Academy" : "Welcome to Harmonizing Academy";
  const logInput = {
    type: EmailDeliveryType.WELCOME,
    recipientEmail: input.to,
    recipientUserId: input.recipientUserId,
    subject,
    metadata: {
      role: input.role,
      teacherName: input.teacherName ?? null,
      planLabel: input.planLabel ?? null,
      instrument: input.instrument ?? null,
      expiresHours: input.expiresHours,
    },
  };
  const resend = getResendClient();
  if (!resend) {
    await recordSkippedEmailDelivery(logInput, "RESEND_API_KEY missing");
    return { sent: false, skipped: true, reason: "RESEND_API_KEY missing" } as const;
  }

  const logId = await createEmailDeliveryLog(logInput);
  const result = await resend.emails.send({
    from: fromEmail(),
    to: input.to,
    subject,
    text: welcomeEmailText(input),
    html: welcomeEmailHtml(input),
  });

  if (result.error) {
    await markEmailDeliveryFailed(logId, { errorMessage: result.error.message });
    throw new Error(result.error.message);
  }
  await markEmailDeliverySent(logId, { providerMessageId: result.data?.id });
  return { sent: true, messageId: result.data?.id } as const;
}
