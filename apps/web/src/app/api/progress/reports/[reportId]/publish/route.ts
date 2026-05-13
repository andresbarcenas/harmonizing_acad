import { NextResponse } from "next/server";
import { NotificationType, ProgressReportStatus, Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { publishProgressReportSchema } from "@/lib/validators/progress";

export async function POST(req: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { reportId } = await params;
  const report = await db.progressReport.findUnique({ where: { id: reportId }, include: { student: { include: { user: true } } } });
  if (!report) return NextResponse.json({ error: auth.user.locale === "es" ? "Reporte no encontrado." : "Report not found." }, { status: 404 });
  if (report.status === ProgressReportStatus.ARCHIVED) return NextResponse.json({ error: auth.user.locale === "es" ? "No puedes publicar un reporte archivado." : "You cannot publish an archived report." }, { status: 400 });

  const parsed = publishProgressReportSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });

  const updated = await db.$transaction(async (tx) => {
    const shouldNotify = report.status !== ProgressReportStatus.PUBLISHED;
    const published = await tx.progressReport.update({
      where: { id: report.id },
      data: {
        status: ProgressReportStatus.PUBLISHED,
        publishedAt: new Date(),
        publishedByUserId: auth.user.id,
        adminNote: parsed.data.adminNote ?? report.adminNote,
        studentVisibleSummary: parsed.data.studentVisibleSummary ?? report.studentVisibleSummary ?? report.teacherSummary,
      },
    });

    if (shouldNotify) {
      await tx.notification.create({
        data: {
          userId: report.student.userId,
          type: NotificationType.SYSTEM,
          title: auth.user.locale === "es" ? "Tu reporte de progreso está listo" : "Your progress report is ready",
          body: auth.user.locale === "es" ? "Ya puedes revisar el resumen mensual, calificación y próximos enfoques." : "You can now review the monthly summary, grade, and next focus areas.",
          actionUrl: `/progress/reports/${report.id}`,
        },
      });
    }

    return published;
  });

  return NextResponse.json({ report: updated });
}
