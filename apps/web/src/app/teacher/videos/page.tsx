import { Role, VideoStatus } from "@prisma/client";
import Link from "next/link";

import { VideoReviewForm } from "@/components/videos/video-review-form";
import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getTeacherVideosData } from "@/lib/data";
import { cn } from "@/lib/utils";
import { getVideoPublicUrl } from "@/lib/storage";

type TeacherVideosPageProps = {
  searchParams?: {
    estado?: string;
  };
};

export default async function TeacherVideosPage({ searchParams }: TeacherVideosPageProps) {
  const viewer = await requireViewer([Role.TEACHER]);
  const selectedFilter = searchParams?.estado === "pending" || searchParams?.estado === "reviewed" ? searchParams.estado : "all";
  const { videos, missingThisWeek } = await getTeacherVideosData(viewer, selectedFilter);

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
        <div className="mt-3 inline-flex rounded-full border border-[var(--color-border)] bg-white/76 p-1">
          {[
            { key: "all", label: "Todas" },
            { key: "pending", label: "Pendientes" },
            { key: "reviewed", label: "Revisadas" },
          ].map((option) => {
            const active = selectedFilter === option.key;
            return (
              <Link
                key={option.key}
                href={option.key === "all" ? "/teacher/videos" : `/teacher/videos?estado=${option.key}`}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  active ? "bg-[var(--color-gold)] text-white shadow-[var(--shadow-glow)]" : "text-[var(--color-ink-soft)] hover:bg-[var(--color-gold-soft)]",
                )}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
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
              <Badge variant={video.status === VideoStatus.REVIEWED || video.status === VideoStatus.FEEDBACK_GIVEN ? "success" : "warning"}>
                {video.status === VideoStatus.REVIEWED || video.status === VideoStatus.FEEDBACK_GIVEN ? "Revisado" : "Pendiente"}
              </Badge>
            </div>
            <div className="mt-3">
              <video
                controls
                preload="metadata"
                className="w-full rounded-xl border border-[var(--color-border)] bg-black/90"
                src={getVideoPublicUrl(video.storageKey)}
              >
                <track kind="captions" />
              </video>
            </div>
            <div className="mt-3">
              <VideoReviewForm videoId={video.id} disabled={video.status === VideoStatus.REVIEWED || video.status === VideoStatus.FEEDBACK_GIVEN} />
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
