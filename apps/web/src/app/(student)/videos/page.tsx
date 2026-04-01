import { Role, VideoStatus } from "@prisma/client";

import { VideoUploadForm } from "@/components/videos/video-upload-form";
import { AppShell } from "@/components/ui/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
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
      <div className="grid gap-4 lg:grid-cols-2">
        <VideoUploadForm />
        <Card>
          <CardTitle>Timeline de progreso</CardTitle>
          <CardDescription>Tu historial semanal de práctica.</CardDescription>
          <div className="mt-3 space-y-2">
            {videos.map((video) => (
              <div key={video.id} className="rounded-xl border border-[var(--color-border)] px-3 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{video.originalName}</p>
                  <Badge variant={video.status === VideoStatus.FEEDBACK_GIVEN ? "success" : "warning"}>
                    {video.status === VideoStatus.FEEDBACK_GIVEN ? "Con feedback" : "Pendiente"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{new Date(video.submittedAt).toLocaleDateString("es-US")}</p>
                {video.feedback[0] ? <p className="mt-2 text-sm">{video.feedback[0].comment}</p> : null}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
