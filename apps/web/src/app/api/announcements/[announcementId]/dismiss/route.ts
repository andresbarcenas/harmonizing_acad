import { NextResponse } from "next/server";
import { AppAnnouncementStatus } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";

type RouteContext = {
  params: Promise<{ announcementId: string }>;
};

export async function POST(_req: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { announcementId } = await context.params;
  const now = new Date();
  const announcement = await db.appAnnouncement.findFirst({
    where: {
      id: announcementId,
      status: AppAnnouncementStatus.PUBLISHED,
      targetRoles: { has: auth.user.role },
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    select: { id: true },
  });

  if (!announcement) {
    return NextResponse.json({ error: "Announcement not found." }, { status: 404 });
  }

  await db.appAnnouncementDismissal.upsert({
    where: { announcementId_userId: { announcementId, userId: auth.user.id } },
    create: { announcementId, userId: auth.user.id },
    update: { dismissedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
