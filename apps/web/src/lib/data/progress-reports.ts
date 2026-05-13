import "server-only";

import { ProgressReportStatus, Role } from "@prisma/client";

import type { AppViewer } from "@/features/auth/server";
import { db } from "@/lib/db";
import { reportRangeFromMonth } from "@/lib/progress-reports/generator";

export async function getTeacherReportGenerationData(viewer: AppViewer, studentId?: string | null) {
  if (viewer.role !== Role.TEACHER || !viewer.teacherProfileId) throw new Error("Unauthorized: teacher role required");
  if (!studentId) return { student: null, reports: [], month: currentMonthKey(viewer.timezone) };

  const student = await db.studentProfile.findFirst({
    where: { id: studentId, assignment: { teacherId: viewer.teacherProfileId } },
    include: { user: true, assignment: { include: { teacher: { include: { user: true } } } } },
  });

  if (!student) return { student: null, reports: [], month: currentMonthKey(viewer.timezone) };

  const reports = await db.progressReport.findMany({
    where: { studentId: student.id, teacherId: viewer.teacherProfileId },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return { student, reports, month: currentMonthKey(viewer.timezone) };
}

export async function getProgressReportForViewer(viewer: AppViewer, reportId: string) {
  const include = {
    student: { include: { user: true, assignment: { include: { teacher: { include: { user: true } } } } } },
    teacher: { include: { user: true } },
    generatedBy: true,
    publishedBy: true,
  } as const;

  if (viewer.role === Role.ADMIN) {
    return db.progressReport.findUnique({ where: { id: reportId }, include });
  }

  if (viewer.role === Role.TEACHER && viewer.teacherProfileId) {
    return db.progressReport.findFirst({
      where: { id: reportId, student: { assignment: { teacherId: viewer.teacherProfileId } } },
      include,
    });
  }

  if (viewer.role === Role.STUDENT && viewer.studentProfileId) {
    return db.progressReport.findFirst({
      where: { id: reportId, studentId: viewer.studentProfileId, status: ProgressReportStatus.PUBLISHED },
      include,
    });
  }

  return null;
}

export async function getAdminProgressReportsData(viewer: AppViewer, filters: { month?: string; teacherId?: string; status?: string } = {}) {
  if (viewer.role !== Role.ADMIN) throw new Error("Unauthorized: admin role required");

  const month = validMonth(filters.month) ? filters.month! : currentMonthKey(viewer.timezone);
  const range = reportRangeFromMonth(month, viewer.timezone);
  const status = validStatus(filters.status) || filters.status === "missing" ? filters.status : null;
  const teacherId = filters.teacherId && filters.teacherId !== "all" ? filters.teacherId : null;

  const [students, teachers, reports] = await Promise.all([
    db.studentProfile.findMany({
      where: teacherId ? { assignment: { teacherId } } : {},
      include: { user: true, assignment: { include: { teacher: { include: { user: true } } } } },
      orderBy: { user: { name: "asc" } },
    }),
    db.teacherProfile.findMany({ include: { user: true }, orderBy: { user: { name: "asc" } } }),
    db.progressReport.findMany({
      where: {
        startDate: { gte: range.startDate },
        endDate: { lte: range.endDate },
        ...(teacherId ? { teacherId } : {}),
        ...(status && status !== "missing" ? { status } : {}),
      },
      include: { student: { include: { user: true } }, teacher: { include: { user: true } } },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const reportByStudent = new Map(reports.map((report) => [report.studentId, report]));
  const rows = students
    .map((student) => ({ student, teacher: student.assignment?.teacher ?? null, report: reportByStudent.get(student.id) ?? null }))
    .filter((row) => {
      if (!status) return true;
      if (status === "missing") return !row.report;
      return row.report?.status === status;
    });

  return { month, range, teacherId, status, students, teachers, reports, rows };
}

export function currentMonthKey(timezone = "America/New_York") {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit" }).format(new Date());
}

function validMonth(value?: string) {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

function validStatus(value?: string): value is ProgressReportStatus {
  const allowed: ProgressReportStatus[] = [ProgressReportStatus.DRAFT, ProgressReportStatus.PUBLISHED, ProgressReportStatus.ARCHIVED];
  return typeof value === "string" && allowed.includes(value as ProgressReportStatus);
}
