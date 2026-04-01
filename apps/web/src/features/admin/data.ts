import { subDays } from "date-fns";
import { SessionStatus } from "@prisma/client";

import { db } from "@/lib/db";

export async function getAdminDashboard() {
  const [students, teachers, assignments, activeSubscriptions, classesWeek, cancelledCount] = await Promise.all([
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

  return {
    totalStudents: students.length,
    totalTeachers: teachers.length,
    assignments,
    activeSubscriptions: activeSubscriptions.length,
    classesWeek,
    mrr,
    cancelledCount,
    workload,
  };
}
