import { NextResponse } from "next/server";
import { NotificationType, Role, VideoStatus } from "@prisma/client";

import { requireApiUser } from "@/lib/api-auth";
import {
  assertActiveSkillCategories,
  assertPracticeAssignmentForStudent,
  assertPracticeVideoForTeacher,
  assertRepertoireForStudent,
  getProgressErrorResponse,
} from "@/lib/data/progress";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { ParentAccessError, resolveStudentIdForStudentOrParent } from "@/lib/parents";
import { ALLOWED_VIDEO_MIME_TYPES, MAX_VIDEO_SIZE_BYTES, isAllowedVideoType, storePracticeVideo } from "@/lib/storage";
import { validationErrorMessage } from "@/lib/validation-errors";
import { reviewVideoSchema } from "@/lib/validators/videos";

export async function GET(req: Request) {
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

  if (auth.user.role === Role.PARENT && auth.user.parentGuardianProfile) {
    const studentId = new URL(req.url).searchParams.get("studentId");
    let resolvedStudentId: string;
    try {
      resolvedStudentId = await resolveStudentIdForStudentOrParent(auth.user, studentId);
    } catch {
      return NextResponse.json({ videos: [] });
    }
    const videos = await db.practiceVideo.findMany({
      where: { studentId: resolvedStudentId },
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

  if (auth.user.role !== Role.STUDENT && auth.user.role !== Role.PARENT) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes permisos para subir videos." : "You do not have permission to upload videos." }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  let studentId: string;
  try {
    studentId = await resolveStudentIdForStudentOrParent(auth.user, optionalFormId(formData.get("studentId")));
  } catch (error) {
    if (error instanceof ParentAccessError) return NextResponse.json({ error: auth.user.locale === "es" ? "No autorizado." : "Forbidden." }, { status: error.status });
    throw error;
  }

  if (!file) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "Archivo requerido" : "File is required." }, { status: 400 });
  }
  if (!isAllowedVideoType(file.type)) {
    return NextResponse.json(
      { error: auth.user.locale === "es" ? `Formato no permitido. Usa MP4, MOV o WEBM (${ALLOWED_VIDEO_MIME_TYPES.join(", ")}).` : `Unsupported format. Use MP4, MOV, or WEBM (${ALLOWED_VIDEO_MIME_TYPES.join(", ")}).` },
      { status: 400 },
    );
  }
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "El archivo supera el límite de 100MB." : "The file exceeds the 100MB limit." }, { status: 400 });
  }

  const assignment = await db.teacherAssignment.findUnique({
    where: { studentId },
    include: { teacher: true },
  });

  if (!assignment) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes profesora asignada" : "You do not have an assigned teacher." }, { status: 400 });
  }

  const durationValue = Number(formData.get("durationSec") ?? 120);
  const safeDuration = Number.isFinite(durationValue) ? Math.max(1, Math.min(600, Math.round(durationValue))) : 120;
  const practiceAssignmentId = optionalFormId(formData.get("practiceAssignmentId"));
  const repertoireItemId = optionalFormId(formData.get("repertoireItemId"));
  const skillCategoryId = optionalFormId(formData.get("skillCategoryId"));

  try {
    await assertPracticeAssignmentForStudent(studentId, practiceAssignmentId);
    await assertRepertoireForStudent(studentId, repertoireItemId);
    await assertActiveSkillCategories([skillCategoryId]);
  } catch (error) {
    const progressError = getProgressErrorResponse(error, auth.user.locale);
    if (progressError) return NextResponse.json({ error: progressError.message }, { status: progressError.status });
    throw error;
  }
  const stored = await storePracticeVideo(file, studentId);

  const video = await db.practiceVideo.create({
    data: {
      studentId,
      teacherId: assignment.teacherId,
      practiceAssignmentId,
      repertoireItemId,
      skillCategoryId,
      storageKey: stored.storageKey,
      originalName: file.name,
      durationSec: safeDuration,
      status: VideoStatus.PENDING,
    },
  });

  await createNotification({
    userId: assignment.teacher.userId,
    type: NotificationType.VIDEO_REVIEW,
    title: "New weekly video",
    body: `${auth.user.name} uploaded a new practice video.`,
    actionUrl: "/teacher/videos",
  });

  return NextResponse.json({ video });
}

export async function PATCH(req: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  if (auth.user.role !== Role.TEACHER || !auth.user.teacherProfile) {
    return NextResponse.json({ error: auth.user.locale === "es" ? "No tienes permisos para revisar videos." : "You do not have permission to review videos." }, { status: 403 });
  }
  const teacherProfileId = auth.user.teacherProfile.id;

  const parsed = reviewVideoSchema.safeParse(await req.json());

  if (!parsed.success) {
    const firstIssue = validationErrorMessage(parsed.error, auth.user.locale, auth.user.locale === "es" ? "Datos inválidos para registrar comentarios." : "Invalid data for saving feedback.");
    return NextResponse.json({ error: firstIssue }, { status: 400 });
  }

  const { videoId, comment, skillRatings = [] } = parsed.data;

  let video;
  try {
    video = await assertPracticeVideoForTeacher(teacherProfileId, videoId);
    await assertActiveSkillCategories(skillRatings.map((rating) => rating.skillCategoryId));
  } catch (error) {
    const progressError = getProgressErrorResponse(error, auth.user.locale);
    if (progressError) return NextResponse.json({ error: progressError.message }, { status: progressError.status });
    throw error;
  }

  await db.$transaction(async (tx) => {
    await tx.practiceVideo.update({
      where: { id: video.id },
      data: {
        status: VideoStatus.REVIEWED,
        reviewedAt: new Date(),
      },
    });

    const feedback = await tx.videoFeedback.create({
      data: {
        videoId: video.id,
        teacherId: teacherProfileId,
        comment,
      },
    });

    if (skillRatings.length) {
      await tx.videoSkillRating.createMany({
        data: skillRatings.map((rating) => ({
          videoFeedbackId: feedback.id,
          skillCategoryId: rating.skillCategoryId,
          rating: rating.rating,
          note: rating.note,
        })),
      });
    }
  });

  const student = await db.studentProfile.findUnique({
    where: { id: video.studentId },
    select: { userId: true },
  });

  if (student) {
    await createNotification({
      userId: student.userId,
      type: NotificationType.VIDEO_REVIEW,
      title: "Your video was reviewed",
      body: "You now have feedback from your teacher.",
      actionUrl: "/videos",
    });
  }

  return NextResponse.json({ ok: true });
}

function optionalFormId(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}
