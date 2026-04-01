import { Role, VideoStatus } from "@prisma/client";

import { VideoReviewForm } from "@/components/videos/video-review-form";
import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/server";
import { db } from "@/lib/db";

export default async function TeacherVideosPage() {
  const viewer = await requireViewer([Role.TEACHER]);
  const mediaBase = process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "http://localhost:9010/harmonizing-media";

  const [videos, assignedStudents] = await Promise.all([
    db.practiceVideo.findMany({
      where: { teacherId: viewer.teacherProfileId! },
      include: {
        student: { include: { user: true } },
        feedback: true,
      },
      orderBy: { submittedAt: "desc" },
    }),
    db.teacherAssignment.findMany({
      where: { teacherId: viewer.teacherProfileId! },
      include: { student: true },
    }),
  ]);

  const submittedIds = new Set(videos.map((video) => video.studentId));
  const notSubmittedCount = assignedStudents.filter((assignment) => !submittedIds.has(assignment.studentId)).length;

  return (
    <AppShell role={viewer.role} activePath="/teacher/videos" userName={viewer.name}>
      <Card>
        <CardTitle>Prácticas semanales</CardTitle>
        <CardDescription>{notSubmittedCount} estudiante(s) aún no subieron su video esta semana.</CardDescription>
      </Card>

      <div className="mt-4 space-y-3">
        {videos.map((video) => (
          <Card key={video.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{video.student.user.name}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">{video.originalName} · {Math.floor(video.durationSec / 60)}:{`${video.durationSec % 60}`.padStart(2, "0")}</p>
              </div>
              <Badge variant={video.status === VideoStatus.FEEDBACK_GIVEN ? "success" : "warning"}>
                {video.status === VideoStatus.FEEDBACK_GIVEN ? "Revisado" : "Pendiente"}
              </Badge>
            </div>
            <div className="mt-3">
              <video
                controls
                preload="metadata"
                className="w-full rounded-xl border border-[var(--color-border)] bg-black/90"
                src={`${mediaBase}/${video.storageKey}`}
              >
                <track kind="captions" />
              </video>
            </div>
            <div className="mt-3">
              <VideoReviewForm videoId={video.id} />
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
