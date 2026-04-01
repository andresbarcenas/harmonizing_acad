import { NotificationList } from "@/components/notifications/notification-list";
import { AppShell } from "@/components/ui/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/server";
import { db } from "@/lib/db";

export default async function NotificationsPage() {
  const viewer = await requireViewer();

  const notifications = await db.notification.findMany({
    where: { userId: viewer.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <AppShell role={viewer.role} activePath="/notifications" userName={viewer.name}>
      <Card className="mb-4">
        <CardTitle>Centro de notificaciones</CardTitle>
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
      />
    </AppShell>
  );
}
