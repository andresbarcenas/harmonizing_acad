import { NotificationList } from "@/components/notifications/notification-list";
import { AppShell } from "@/components/ui/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { db } from "@/lib/db";
import { getDictionary } from "@/lib/i18n";

export default async function NotificationsPage() {
  const viewer = await requireViewer();
  const dictionary = getDictionary(viewer.locale);

  const notifications = await db.notification.findMany({
    where: { userId: viewer.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <AppShell role={viewer.role} activePath="/notifications" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={dictionary.notifications.eyebrow}
        title={dictionary.notifications.title}
        description={dictionary.notifications.description}
      />
      <Card>
        <CardTitle>{dictionary.notifications.center}</CardTitle>
      </Card>
      <NotificationList
        initial={notifications.map((notification) => ({
          id: notification.id,
          title: notification.title,
          body: notification.body,
          createdAt: notification.createdAt.toISOString(),
          readAt: notification.readAt?.toISOString() ?? null,
          actionUrl: notification.actionUrl,
        }))}
        locale={viewer.locale}
      />
    </AppShell>
  );
}
