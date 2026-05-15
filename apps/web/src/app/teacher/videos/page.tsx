import { Role, VideoStatus } from "@prisma/client";
import Link from "next/link";

import { VideoReviewForm } from "@/components/videos/video-review-form";
import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getTeacherVideosData } from "@/lib/data";
import { getDictionary } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type TeacherVideosPageProps = {
  searchParams?: Promise<{
    estado?: string;
    studentId?: string;
  }>;
};

export default async function TeacherVideosPage({ searchParams }: TeacherVideosPageProps) {
  const viewer = await requireViewer([Role.TEACHER]);
  const dictionary = getDictionary(viewer.locale);
  const resolvedSearchParams = await searchParams;
  const selectedFilter = resolvedSearchParams?.estado === "pending" || resolvedSearchParams?.estado === "reviewed" ? resolvedSearchParams.estado : "all";
  const { videos, missingThisWeek, selectedStudentId, skillCategories } = await getTeacherVideosData(viewer, selectedFilter, { studentId: resolvedSearchParams?.studentId });

  return (
    <AppShell role={viewer.role} activePath="/teacher/videos" userName={viewer.name} locale={viewer.locale} selectedTeacherStudentId={selectedStudentId}>
      <PageIntro
        eyebrow={dictionary.videos.teacherEyebrow}
        title={dictionary.videos.teacherTitle}
        description={dictionary.videos.teacherDescription}
      />

      <Card>
        <CardTitle>{dictionary.videos.weeklyPractices}</CardTitle>
        <CardDescription>{missingThisWeek.length} {dictionary.videos.missingCount}</CardDescription>
        <div className="mt-3 inline-flex rounded-full border border-[var(--color-border)] bg-white/76 p-1">
          {[
            { key: "all", label: dictionary.videos.all },
            { key: "pending", label: dictionary.videos.pending },
            { key: "reviewed", label: dictionary.videos.reviewed },
          ].map((option) => {
            const active = selectedFilter === option.key;
            return (
              <Link
                key={option.key}
                href={buildVideosFilterHref(option.key, selectedStudentId)}
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
                <p className="text-xs text-[var(--color-ink-soft)]">
                  {[video.practiceAssignment?.title, video.repertoireItem?.title, video.skillCategory?.name].filter(Boolean).join(" · ")}
                </p>
              </div>
              <Badge variant={video.status === VideoStatus.REVIEWED || video.status === VideoStatus.FEEDBACK_GIVEN ? "success" : "warning"}>
                {video.status === VideoStatus.REVIEWED || video.status === VideoStatus.FEEDBACK_GIVEN ? dictionary.common.reviewed : dictionary.common.pending}
              </Badge>
            </div>
            <div className="mt-3">
              <video
                controls
                preload="metadata"
                className="w-full rounded-xl border border-[var(--color-border)] bg-black/90"
                src={`/api/media/videos/${video.id}`}
              >
                <track kind="captions" />
              </video>
            </div>
            <div className="mt-3">
              <VideoReviewForm videoId={video.id} disabled={video.status === VideoStatus.REVIEWED || video.status === VideoStatus.FEEDBACK_GIVEN} locale={viewer.locale} skillCategories={skillCategories} />
            </div>
          </Card>
        ))}
        {!videos.length ? (
          <Card>
            <CardTitle>{dictionary.videos.emptyTitle}</CardTitle>
            <CardDescription>{dictionary.videos.emptyDescription}</CardDescription>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}

function buildVideosFilterHref(filter: string, studentId?: string | null) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("estado", filter);
  if (studentId) params.set("studentId", studentId);
  const query = params.toString();
  return query ? `/teacher/videos?${query}` : "/teacher/videos";
}
