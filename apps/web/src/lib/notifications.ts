import net from "node:net";
import { NotificationType } from "@prisma/client";

import { db } from "@/lib/db";
import { localizeNotificationCopy } from "@/lib/notification-copy";

type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string | null;
};

const smtpHost = process.env.SMTP_HOST ?? "mailhog";
const smtpPort = Number(process.env.SMTP_PORT ?? "1025");
const smtpFrom = process.env.SMTP_FROM ?? "no-reply@harmonizing.local";
const smtpMirrorEnabled = process.env.NOTIFICATION_SMTP_MIRROR === "true";

function sanitizeSubject(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

async function sendMailhogPreview(to: string, subject: string, body: string) {
  if (!smtpMirrorEnabled) return;

  await new Promise<void>((resolve) => {
    const socket = net.createConnection({ host: smtpHost, port: smtpPort });
    const safeSubject = sanitizeSubject(subject);
    const lines = body.split(/\r?\n/).map((line) => line.replace(/\r/g, ""));

    const commands = [
      `EHLO harmonizing.local`,
      `MAIL FROM:<${smtpFrom}>`,
      `RCPT TO:<${to}>`,
      "DATA",
      `From: Harmonizing <${smtpFrom}>`,
      `To: <${to}>`,
      `Subject: ${safeSubject}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      ...lines,
      ".",
      "QUIT",
    ];

    let commandIndex = 0;
    let waitingForDataReady = false;

    const closeSafely = () => {
      if (!socket.destroyed) socket.end();
      resolve();
    };

    socket.setTimeout(4500, closeSafely);
    socket.on("error", closeSafely);
    socket.on("end", resolve);

    socket.on("data", (chunk) => {
      const response = chunk.toString("utf-8");
      const code = Number.parseInt(response.slice(0, 3), 10);
      if (!Number.isFinite(code)) return;

      if (code >= 400) {
        closeSafely();
        return;
      }

      if (waitingForDataReady && code === 354) {
        waitingForDataReady = false;
      }

      if (commandIndex >= commands.length) {
        closeSafely();
        return;
      }

      const next = commands[commandIndex];
      commandIndex += 1;
      socket.write(`${next}\r\n`);

      if (next === "DATA") {
        waitingForDataReady = true;
      }
    });
  });
}

export async function createNotification(input: CreateNotificationInput) {
  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: { email: true, locale: true },
  });
  const locale = user?.locale === "es" ? "es" : "en";
  const copy = localizeNotificationCopy(input, locale);

  const notification = await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: copy.title,
      body: copy.body,
      actionUrl: input.actionUrl ?? null,
    },
  });

  if (smtpMirrorEnabled && user?.email) {
    const content = `${copy.body}\n\n${locale === "es" ? "Ruta sugerida" : "Suggested route"}: ${input.actionUrl ?? "/"}`;
    await sendMailhogPreview(user.email, `[Harmonizing] ${copy.title}`, content);
  }

  return notification;
}

export async function createNotifications(inputs: CreateNotificationInput[]) {
  if (!inputs.length) return [];
  const created = [];

  for (const input of inputs) {
    created.push(await createNotification(input));
  }

  return created;
}
