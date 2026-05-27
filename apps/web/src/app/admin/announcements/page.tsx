import { Role } from "@prisma/client";

import { AppAnnouncementManager } from "@/components/admin/app-announcement-manager";
import { AppShell } from "@/components/ui/app-shell";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { db } from "@/lib/db";

export default async function AdminAnnouncementsPage() {
  const viewer = await requireViewer([Role.ADMIN]);
  const isSpanish = viewer.locale === "es";
  const announcements = await db.appAnnouncement.findMany({
    include: {
      createdBy: { select: { name: true, email: true } },
      _count: { select: { dismissals: true } },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 100,
  });

  return (
    <AppShell role={viewer.role} activePath="/admin/announcements" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={isSpanish ? "Comunicación interna" : "Internal communication"}
        title={isSpanish ? "Anuncios de la app." : "App announcements."}
        description={isSpanish
          ? "Publica mensajes compactos para estudiantes, docentes o administración: nuevas funciones, avisos operativos, facturación o mantenimiento."
          : "Publish compact messages for students, teachers, or admins: new features, operational notes, billing, or maintenance."}
      />

      <AppAnnouncementManager
        locale={viewer.locale}
        initialAnnouncements={announcements.map((announcement) => ({
          id: announcement.id,
          type: announcement.type,
          status: announcement.status,
          targetRoles: announcement.targetRoles,
          titleEn: announcement.titleEn,
          bodyEn: announcement.bodyEn,
          titleEs: announcement.titleEs,
          bodyEs: announcement.bodyEs,
          ctaLabelEn: announcement.ctaLabelEn,
          ctaLabelEs: announcement.ctaLabelEs,
          ctaUrl: announcement.ctaUrl,
          startsAt: announcement.startsAt?.toISOString() ?? null,
          endsAt: announcement.endsAt?.toISOString() ?? null,
          createdAt: announcement.createdAt.toISOString(),
          updatedAt: announcement.updatedAt.toISOString(),
          createdByName: announcement.createdBy.name,
          dismissalCount: announcement._count.dismissals,
        }))}
      />
    </AppShell>
  );
}
