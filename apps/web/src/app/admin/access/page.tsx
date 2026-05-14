import { Role } from "@prisma/client";

import { AdminPasswordResetForm } from "@/components/admin/password-reset-form";
import { AppShell } from "@/components/ui/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { db } from "@/lib/db";
import { getDictionary } from "@/lib/i18n";

function roleLabel(role: Role, locale: string) {
  if (locale === "es") {
    if (role === Role.ADMIN) return "Admin";
    if (role === Role.TEACHER) return "Docente";
    return "Estudiante";
  }

  if (role === Role.ADMIN) return "Admin";
  if (role === Role.TEACHER) return "Teacher";
  return "Student";
}

export default async function AdminAccessPage() {
  const viewer = await requireViewer([Role.ADMIN]);
  const dictionary = getDictionary(viewer.locale);
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
      studentProfile: { select: { id: true, preferredInstrument: true } },
      teacherProfile: { select: { id: true, specialty: true } },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return (
    <AppShell role={viewer.role} activePath="/admin/access" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={dictionary.admin.accessEyebrow}
        title={dictionary.admin.accessTitle}
        description={dictionary.admin.accessDescription}
      />

      <Card>
        <CardTitle>{dictionary.admin.passwordResetCenter}</CardTitle>
        <CardDescription>{dictionary.admin.passwordResetCenterDescription}</CardDescription>
        <div className="mt-4 space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="grid gap-4 rounded-[1.25rem] border border-[var(--color-border)] bg-white/72 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.95fr)] lg:items-center"
            >
              <div className="flex min-w-0 items-start gap-3">
                <Avatar
                  src={user.image}
                  alt={user.name}
                  fallback={user.name.slice(0, 1).toUpperCase()}
                  className="mt-1 h-11 w-11 text-xs"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{user.name}</p>
                    <Badge>{roleLabel(user.role, viewer.locale)}</Badge>
                    {user.id === viewer.id ? <Badge variant="gold">{dictionary.admin.currentAdmin}</Badge> : null}
                  </div>
                  <p className="mt-1 truncate text-xs text-[var(--color-ink-soft)]">{user.email}</p>
                  <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                    {user.teacherProfile?.specialty ?? user.studentProfile?.preferredInstrument ?? dictionary.admin.passwordAccountReady}
                  </p>
                </div>
              </div>
              <AdminPasswordResetForm userId={user.id} disabled={user.id === viewer.id} locale={viewer.locale} />
            </div>
          ))}
          {!users.length ? <p className="text-sm text-[var(--color-ink-soft)]">{dictionary.common.noItems}</p> : null}
        </div>
      </Card>
    </AppShell>
  );
}
