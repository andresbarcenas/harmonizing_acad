import { MessagesPanel } from "@/components/messaging/messages-panel";
import { AppShell } from "@/components/ui/app-shell";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getMessagesThreadForViewer } from "@/lib/data";

export default async function MessagesPage() {
  const viewer = await requireViewer();
  const thread = await getMessagesThreadForViewer(viewer);

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
