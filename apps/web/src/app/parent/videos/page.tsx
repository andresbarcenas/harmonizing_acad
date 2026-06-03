import { Role, VideoStatus } from "@prisma/client";

import { VideoUploadForm } from "@/components/videos/video-upload-form";
import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getStudentVideosDataForProfile } from "@/lib/data";
import { formatDate } from "@/lib/i18n";
import { resolveParentStudentSelection } from "@/lib/parents";
import { getSkillDisplayName } from "@/lib/skills/default-skills";

export default async function ParentVideosPage({ searchParams }: { searchParams?: Promise<{ studentId?: string; assignmentId?: string; repertoireItemId?: string; skillCategoryId?: string }> }) {
  const viewer = await requireViewer([Role.PARENT]);
  const params = await searchParams;
  const selection = await resolveParentStudentSelection(viewer.parentGuardianProfileId!, params?.studentId);
  const selectedStudentId = selection.selectedStudentId;
  const isSpanish = viewer.locale === "es";

  if (!selectedStudentId) {
    return (
      <AppShell role={viewer.role} activePath="/parent/videos" userName={viewer.name} locale={viewer.locale}>
        <PageIntro eyebrow={isSpanish ? "Videos familiares" : "Family videos"} title={isSpanish ? "Aún no hay estudiantes vinculados." : "No linked students yet."} description={isSpanish ? "Administración puede vincular estudiantes a esta cuenta familiar." : "An admin can link students to this family account."} />
      </AppShell>
    );
  }

  const { videos, assignments, repertoireItems, skillCategories } = await getStudentVideosDataForProfile(selectedStudentId);
  const student = selection.selectedLink?.student;

  return (
    <AppShell role={viewer.role} activePath="/parent/videos" userName={viewer.name} locale={viewer.locale} selectedParentStudentId={selectedStudentId}>
      <PageIntro eyebrow={isSpanish ? "Videos de práctica" : "Practice videos"} title={isSpanish ? `Videos de ${student?.user.name ?? "estudiante"}` : `${student?.user.name ?? "Student"} practice videos`} description={isSpanish ? "Sube videos y revisa comentarios de la docente." : "Upload videos and review teacher feedback."} />
      <div className="grid gap-4 xl:grid-cols-2">
        <VideoUploadForm
          locale={viewer.locale}
          studentId={selectedStudentId}
          assignments={assignments}
          repertoireItems={repertoireItems}
          skillCategories={skillCategories}
          defaultAssignmentId={params?.assignmentId}
          defaultRepertoireItemId={params?.repertoireItemId}
          defaultSkillCategoryId={params?.skillCategoryId}
        />
        <Card>
          <CardTitle>{isSpanish ? "Línea de tiempo" : "Timeline"}</CardTitle>
          <CardDescription>{isSpanish ? "Videos enviados y estado de revisión." : "Submitted videos and review status."}</CardDescription>
          <div className="mt-3 space-y-3">
            {videos.map((video, index) => (
              <div key={video.id} className="relative rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3">
                {index < videos.length - 1 ? <span className="absolute left-6 top-[calc(100%+2px)] h-5 w-px bg-[var(--color-border)]" /> : null}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="break-all text-sm font-medium">{video.originalName}</p>
                  <Badge variant={video.status === VideoStatus.REVIEWED || video.status === VideoStatus.FEEDBACK_GIVEN ? "success" : "warning"}>{video.status === VideoStatus.REVIEWED || video.status === VideoStatus.FEEDBACK_GIVEN ? (isSpanish ? "Revisado" : "Reviewed") : (isSpanish ? "En revisión" : "In review")}</Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{formatDate(video.submittedAt, viewer.locale)}</p>
                <p className="text-xs text-[var(--color-ink-soft)]">{[video.practiceAssignment?.title, video.repertoireItem?.title, video.skillCategory ? getSkillDisplayName(video.skillCategory.name, viewer.locale) : null].filter(Boolean).join(" · ")}</p>
                <div className="mt-2"><video controls preload="metadata" className="w-full rounded-xl border border-[var(--color-border)] bg-black/90" src={`/api/media/videos/${video.id}`}><track kind="captions" /></video></div>
                {video.feedback[0] ? <p className="mt-2 text-sm text-[var(--color-ink)]">{video.feedback[0].comment}</p> : null}
              </div>
            ))}
            {!videos.length ? <p className="text-sm text-[var(--color-ink-soft)]">{isSpanish ? "Aún no hay videos." : "No videos yet."}</p> : null}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
