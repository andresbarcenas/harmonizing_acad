import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { validationErrorMessage } from "@/lib/validation-errors";
import { appAnnouncementSchema, type AppAnnouncementInput } from "@/lib/validators/announcements";

type RouteContext = {
  params: Promise<{ announcementId: string }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: auth.user.locale === "es" ? "No autorizado." : "Forbidden." }, { status: 403 });

  const { announcementId } = await context.params;
  const parsed = appAnnouncementSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: validationErrorMessage(parsed.error, auth.user.locale, auth.user.locale === "es" ? "Anuncio inválido." : "Invalid announcement.") }, { status: 400 });
  }

  const announcement = await db.appAnnouncement.update({
    where: { id: announcementId },
    data: {
      ...toAnnouncementData(parsed.data),
      updatedByUserId: auth.user.id,
    },
    include: {
      createdBy: { select: { name: true, email: true } },
      updatedBy: { select: { name: true, email: true } },
      _count: { select: { dismissals: true } },
    },
  });

  return NextResponse.json({ announcement });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: auth.user.locale === "es" ? "No autorizado." : "Forbidden." }, { status: 403 });

  const { announcementId } = await context.params;
  await db.appAnnouncement.delete({ where: { id: announcementId } });
  return NextResponse.json({ ok: true });
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
