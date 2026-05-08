import { MessagesPanel } from "@/components/messaging/messages-panel";
import { AppShell } from "@/components/ui/app-shell";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { getMessagesThreadForViewer } from "@/lib/data";
import { getDictionary } from "@/lib/i18n";

type MessagesPageProps = {
  searchParams?: Promise<{
    studentId?: string;
  }>;
};

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const viewer = await requireViewer();
  const dictionary = getDictionary(viewer.locale);
  const resolvedSearchParams = await searchParams;
  const { thread, selectedStudentId } = await getMessagesThreadForViewer(viewer, { studentId: resolvedSearchParams?.studentId });

  if (!thread) {
    return (
      <AppShell role={viewer.role} activePath="/messages" userName={viewer.name} locale={viewer.locale} selectedTeacherStudentId={selectedStudentId}>
        <PageIntro
          eyebrow={dictionary.messages.eyebrow}
          title={dictionary.messages.titleEmpty}
          description={dictionary.messages.descriptionEmpty}
        />
        <Card>
          <CardTitle>{dictionary.messages.eyebrow}</CardTitle>
          <CardDescription>{dictionary.messages.unavailable}</CardDescription>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell role={viewer.role} activePath="/messages" userName={viewer.name} locale={viewer.locale} selectedTeacherStudentId={selectedStudentId}>
      <PageIntro
        eyebrow={dictionary.messages.eyebrow}
        title={dictionary.messages.title}
        description={dictionary.messages.description}
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
        locale={viewer.locale}
      />
    </AppShell>
  );
}
