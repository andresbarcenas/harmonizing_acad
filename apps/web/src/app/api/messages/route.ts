import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { createMessageSchema } from "@/lib/validators/messages";

export async function GET(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get("threadId");

  let thread = null;

  if (threadId) {
    thread = await db.messageThread.findUnique({
      where: { id: threadId },
      include: {
        messages: {
          include: { sender: true },
          orderBy: { createdAt: "asc" },
        },
        student: { include: { user: true } },
        teacher: { include: { user: true } },
      },
    });
  } else if (auth.user.role === Role.STUDENT && auth.user.studentProfile) {
    const assignment = await db.teacherAssignment.findUnique({ where: { studentId: auth.user.studentProfile.id } });
    if (assignment) {
      thread = await db.messageThread.findUnique({
        where: {
          studentId_teacherId: {
            studentId: auth.user.studentProfile.id,
            teacherId: assignment.teacherId,
          },
        },
        include: {
          messages: {
            include: { sender: true },
            orderBy: { createdAt: "asc" },
          },
          student: { include: { user: true } },
          teacher: { include: { user: true } },
        },
      });
    }
  }

  if (!thread) {
    return NextResponse.json({ thread: null, messages: [] });
  }

  return NextResponse.json({ thread, messages: thread.messages });
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const parsed = createMessageSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { threadId, content } = parsed.data;

  const thread = await db.messageThread.findUnique({
    where: { id: threadId },
    include: {
      student: { include: { user: true } },
      teacher: { include: { user: true } },
    },
  });

  if (!thread) {
    return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  }

  const canSend =
    auth.user.id === thread.student.userId ||
    auth.user.id === thread.teacher.userId ||
    auth.user.role === Role.ADMIN;

  if (!canSend) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const message = await db.message.create({
    data: {
      threadId,
      senderId: auth.user.id,
      content,
    },
    include: {
      sender: true,
    },
  });

  const recipientUserId = auth.user.id === thread.student.userId ? thread.teacher.userId : thread.student.userId;

  await db.notification.create({
    data: {
      userId: recipientUserId,
      type: "MESSAGE",
      title: "Nuevo mensaje",
      body: content.slice(0, 90),
      actionUrl: "/messages",
    },
  });

  return NextResponse.json({ message });
}
