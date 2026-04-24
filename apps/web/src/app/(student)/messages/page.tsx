import { Role } from "@prisma/client";

import { MessagesPanel } from "@/components/messaging/messages-panel";
import { AppShell } from "@/components/ui/app-shell";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { db } from "@/lib/db";

export default async function MessagesPage() {
  const viewer = await requireViewer();

  let thread = null;

  if (viewer.role === Role.STUDENT && viewer.studentProfileId) {
    const assignment = await db.teacherAssignment.findUnique({ where: { studentId: viewer.studentProfileId } });

    if (assignment) {
      thread = await db.messageThread.findUnique({
        where: {
          studentId_teacherId: {
            studentId: viewer.studentProfileId,
            teacherId: assignment.teacherId,
          },
        },
        include: {
          messages: { include: { sender: true }, orderBy: { createdAt: "asc" } },
        },
      });
    }
  }

  if (viewer.role === Role.TEACHER && viewer.teacherProfileId) {
    thread = await db.messageThread.findFirst({
      where: { teacherId: viewer.teacherProfileId },
      include: {
        messages: { include: { sender: true }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  if (viewer.role === Role.ADMIN) {
    thread = await db.messageThread.findFirst({
      include: {
        messages: { include: { sender: true }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  if (!thread) {
    return (
      <AppShell role={viewer.role} activePath="/messages" userName={viewer.name}>
        <PageIntro
          eyebrow="Mensajes"
          title="Un canal privado para seguir tu proceso."
          description="Mantén tus dudas, recordatorios y detalles de clase en una conversación simple y siempre disponible."
        />
        <Card>
          <CardTitle>Mensajes</CardTitle>
          <CardDescription>No hay conversación disponible aún.</CardDescription>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell role={viewer.role} activePath="/messages" userName={viewer.name}>
      <PageIntro
        eyebrow="Mensajes"
        title="Habla con claridad, sin salir de Harmonizing."
        description="Todo queda en un solo hilo para mantener continuidad entre clases, prácticas y ajustes de agenda."
      />
      <MessagesPanel
        threadId={thread.id}
        currentUserId={viewer.id}
        messages={thread.messages.map((message) => ({
          id: message.id,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
          sender: { id: message.sender.id, name: message.sender.name },
        }))}
      />
    </AppShell>
  );
}
