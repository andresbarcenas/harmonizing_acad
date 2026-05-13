import { NextResponse } from "next/server";
import { ProgressReportStatus, Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { reportId } = await params;
  const report = await db.progressReport.findUnique({ where: { id: reportId } });
  if (!report) return NextResponse.json({ error: auth.user.locale === "es" ? "Reporte no encontrado." : "Report not found." }, { status: 404 });

  const updated = await db.progressReport.update({ where: { id: report.id }, data: { status: ProgressReportStatus.ARCHIVED, archivedAt: new Date() } });
  return NextResponse.json({ report: updated });
}
