import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { examAssessmentInclude } from "@/lib/exam-assessments";
import { generateExamAssessmentPdf } from "@/lib/exam-assessments/pdf";
import { parentCanAccessStudent } from "@/lib/parents";

type Params = { params: Promise<{ assessmentId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { assessmentId } = await params;
  const assessment = await db.studentExamAssessment.findUnique({ where: { id: assessmentId }, include: examAssessmentInclude });
  if (!assessment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = auth.user.role === Role.ADMIN;
  const isTeacher = auth.user.role === Role.TEACHER && auth.user.teacherProfile?.id === assessment.teacherId;
  const isStudent = auth.user.role === Role.STUDENT && auth.user.studentProfile?.id === assessment.studentId && Boolean(assessment.publishedAt);
  const isParent = auth.user.role === Role.PARENT && Boolean(assessment.publishedAt) && await parentCanAccessStudent(auth.user.parentGuardianProfile?.id, assessment.studentId);

  if (!isAdmin && !isTeacher && !isStudent && !isParent) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No autorizado." : "Forbidden." }, { status: 403 });
  }

  const pdfBytes = await generateExamAssessmentPdf(assessment);
  const filename = `harmonizing-examen-${assessment.student.user.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${assessment.examDate.toISOString().slice(0, 10)}.pdf`;
  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
