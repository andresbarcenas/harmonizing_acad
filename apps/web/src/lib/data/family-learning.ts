import "server-only";

import { Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import type { AppViewer } from "@/features/auth/server";
import { db } from "@/lib/db";
import { examAssessmentInclude } from "@/lib/exam-assessments";
import { parentCanAccessStudent } from "@/lib/parents";

const familyRepertoireInclude = {
  user: true,
  assignment: { include: { teacher: { include: { user: true } } } },
  repertoireItems: {
    include: {
      attachments: { orderBy: { createdAt: "desc" } },
      practiceAssignments: { orderBy: { createdAt: "desc" }, take: 1 },
      practiceVideos: {
        include: { feedback: { orderBy: { reviewedAt: "desc" }, take: 1 } },
        orderBy: { submittedAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  },
} satisfies Prisma.StudentProfileInclude;

export type FamilyRepertoireData = Prisma.StudentProfileGetPayload<{ include: typeof familyRepertoireInclude }>;

export async function getFamilyRepertoireData(studentId: string): Promise<FamilyRepertoireData | null> {
  return db.studentProfile.findUnique({
    where: { id: studentId },
    include: familyRepertoireInclude,
  });
}

export async function getPublishedExamAssessmentsForStudent(studentId: string) {
  return db.studentExamAssessment.findMany({
    where: { studentId, instrument: "Piano", publishedAt: { not: null } },
    include: examAssessmentInclude,
    orderBy: { examDate: "desc" },
  });
}

export async function getExamAssessmentForViewer(viewer: AppViewer, assessmentId: string) {
  const assessment = await db.studentExamAssessment.findUnique({ where: { id: assessmentId }, include: examAssessmentInclude });
  if (!assessment) return null;

  if (viewer.role === Role.ADMIN) return assessment;
  if (viewer.role === Role.TEACHER && viewer.teacherProfileId === assessment.teacherId) return assessment;
  if (!assessment.publishedAt) return null;
  if (viewer.role === Role.STUDENT && viewer.studentProfileId === assessment.studentId) return assessment;
  if (viewer.role === Role.PARENT && await parentCanAccessStudent(viewer.parentGuardianProfileId, assessment.studentId)) return assessment;

  return null;
}

export function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}
