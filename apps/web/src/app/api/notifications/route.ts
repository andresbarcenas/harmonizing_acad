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

  return NextResponse.json({ notifications });
}

export async function PATCH(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { notificationId } = (await req.json()) as { notificationId: string };

  if (!notificationId) {
    return NextResponse.json({ error: "notificationId requerido" }, { status: 400 });
  }

  await db.notification.updateMany({
    where: {
      id: notificationId,
      userId: auth.user.id,
    },
    data: {
      readAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
