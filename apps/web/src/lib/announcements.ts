import { AppAnnouncementStatus, AppAnnouncementType, Role, type AppAnnouncement } from "@prisma/client";

import { db } from "@/lib/db";
import type { AppLocale } from "@/lib/i18n/locales";

export type ShellAnnouncement = {
  id: string;
  type: AppAnnouncementType;
  typeLabel: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
};

export async function getActiveAnnouncementForViewer({
  userId,
  role,
  locale,
}: {
  userId: string;
  role: Role;
  locale: AppLocale;
}): Promise<ShellAnnouncement | null> {
  const now = new Date();
  const announcement = await db.appAnnouncement.findFirst({
    where: {
      status: AppAnnouncementStatus.PUBLISHED,
      targetRoles: { has: role },
      dismissals: { none: { userId } },
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return announcement ? toShellAnnouncement(announcement, locale) : null;
}

export function toShellAnnouncement(announcement: AppAnnouncement, locale: AppLocale): ShellAnnouncement {
  const isSpanish = locale === "es";
  return {
    id: announcement.id,
    type: announcement.type,
    typeLabel: getAnnouncementTypeLabel(announcement.type, locale),
    title: isSpanish ? announcement.titleEs || announcement.titleEn : announcement.titleEn || announcement.titleEs,
    body: isSpanish ? announcement.bodyEs || announcement.bodyEn : announcement.bodyEn || announcement.bodyEs,
    ctaLabel: isSpanish ? announcement.ctaLabelEs || announcement.ctaLabelEn : announcement.ctaLabelEn || announcement.ctaLabelEs,
    ctaUrl: announcement.ctaUrl,
  };
}

export function getAnnouncementTypeLabel(type: AppAnnouncementType, locale: AppLocale) {
  const labels = {
    en: {
      GENERAL: "Announcement",
      FEATURE: "New feature",
      BILLING: "Billing",
      MAINTENANCE: "Maintenance",
    },
    es: {
      GENERAL: "Anuncio",
      FEATURE: "Nueva función",
      BILLING: "Facturación",
      MAINTENANCE: "Mantenimiento",
    },
  } as const;
  return labels[locale][type];
}

export function getAnnouncementStatusLabel(status: AppAnnouncementStatus, locale: AppLocale) {
  const labels = {
    en: { DRAFT: "Draft", PUBLISHED: "Published", ARCHIVED: "Archived" },
    es: { DRAFT: "Borrador", PUBLISHED: "Publicado", ARCHIVED: "Archivado" },
  } as const;
  return labels[locale][status];
}

export function isAnnouncementVisibleToRole(announcement: Pick<AppAnnouncement, "targetRoles">, role: Role) {
  return announcement.targetRoles.includes(role);
}
