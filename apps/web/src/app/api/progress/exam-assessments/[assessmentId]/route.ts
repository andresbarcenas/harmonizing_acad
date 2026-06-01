import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { saveStudentExamAssessment, getExamAssessmentErrorMessage } from "@/lib/exam-assessments";
import { getRepertoireCatalogErrorMessage } from "@/lib/data/repertoire-catalog";
import { validationErrorMessage } from "@/lib/validation-errors";
import { examAssessmentInputSchema } from "@/lib/validators/exam-assessments";

type Params = { params: Promise<{ assessmentId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  if (auth.user.role !== Role.ADMIN && auth.user.role !== Role.TEACHER) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No autorizado." : "Forbidden." }, { status: 403 });
  }

  const parsed = examAssessmentInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: validationErrorMessage(parsed.error, auth.user.locale) }, { status: 400 });

  try {
    const { assessmentId } = await params;
    const assessment = await saveStudentExamAssessment(parsed.data, auth.user, assessmentId);
    return NextResponse.json({ assessment });
  } catch (error) {
    const examError = getExamAssessmentErrorMessage(error, auth.user.locale);
    if (examError) return NextResponse.json({ error: examError.message }, { status: examError.status });
    const catalogError = getRepertoireCatalogErrorMessage(error, auth.user.locale);
    if (catalogError) return NextResponse.json({ error: catalogError.message }, { status: catalogError.status });
    throw error;
  }
}
