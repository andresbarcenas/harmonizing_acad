import { NextResponse } from "next/server";
import { ProgressReportStatus, Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { assertTeacherCanAccessStudent, getProgressErrorResponse } from "@/lib/data/progress";
import { db } from "@/lib/db";
import { updateProgressReportSchema } from "@/lib/validators/progress";

export async function PATCH(req: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { reportId } = await params;
  const report = await db.progressReport.findUnique({ where: { id: reportId } });
  if (!report) return NextResponse.json({ error: auth.user.locale === "es" ? "Reporte no encontrado." : "Report not found." }, { status: 404 });

  if (auth.user.role === Role.TEACHER) {
    if (!auth.user.teacherProfile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (report.status !== ProgressReportStatus.DRAFT) {
      return NextResponse.json({ error: auth.user.locale === "es" ? "Solo puedes editar borradores." : "You can only edit drafts." }, { status: 403 });
    }
    try {
      await assertTeacherCanAccessStudent(auth.user.teacherProfile.id, report.studentId);
    } catch (error) {
      const progressError = getProgressErrorResponse(error, auth.user.locale);
      if (progressError) return NextResponse.json({ error: progressError.message }, { status: progressError.status });
      throw error;
    }
  } else if (auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = updateProgressReportSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });

  const data = auth.user.role === Role.TEACHER
    ? {
        teacherSummary: parsed.data.teacherSummary,
        strengths: parsed.data.strengths,
        improvementAreas: parsed.data.improvementAreas,
        recommendedNextFocus: parsed.data.recommendedNextFocus,
        studentVisibleSummary: parsed.data.studentVisibleSummary,
      }
    : parsed.data;

  const updated = await db.progressReport.update({ where: { id: report.id }, data });
  return NextResponse.json({ report: updated });
}
