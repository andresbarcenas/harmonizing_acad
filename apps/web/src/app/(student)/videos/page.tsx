import { Role, VideoStatus } from "@prisma/client";

import { VideoUploadForm } from "@/components/videos/video-upload-form";
import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getStudentVideosData } from "@/lib/data";
import { formatDate, getDictionary } from "@/lib/i18n";
import { getVideoPublicUrl } from "@/lib/storage";

type StudentVideosPageProps = {
  searchParams?: Promise<{
    assignmentId?: string;
    repertoireItemId?: string;
    skillCategoryId?: string;
  }>;
};

export default async function StudentVideosPage({ searchParams }: StudentVideosPageProps) {
  const viewer = await requireViewer([Role.STUDENT]);
  const dictionary = getDictionary(viewer.locale);
  const { videos, assignments, repertoireItems, skillCategories } = await getStudentVideosData(viewer);
  const params = await searchParams;

  return (
    <AppShell role={viewer.role} activePath="/videos" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={dictionary.videos.studentEyebrow}
        title={dictionary.videos.studentTitle}
        description={dictionary.videos.studentDescription}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <VideoUploadForm
          locale={viewer.locale}
          assignments={assignments}
          repertoireItems={repertoireItems}
          skillCategories={skillCategories}
          defaultAssignmentId={params?.assignmentId}
          defaultRepertoireItemId={params?.repertoireItemId}
          defaultSkillCategoryId={params?.skillCategoryId}
        />
        <Card>
          <CardTitle>{dictionary.videos.timeline}</CardTitle>
          <CardDescription>{dictionary.videos.timelineDescription}</CardDescription>
          <div className="mt-3 space-y-3">
            {videos.map((video, index) => (
              <div key={video.id} className="relative rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3">
                {index < videos.length - 1 ? <span className="absolute left-6 top-[calc(100%+2px)] h-5 w-px bg-[var(--color-border)]" /> : null}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="break-all text-sm font-medium">{video.originalName}</p>
                  <Badge variant={video.status === VideoStatus.REVIEWED || video.status === VideoStatus.FEEDBACK_GIVEN ? "success" : "warning"}>
                    {video.status === VideoStatus.REVIEWED || video.status === VideoStatus.FEEDBACK_GIVEN ? dictionary.common.reviewed : dictionary.common.inReview}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{formatDate(video.submittedAt, viewer.locale)}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">
                  {[video.practiceAssignment?.title, video.repertoireItem?.title, video.skillCategory?.name].filter(Boolean).join(" · ")}
                </p>
                <div className="mt-2">
                  <video
                    controls
                    preload="metadata"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-black/90"
                    src={getVideoPublicUrl(video.storageKey)}
                  >
                    <track kind="captions" />
                  </video>
                </div>
                <div className="mt-2 rounded-xl border border-[var(--color-border)] bg-white/80 px-3 py-2 text-xs text-[var(--color-ink-soft)]">
                  <p>1) {dictionary.videos.sent}</p>
                  <p>2) {dictionary.videos.reviewedByTeacher}</p>
                  <p>3) {dictionary.videos.feedbackApplied}</p>
                </div>
                {video.feedback[0] ? <p className="mt-2 text-sm text-[var(--color-ink)]">{video.feedback[0].comment}</p> : null}
              </div>
            ))}
            {!videos.length ? <p className="text-sm text-[var(--color-ink-soft)]">{dictionary.videos.noStudentVideos}</p> : null}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
