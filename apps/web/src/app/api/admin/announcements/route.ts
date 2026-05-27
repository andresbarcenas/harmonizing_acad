import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { appAnnouncementSchema, type AppAnnouncementInput } from "@/lib/validators/announcements";

export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const announcements = await db.appAnnouncement.findMany({
    include: {
      createdBy: { select: { name: true, email: true } },
      updatedBy: { select: { name: true, email: true } },
      _count: { select: { dismissals: true } },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 100,
  });

  return NextResponse.json({ announcements });
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = appAnnouncementSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid announcement." }, { status: 400 });
  }

  const announcement = await db.appAnnouncement.create({
    data: {
      ...toAnnouncementData(parsed.data),
      createdByUserId: auth.user.id,
      updatedByUserId: auth.user.id,
    },
    include: {
      createdBy: { select: { name: true, email: true } },
      updatedBy: { select: { name: true, email: true } },
      _count: { select: { dismissals: true } },
    },
  });

  return NextResponse.json({ announcement }, { status: 201 });
}

function toAnnouncementData(input: AppAnnouncementInput) {
  return {
    type: input.type,
    status: input.status,
    targetRoles: input.targetRoles,
    titleEn: input.titleEn,
    bodyEn: input.bodyEn,
    titleEs: input.titleEs,
    bodyEs: input.bodyEs,
    ctaLabelEn: input.ctaLabelEn ?? null,
    ctaLabelEs: input.ctaLabelEs ?? null,
    ctaUrl: input.ctaUrl ?? null,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
  };
}
