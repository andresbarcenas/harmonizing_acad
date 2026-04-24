import { Role, VideoStatus } from "@prisma/client";
import { endOfWeek, startOfWeek } from "date-fns";

import { VideoReviewForm } from "@/components/videos/video-review-form";
import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { db } from "@/lib/db";
import { getPublicMediaBaseUrl } from "@/lib/media-url";

export default async function TeacherVideosPage() {
  const viewer = await requireViewer([Role.TEACHER]);
  const mediaBase = getPublicMediaBaseUrl() ?? "http://localhost:9010/harmonizing-media";

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
      include: { student: { include: { user: true } } },
    }),
  ]);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const submittedThisWeek = new Set(
    videos
      .filter((video) => video.submittedAt >= weekStart && video.submittedAt <= weekEnd)
      .map((video) => video.studentId),
  );
  const missingThisWeek = assignedStudents.filter((assignment) => !submittedThisWeek.has(assignment.studentId));

  return (
    <AppShell role={viewer.role} activePath="/teacher/videos" userName={viewer.name}>
      <PageIntro
        eyebrow="Revisión semanal"
        title="Tus prácticas pendientes, en una cola elegante y directa."
        description="Revisa videos, deja feedback personalizado y detecta con rapidez qué estudiantes todavía no han enviado su práctica."
      />

      <Card>
        <CardTitle>Prácticas semanales</CardTitle>
        <CardDescription>{missingThisWeek.length} estudiante(s) aún no subieron su video esta semana.</CardDescription>
        {missingThisWeek.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {missingThisWeek.map((assignment) => (
              <span key={assignment.id} className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1 text-xs text-[var(--color-ink-soft)]">
                {assignment.student.user.name}
              </span>
            ))}
          </div>
        ) : null}
      </Card>

      <div className="space-y-3">
        {videos.map((video) => (
          <Card key={video.id}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{video.student.user.name}</p>
                <p className="break-all text-xs text-[var(--color-ink-soft)]">{video.originalName} · {Math.floor(video.durationSec / 60)}:{`${video.durationSec % 60}`.padStart(2, "0")}</p>
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
        {!videos.length ? (
          <Card>
            <CardTitle>Sin videos aún</CardTitle>
            <CardDescription>Cuando tus estudiantes envíen prácticas aparecerán aquí para revisión.</CardDescription>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
