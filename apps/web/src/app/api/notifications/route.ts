import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const notifications = await db.notification.findMany({
    where: { userId: auth.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const unreadCount = await db.notification.count({
    where: {
      userId: auth.user.id,
      readAt: null,
    },
  });

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { notificationId, markAll } = (await req.json()) as { notificationId?: string; markAll?: boolean };

  if (!markAll && !notificationId) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "notificationId requerido" : "notificationId is required." }, { status: 400 });
  }

  if (markAll) {
    await db.notification.updateMany({
      where: {
        userId: auth.user.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  } else {
    await db.notification.updateMany({
      where: {
        id: notificationId,
        userId: auth.user.id,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
