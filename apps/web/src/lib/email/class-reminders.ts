import "server-only";

import { ClassReminderStatus, NotificationType, SessionStatus } from "@prisma/client";
import { addMinutes } from "date-fns";

import { db } from "@/lib/db";
import { formatDateTimeInZone } from "@/lib/i18n";
import type { AppLocale } from "@/lib/i18n/locales";
import { createNotification } from "@/lib/notifications";
import { getResendClient } from "@/lib/resend";

type ReminderRecipient = {
  userId: string;
  email: string | null;
  name: string;
  locale: AppLocale;
  timezone: string;
  role: "student" | "teacher";
};

const DEFAULT_OFFSETS = [1440, 60];
const DEFAULT_WINDOW_MINUTES = 20;

function parseOffsets() {
  const raw = process.env.CLASS_REMINDER_OFFSETS_MINUTES;
  if (!raw) return DEFAULT_OFFSETS;
  const parsed = raw.split(",").map((value) => Number(value.trim())).filter((value) => Number.isFinite(value) && value > 0);
  return parsed.length ? Array.from(new Set(parsed)).sort((a, b) => b - a) : DEFAULT_OFFSETS;
}

function remindersEnabled() {
  return process.env.CLASS_EMAIL_REMINDERS_ENABLED === "true";
}

function fromEmail() {
  return process.env.RESEND_FROM_EMAIL?.trim() || "Harmonizing Academy <no-reply@harmonizing.app>";
}

function baseUrl() {
  return process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "http://localhost:3010";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function subjectFor(locale: AppLocale, offsetMinutes: number) {
  if (locale === "es") {
    return offsetMinutes >= 120 ? "Recordatorio: tienes clase mañana" : "Recordatorio: tu clase empieza pronto";
  }
  return offsetMinutes >= 120 ? "Reminder: your class is tomorrow" : "Reminder: your class starts soon";
}

function textFor(input: { recipient: ReminderRecipient; studentName: string; teacherName: string; startsAtUtc: Date; classUrl: string; offsetMinutes: number }) {
  const when = formatDateTimeInZone(input.startsAtUtc, input.recipient.timezone, input.recipient.locale);
  if (input.recipient.locale === "es") {
    const who = input.recipient.role === "teacher" ? `con ${input.studentName}` : `con ${input.teacherName}`;
    return `Hola ${input.recipient.name},\n\nTe recordamos que tu clase ${who} está programada para ${when}.\n\nAbrir clase: ${input.classUrl}\n\nHarmonizing Academy`;
  }
  const who = input.recipient.role === "teacher" ? `with ${input.studentName}` : `with ${input.teacherName}`;
  return `Hi ${input.recipient.name},\n\nThis is a reminder that your class ${who} is scheduled for ${when}.\n\nOpen class: ${input.classUrl}\n\nHarmonizing Academy`;
}

function htmlFor(input: { recipient: ReminderRecipient; studentName: string; teacherName: string; startsAtUtc: Date; classUrl: string; offsetMinutes: number }) {
  const when = formatDateTimeInZone(input.startsAtUtc, input.recipient.timezone, input.recipient.locale);
  const isSpanish = input.recipient.locale === "es";
  const who = input.recipient.role === "teacher" ? input.studentName : input.teacherName;
  const eyebrow = isSpanish ? "Recordatorio de clase" : "Class reminder";
  const title = isSpanish ? "Tu clase está por comenzar" : "Your class is coming up";
  const intro = isSpanish
    ? `Tienes una clase ${input.recipient.role === "teacher" ? "con" : "con tu docente"} ${who}.`
    : `You have a class ${input.recipient.role === "teacher" ? "with" : "with your teacher"} ${who}.`;
  const button = isSpanish ? "Abrir clase" : "Open class";

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f7f2ea;font-family:Arial,sans-serif;color:#211f1c;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <div style="background:#fff;border:1px solid #eadfce;border-radius:28px;padding:28px;box-shadow:0 18px 45px rgba(72,50,25,.08);">
        <p style="margin:0 0 12px;color:#c77400;font-size:11px;letter-spacing:.22em;text-transform:uppercase;font-weight:700;">${eyebrow}</p>
        <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:34px;line-height:1.05;font-weight:400;">${title}</h1>
        <p style="margin:0 0 18px;color:#6d675f;line-height:1.6;">${escapeHtml(intro)}</p>
        <div style="border:1px solid #eadfce;border-radius:18px;padding:16px;background:#fbf8f3;margin-bottom:22px;">
          <p style="margin:0;color:#211f1c;font-weight:700;">${escapeHtml(when)}</p>
          <p style="margin:6px 0 0;color:#6d675f;font-size:14px;">${isSpanish ? "Zona horaria" : "Timezone"}: ${escapeHtml(input.recipient.timezone)}</p>
        </div>
        <a href="${escapeHtml(input.classUrl)}" style="display:inline-block;background:#d47a00;color:#fff;text-decoration:none;border-radius:999px;padding:13px 20px;font-weight:700;">${button}</a>
      </div>
    </div>
  </body>
</html>`;
}

export async function sendDueClassReminders(now = new Date()) {
  if (!remindersEnabled()) {
    return { ok: true, enabled: false, scanned: 0, sent: 0, skipped: 0, failed: 0 };
  }

  const offsets = parseOffsets();
  const windowMinutes = Number(process.env.CLASS_REMINDER_WINDOW_MINUTES ?? DEFAULT_WINDOW_MINUTES);
  let scanned = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const offsetMinutes of offsets) {
    const startsAfter = addMinutes(now, offsetMinutes - windowMinutes);
    const startsBefore = addMinutes(now, offsetMinutes + windowMinutes);
    const sessions = await db.classSession.findMany({
      where: {
        status: SessionStatus.SCHEDULED,
        startsAtUtc: { gte: startsAfter, lte: startsBefore },
      },
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
      },
      orderBy: { startsAtUtc: "asc" },
    });

    scanned += sessions.length;

    for (const session of sessions) {
      const classUrl = `${baseUrl()}/classes/${session.id}`;
      const recipients: ReminderRecipient[] = [
        {
          userId: session.student.userId,
          email: session.student.user.email,
          name: session.student.user.name,
          locale: session.student.user.locale === "es" ? "es" : "en",
          timezone: session.student.user.timezone,
          role: "student",
        },
        {
          userId: session.teacher.userId,
          email: session.teacher.user.email,
          name: session.teacher.user.name,
          locale: session.teacher.user.locale === "es" ? "es" : "en",
          timezone: session.teacher.user.timezone,
          role: "teacher",
        },
      ];

      for (const recipient of recipients) {
        const delivery = await db.classReminderDelivery.create({
          data: {
            classSessionId: session.id,
            recipientUserId: recipient.userId,
            offsetMinutes,
            scheduledForUtc: session.startsAtUtc,
            status: ClassReminderStatus.SKIPPED,
          },
        }).catch(() => null);

        if (!delivery) {
          skipped += 1;
          continue;
        }

        const resend = getResendClient();
        if (!recipient.email || !resend) {
          await db.classReminderDelivery.update({
            where: { id: delivery.id },
            data: {
              status: ClassReminderStatus.FAILED,
              errorMessage: !recipient.email ? "Recipient email missing" : "RESEND_API_KEY missing",
            },
          });
          failed += 1;
          continue;
        }

        try {
          const subject = subjectFor(recipient.locale, offsetMinutes);
          const text = textFor({ recipient, studentName: session.student.user.name, teacherName: session.teacher.user.name, startsAtUtc: session.startsAtUtc, classUrl, offsetMinutes });
          const html = htmlFor({ recipient, studentName: session.student.user.name, teacherName: session.teacher.user.name, startsAtUtc: session.startsAtUtc, classUrl, offsetMinutes });
          const result = await resend.emails.send({
            from: fromEmail(),
            to: recipient.email,
            subject,
            text,
            html,
          });

          if (result.error) throw new Error(result.error.message);

          await db.classReminderDelivery.update({
            where: { id: delivery.id },
            data: {
              status: ClassReminderStatus.SENT,
              resendMessageId: result.data?.id,
              sentAt: new Date(),
            },
          });

          await createNotification({
            userId: recipient.userId,
            type: NotificationType.CLASS_REMINDER,
            title: subject,
            body: recipient.locale === "es"
              ? `Tu clase está programada para ${formatDateTimeInZone(session.startsAtUtc, recipient.timezone, recipient.locale)}.`
              : `Your class is scheduled for ${formatDateTimeInZone(session.startsAtUtc, recipient.timezone, recipient.locale)}.`,
            actionUrl: `/classes/${session.id}`,
          });
          sent += 1;
        } catch (error) {
          await db.classReminderDelivery.update({
            where: { id: delivery.id },
            data: {
              status: ClassReminderStatus.FAILED,
              errorMessage: error instanceof Error ? error.message : "Unknown Resend error",
            },
          });
          failed += 1;
        }
      }
    }
  }

  return { ok: true, enabled: true, scanned, sent, skipped, failed };
}
