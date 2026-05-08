import { NextResponse } from "next/server";
import { ProgressReportStatus, Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { assertTeacherCanAccessStudent, calculateProgressReportMetrics } from "@/lib/data/progress";
import { db } from "@/lib/db";
import { generateProgressReportSchema } from "@/lib/validators/progress";

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.TEACHER && auth.user.role !== Role.ADMIN) return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes permisos para generar reportes." : "You do not have permission to generate reports." }, { status: 403 });

  const parsed = generateProgressReportSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  const input = parsed.data;
  const teacherId = auth.user.teacherProfile?.id;
  if (auth.user.role === Role.TEACHER) await assertTeacherCanAccessStudent(teacherId!, input.studentId);

  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  if (endDate < startDate) return NextResponse.json({ error: auth.user.locale === "es" ? "El rango de fechas no es válido." : "The date range is invalid." }, { status: 400 });

  const metrics = await calculateProgressReportMetrics(input.studentId, startDate, endDate);
  const report = await db.progressReport.create({ data: { studentId: input.studentId, teacherId, generatedByUserId: auth.user.id, startDate, endDate, status: ProgressReportStatus.GENERATED, ...metrics, teacherSummary: input.teacherSummary, strengths: input.strengths, improvementAreas: input.improvementAreas, recommendedNextFocus: input.recommendedNextFocus, finalGrade: input.finalGrade, gradePercentage: input.gradePercentage } });
  return NextResponse.json({ report });
}
