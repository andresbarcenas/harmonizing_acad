import "server-only";

import { Role } from "@prisma/client";

import type { AppViewer } from "@/features/auth/server";
import { db } from "@/lib/db";

export async function getMessagesThreadForViewer(viewer: AppViewer, options: { studentId?: string | null } = {}) {
  let thread = null;
  let selectedStudentId: string | null = null;

  if (viewer.role === Role.STUDENT && viewer.studentProfileId) {
    const assignment = await db.teacherAssignment.findUnique({ where: { studentId: viewer.studentProfileId } });

    if (assignment) {
      thread = await db.messageThread.findUnique({
        where: {
          studentId_teacherId: {
            studentId: viewer.studentProfileId,
            teacherId: assignment.teacherId,
          },
        },
        include: {
          messages: { include: { sender: true }, orderBy: { createdAt: "asc" } },
        },
      });
    }
  }

  if (viewer.role === Role.TEACHER && viewer.teacherProfileId) {
    if (options.studentId) {
      const assignment = await db.teacherAssignment.findFirst({
        where: { teacherId: viewer.teacherProfileId, studentId: options.studentId },
        select: { studentId: true },
      });
      selectedStudentId = assignment?.studentId ?? null;
    }

    thread = selectedStudentId
      ? await db.messageThread.findUnique({
          where: {
            studentId_teacherId: {
              studentId: selectedStudentId,
              teacherId: viewer.teacherProfileId,
            },
          },
          include: {
            messages: { include: { sender: true }, orderBy: { createdAt: "asc" } },
          },
        })
      : await db.messageThread.findFirst({
          where: { teacherId: viewer.teacherProfileId },
          include: {
            messages: { include: { sender: true }, orderBy: { createdAt: "asc" } },
          },
          orderBy: { createdAt: "desc" },
        });
  }

  if (viewer.role === Role.ADMIN) {
    thread = await db.messageThread.findFirst({
      include: {
        messages: { include: { sender: true }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  return { thread, selectedStudentId };
}
