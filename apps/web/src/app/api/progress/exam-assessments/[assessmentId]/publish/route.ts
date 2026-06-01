import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { getExamAssessmentErrorMessage, setStudentExamAssessmentPublication } from "@/lib/exam-assessments";

type Params = { params: Promise<{ assessmentId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN && auth.user.role !== Role.TEACHER) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No autorizado." : "Forbidden." }, { status: 403 });
  }

  try {
    const { assessmentId } = await params;
    const assessment = await setStudentExamAssessmentPublication(assessmentId, auth.user, true);
    return NextResponse.json({ assessment });
  } catch (error) {
    const examError = getExamAssessmentErrorMessage(error, auth.user.locale);
    if (examError) return NextResponse.json({ error: examError.message }, { status: examError.status });
    throw error;
  }
}
