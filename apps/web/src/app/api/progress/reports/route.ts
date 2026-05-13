import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { assertStudentExists, assertTeacherCanAccessStudent, getProgressErrorResponse } from "@/lib/data/progress";
import { generateProgressReportSchema } from "@/lib/validators/progress";
import { generateProgressReport, ProgressReportConflictError, reportRangeFromMonth } from "@/lib/progress-reports/generator";

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.TEACHER && auth.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes permisos para generar reportes." : "You do not have permission to generate reports." }, { status: 403 });
  }

  const parsed = generateProgressReportSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  const input = parsed.data;
  const teacherId = auth.user.role === Role.TEACHER ? auth.user.teacherProfile?.id : input.teacherId;

  try {
    if (auth.user.role === Role.TEACHER) {
      if (!teacherId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      await assertTeacherCanAccessStudent(teacherId, input.studentId);
    } else {
      await assertStudentExists(input.studentId);
    }
  } catch (error) {
    const progressError = getProgressErrorResponse(error, auth.user.locale);
    if (progressError) return NextResponse.json({ error: progressError.message }, { status: progressError.status });
    throw error;
  }

  const timezone = input.timezone ?? auth.user.timezone;
  const monthRange = input.month ? reportRangeFromMonth(input.month, timezone) : null;
  const startDate = input.startDate ? new Date(input.startDate) : monthRange?.startDate;
  const endDate = input.endDate ? new Date(input.endDate) : monthRange?.endDate;
  if (startDate && endDate && endDate < startDate) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "El rango de fechas no es válido." : "The date range is invalid." }, { status: 400 });
  }

  try {
    const report = await generateProgressReport({
      studentId: input.studentId,
      teacherId,
      generatedByUserId: auth.user.id,
      startDate,
      endDate,
      timezone,
      regenerate: input.regenerate,
      teacherSummary: input.teacherSummary,
      strengths: input.strengths,
      improvementAreas: input.improvementAreas,
      recommendedNextFocus: input.recommendedNextFocus,
      studentVisibleSummary: input.studentVisibleSummary,
      adminNote: input.adminNote,
    });
    return NextResponse.json({ report });
  } catch (error) {
    if (error instanceof ProgressReportConflictError) {
      return NextResponse.json({ error: auth.user.locale === "es" ? "Ya existe un reporte para este estudiante y rango." : "A report already exists for this student and range.", existingReportId: error.reportId }, { status: 409 });
    }
    throw error;
  }
}
