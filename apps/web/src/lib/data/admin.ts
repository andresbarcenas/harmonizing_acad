import "server-only";

import { SessionStatus } from "@prisma/client";
import { endOfWeek, format, startOfWeek, subDays, subWeeks } from "date-fns";

import type { AppViewer } from "@/features/auth/server";
import { db } from "@/lib/db";

export async function getAdminDashboardData(viewer: AppViewer) {
  if (viewer.role !== "ADMIN") {
    throw new Error("Unauthorized: admin role required");
  }

  const [students, teachers, assignments, activeSubscriptions, classesWeek, cancelledCount, classSessions] = await Promise.all([
    db.studentProfile.findMany({ include: { user: true } }),
    db.teacherProfile.findMany({ include: { user: true, availability: true } }),
    db.teacherAssignment.findMany({ include: { student: { include: { user: true } }, teacher: { include: { user: true } } } }),
    db.activeSubscription.findMany({ where: { active: true }, include: { plan: true } }),
    db.classSession.count({
      where: {
        startsAtUtc: { gte: subDays(new Date(), 7) },
        status: SessionStatus.COMPLETED,
      },
    }),
    db.classSession.count({
      where: {
        startsAtUtc: { gte: subDays(new Date(), 30) },
        status: SessionStatus.CANCELLED,
      },
    }),
    db.classSession.findMany({
      where: {
        startsAtUtc: { gte: subWeeks(new Date(), 8) },
      },
      select: {
        startsAtUtc: true,
        status: true,
        studentId: true,
      },
    }),
  ]);

  const mrr = activeSubscriptions.reduce((acc, sub) => acc + sub.plan.priceUsd, 0);

  const workload = teachers.map((teacher) => {
    const assigned = assignments.filter((assign) => assign.teacherId === teacher.id).length;
    const occupancy = Math.min(Math.round((assigned / 12) * 100), 100);
    return {
      teacherId: teacher.id,
      teacherName: teacher.user.name,
      assignedStudents: assigned,
      occupancy,
    };
  });

  const weeklyClassesTrend = Array.from({ length: 6 }).map((_, index) => {
    const weekDate = subWeeks(new Date(), 5 - index);
    const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });
    const count = classSessions.filter(
      (session) =>
        session.status === SessionStatus.COMPLETED &&
        session.startsAtUtc >= weekStart &&
        session.startsAtUtc <= weekEnd,
    ).length;

    return {
      key: format(weekStart, "MMM d"),
      count,
    };
  });

  const churnTrend = Array.from({ length: 6 }).map((_, index) => {
    const weekDate = subWeeks(new Date(), 5 - index);
    const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });
    const count = classSessions.filter(
      (session) =>
        session.status === SessionStatus.CANCELLED &&
        session.startsAtUtc >= weekStart &&
        session.startsAtUtc <= weekEnd,
    ).length;

    return {
      key: format(weekStart, "MMM d"),
      count,
    };
  });

  const activeStudentIds = new Set(activeSubscriptions.filter((subscription) => subscription.active).map((subscription) => subscription.studentId));
  const activeStudents = assignments
    .filter((assignment) => activeStudentIds.has(assignment.studentId))
    .map((assignment) => ({
      studentId: assignment.studentId,
      studentName: assignment.student.user.name,
      teacherName: assignment.teacher.user.name,
      assignedAt: assignment.assignedAt,
    }))
    .sort((first, second) => second.assignedAt.getTime() - first.assignedAt.getTime());

  return {
    totalStudents: students.length,
    totalTeachers: teachers.length,
    assignments,
    activeSubscriptions: activeSubscriptions.length,
    classesWeek,
    mrr,
    cancelledCount,
    workload,
    weeklyClassesTrend,
    churnTrend,
    activeStudents,
  };
}
