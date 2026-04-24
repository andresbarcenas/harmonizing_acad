import { Role, VideoStatus } from "@prisma/client";

import { VideoUploadForm } from "@/components/videos/video-upload-form";
import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { db } from "@/lib/db";

export default async function StudentVideosPage() {
  const viewer = await requireViewer([Role.STUDENT]);

  const videos = await db.practiceVideo.findMany({
    where: { studentId: viewer.studentProfileId! },
    include: { feedback: true },
    orderBy: { submittedAt: "desc" },
  });

  return (
    <AppShell role={viewer.role} activePath="/videos" userName={viewer.name}>
      <PageIntro
        eyebrow="Práctica semanal"
        title="Comparte tu avance y recibe guía con continuidad."
        description="Sube tu práctica en minutos, mantén un historial visible y revisa el feedback de tu docente en una línea de progreso más clara."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <VideoUploadForm />
        <Card>
          <CardTitle>Timeline de progreso</CardTitle>
          <CardDescription>Tu historial semanal de práctica.</CardDescription>
          <div className="mt-3 space-y-3">
            {videos.map((video, index) => (
              <div key={video.id} className="relative rounded-[1.2rem] border border-[var(--color-border)] bg-white/68 px-4 py-3">
                {index < videos.length - 1 ? <span className="absolute left-6 top-[calc(100%+2px)] h-5 w-px bg-[var(--color-border)]" /> : null}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="break-all text-sm font-medium">{video.originalName}</p>
                  <Badge variant={video.status === VideoStatus.FEEDBACK_GIVEN ? "success" : "warning"}>
                    {video.status === VideoStatus.FEEDBACK_GIVEN ? "Con feedback" : "En revisión"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{new Date(video.submittedAt).toLocaleDateString("es-US")}</p>
                <div className="mt-2 rounded-xl border border-[var(--color-border)] bg-white/80 px-3 py-2 text-xs text-[var(--color-ink-soft)]">
                  <p>1) Enviado</p>
                  <p>2) Revisado por docente</p>
                  <p>3) Feedback aplicado</p>
                </div>
                {video.feedback[0] ? <p className="mt-2 text-sm text-[var(--color-ink)]">{video.feedback[0].comment}</p> : null}
              </div>
            ))}
            {!videos.length ? <p className="text-sm text-[var(--color-ink-soft)]">Aún no has enviado videos de práctica.</p> : null}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
