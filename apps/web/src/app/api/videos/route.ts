import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { NotificationType, Role, VideoStatus } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { mediaBucket, minioClient } from "@/lib/minio";
import { createNotification } from "@/lib/notifications";
import { reviewVideoSchema } from "@/lib/validators/videos";

export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role === Role.STUDENT && auth.user.studentProfile) {
    const videos = await db.practiceVideo.findMany({
      where: { studentId: auth.user.studentProfile.id },
      include: { feedback: true },
      orderBy: { submittedAt: "desc" },
    });
    return NextResponse.json({ videos });
  }

  if (auth.user.role === Role.TEACHER && auth.user.teacherProfile) {
    const videos = await db.practiceVideo.findMany({
      where: { teacherId: auth.user.teacherProfile.id },
      include: {
        student: { include: { user: true } },
        feedback: true,
      },
      orderBy: { submittedAt: "desc" },
    });
    return NextResponse.json({ videos });
  }

  return NextResponse.json({ videos: [] });
}

export async function POST(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.STUDENT || !auth.user.studentProfile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }

  const assignment = await db.teacherAssignment.findUnique({
    where: { studentId: auth.user.studentProfile.id },
    include: { teacher: true },
  });

  if (!assignment) {
    return NextResponse.json({ error: "No tienes profesora asignada" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `${auth.user.studentProfile.id}/${Date.now()}-${file.name}`;

  await minioClient.send(
    new PutObjectCommand({
      Bucket: mediaBucket,
      Key: key,
      Body: buffer,
      ContentType: file.type || "video/mp4",
    }),
  );

  const video = await db.practiceVideo.create({
    data: {
      studentId: auth.user.studentProfile.id,
      teacherId: assignment.teacherId,
      storageKey: key,
      originalName: file.name,
      durationSec: Number(formData.get("durationSec") ?? 120),
      status: VideoStatus.PENDING,
    },
  });

  await createNotification({
    userId: assignment.teacher.userId,
    type: NotificationType.VIDEO_REVIEW,
    title: "Nuevo video semanal",
    body: `${auth.user.name} subió una nueva práctica.`,
    actionUrl: "/teacher/videos",
  });

  return NextResponse.json({ video });
}

export async function PATCH(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.TEACHER || !auth.user.teacherProfile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const teacherProfileId = auth.user.teacherProfile.id;

  const parsed = reviewVideoSchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { videoId, comment } = parsed.data;

  const video = await db.practiceVideo.findFirst({
    where: {
      id: videoId,
      teacherId: teacherProfileId,
    },
  });

  if (!video) {
    return NextResponse.json({ error: "Video no encontrado" }, { status: 404 });
  }

  await db.$transaction(async (tx) => {
    await tx.practiceVideo.update({
      where: { id: video.id },
      data: {
        status: VideoStatus.FEEDBACK_GIVEN,
        reviewedAt: new Date(),
      },
    });

    await tx.videoFeedback.create({
      data: {
        videoId: video.id,
        teacherId: teacherProfileId,
        comment,
      },
    });
  });

  const student = await db.studentProfile.findUnique({
    where: { id: video.studentId },
    select: { userId: true },
  });

  if (student) {
    await createNotification({
      userId: student.userId,
      type: NotificationType.VIDEO_REVIEW,
      title: "Tu video fue revisado",
      body: "Ya tienes feedback de tu profesora.",
      actionUrl: "/videos",
    });
  }

  return NextResponse.json({ ok: true });
}
