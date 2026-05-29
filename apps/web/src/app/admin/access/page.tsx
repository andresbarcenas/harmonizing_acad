import { AdminImpersonationStatus, Role, UserLoginActivityStatus, UserLoginAuthMethod } from "@prisma/client";

import { AdminCreateForm } from "@/components/admin/admin-create-form";
import { AdminPasswordResetForm } from "@/components/admin/password-reset-form";
import { TeacherImpersonationForm } from "@/components/admin/teacher-impersonation-form";
import { AppShell } from "@/components/ui/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro } from "@/components/ui/page-intro";
import { requireViewer } from "@/features/auth/server";
import { db } from "@/lib/db";
import { getDictionary } from "@/lib/i18n";
import { instrumentLabel } from "@/lib/instruments";

function roleLabel(role: Role, locale: string) {
  if (locale === "es") {
    if (role === Role.ADMIN) return "Admin";
    if (role === Role.TEACHER) return "Docente";
    if (role === Role.PARENT) return "Acudiente";
    return "Estudiante";
  }

  if (role === Role.ADMIN) return "Admin";
  if (role === Role.TEACHER) return "Teacher";
  if (role === Role.PARENT) return "Guardian";
  return "Student";
}

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function enumParam<T extends Record<string, string>>(values: T, value: string | undefined) {
  return value && Object.values(values).includes(value) ? value as T[keyof T] : undefined;
}

function formatDateTime(value: Date | null | undefined, locale: string) {
  if (!value) return locale === "es" ? "Nunca" : "Never";
  return new Intl.DateTimeFormat(locale === "es" ? "es-CO" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function loginStatusVariant(status: UserLoginActivityStatus) {
  return status === UserLoginActivityStatus.SUCCESS ? "success" as const : "danger" as const;
}

function impersonationStatusVariant(status: AdminImpersonationStatus) {
  if (status === AdminImpersonationStatus.ACTIVE) return "gold" as const;
  if (status === AdminImpersonationStatus.EXPIRED) return "warning" as const;
  return "default" as const;
}

export default async function AdminAccessPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireViewer([Role.ADMIN]);
  const dictionary = getDictionary(viewer.locale);
  const params = await searchParams;
  const filters = {
    status: enumParam(UserLoginActivityStatus, singleParam(params?.status)),
    authMethod: enumParam(UserLoginAuthMethod, singleParam(params?.authMethod)),
    q: singleParam(params?.q)?.trim() ?? "",
    limit: Math.min(Math.max(Number(singleParam(params?.limit) ?? 80) || 80, 10), 200),
  };
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
  const [recentSuccesses, loginActivity, impersonationSessions] = await Promise.all([
    db.userLoginActivity.findMany({
      where: {
        userId: { in: users.map((user) => user.id) },
        status: UserLoginActivityStatus.SUCCESS,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    db.userLoginActivity.findMany({
      where: {
        status: filters.status,
        authMethod: filters.authMethod,
        OR: filters.q
          ? [
              { emailAttempted: { contains: filters.q, mode: "insensitive" } },
              { user: { name: { contains: filters.q, mode: "insensitive" } } },
              { ipAddress: { contains: filters.q, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: filters.limit,
    }),
    db.adminImpersonationSession.findMany({
      include: {
        adminUser: { select: { name: true, email: true } },
        targetUser: { select: { name: true, email: true, role: true } },
      },
      orderBy: { startedAt: "desc" },
      take: 30,
    }),
  ]);
  const lastLoginByUserId = new Map<string, Date>();
  for (const activity of recentSuccesses) {
    if (activity.userId && !lastLoginByUserId.has(activity.userId)) {
      lastLoginByUserId.set(activity.userId, activity.createdAt);
    }
  }

  return (
    <AppShell role={viewer.role} activePath="/admin/access" userName={viewer.name} locale={viewer.locale}>
      <PageIntro
        eyebrow={dictionary.admin.accessEyebrow}
        title={dictionary.admin.accessTitle}
        description={dictionary.admin.accessDescription}
      />

      <Card>
        <CardTitle>{dictionary.admin.createAdminTitle}</CardTitle>
        <CardDescription>{dictionary.admin.createAdminDescription}</CardDescription>
        <AdminCreateForm locale={viewer.locale} />
      </Card>

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
                  locale={viewer.locale}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink)]">{user.name}</p>
                    <Badge>{roleLabel(user.role, viewer.locale)}</Badge>
                    {user.id === viewer.id ? <Badge variant="gold">{dictionary.admin.currentAdmin}</Badge> : null}
                  </div>
                  <p className="mt-1 truncate text-xs text-[var(--color-ink-soft)]">{user.email}</p>
                  <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                    {instrumentLabel(user.teacherProfile?.specialty ?? user.studentProfile?.preferredInstrument, viewer.locale) || dictionary.admin.passwordAccountReady}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                    {dictionary.admin.lastLogin}: {formatDateTime(lastLoginByUserId.get(user.id), viewer.locale)}
                  </p>
                </div>
              </div>
              <div className="grid gap-3">
                <AdminPasswordResetForm userId={user.id} disabled={user.id === viewer.id} locale={viewer.locale} />
                {user.role === Role.TEACHER ? (
                  <TeacherImpersonationForm teacherUserId={user.id} teacherName={user.name} locale={viewer.locale} />
                ) : null}
              </div>
            </div>
          ))}
          {!users.length ? <p className="text-sm text-[var(--color-ink-soft)]">{dictionary.common.noItems}</p> : null}
        </div>
      </Card>

      <Card>
        <CardTitle>{viewer.locale === "es" ? "Historial de suplantación" : "Impersonation history"}</CardTitle>
        <CardDescription>
          {viewer.locale === "es"
            ? "Registro de sesiones donde un admin entró temporalmente como docente para soporte."
            : "Audit trail of admin sessions temporarily viewing as a teacher for support."}
        </CardDescription>
        <div className="mt-4 space-y-3">
          {impersonationSessions.map((session) => (
            <div key={session.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/72 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={impersonationStatusVariant(session.status)}>{session.status}</Badge>
                    <Badge>{roleLabel(session.targetRole, viewer.locale)}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                    {viewer.locale === "es" ? "Docente" : "Teacher"}: {session.targetUser.name}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                    {viewer.locale === "es" ? "Admin" : "Admin"}: {session.adminUser.name} · {session.adminUser.email}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[var(--color-ink-soft)]">{session.reason}</p>
                </div>
                <div className="grid gap-1 text-xs text-[var(--color-ink-soft)] lg:min-w-[22rem] lg:text-right">
                  <p>{viewer.locale === "es" ? "Inicio" : "Started"}: {formatDateTime(session.startedAt, viewer.locale)}</p>
                  <p>{viewer.locale === "es" ? "Vence" : "Expires"}: {formatDateTime(session.expiresAt, viewer.locale)}</p>
                  <p>{viewer.locale === "es" ? "Fin" : "Ended"}: {formatDateTime(session.endedAt, viewer.locale)}</p>
                  <p>IP: {session.ipAddress ?? "—"}</p>
                </div>
              </div>
            </div>
          ))}
          {!impersonationSessions.length ? <p className="text-sm text-[var(--color-ink-soft)]">{dictionary.common.noItems}</p> : null}
        </div>
      </Card>

      <Card>
        <CardTitle>{dictionary.admin.loginActivityTitle}</CardTitle>
        <CardDescription>{dictionary.admin.loginActivityDescription}</CardDescription>
        <form className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.6fr)_auto]">
          <input
            name="q"
            defaultValue={filters.q}
            placeholder={dictionary.admin.loginActivitySearchPlaceholder}
            className="h-[2.9rem] rounded-[1rem] border border-[var(--color-border-strong)] bg-white/84 px-3 text-sm text-[var(--color-ink)]"
          />
          <select name="status" defaultValue={filters.status ?? ""} className="h-[2.9rem] rounded-[1rem] border border-[var(--color-border-strong)] bg-white/84 px-3 text-sm text-[var(--color-ink)]">
            <option value="">{dictionary.admin.allStatuses}</option>
            {Object.values(UserLoginActivityStatus).map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <select name="authMethod" defaultValue={filters.authMethod ?? ""} className="h-[2.9rem] rounded-[1rem] border border-[var(--color-border-strong)] bg-white/84 px-3 text-sm text-[var(--color-ink)]">
            <option value="">{dictionary.admin.allMethods}</option>
            {Object.values(UserLoginAuthMethod).map((method) => <option key={method} value={method}>{method.replaceAll("_", " ")}</option>)}
          </select>
          <select name="limit" defaultValue={String(filters.limit)} className="h-[2.9rem] rounded-[1rem] border border-[var(--color-border-strong)] bg-white/84 px-3 text-sm text-[var(--color-ink)]">
            {[25, 50, 80, 120, 200].map((limit) => <option key={limit} value={limit}>{limit}</option>)}
          </select>
          <button type="submit" className="h-[2.9rem] rounded-[1rem] border border-[var(--color-border-strong)] bg-white/84 px-4 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-gold)]">
            {dictionary.common.filter}
          </button>
        </form>
        <div className="mt-4 space-y-3">
          {loginActivity.map((activity) => (
            <div key={activity.id} className="rounded-[1.2rem] border border-[var(--color-border)] bg-white/72 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={loginStatusVariant(activity.status)}>{activity.status}</Badge>
                    <Badge>{activity.authMethod.replaceAll("_", " ")}</Badge>
                    <Badge>{activity.deviceType}</Badge>
                    {activity.roleSnapshot ? <Badge>{roleLabel(activity.roleSnapshot, viewer.locale)}</Badge> : null}
                  </div>
                  <p className="mt-2 truncate text-sm font-semibold text-[var(--color-ink)]">{activity.user?.name ?? activity.emailAttempted}</p>
                  <p className="mt-1 truncate text-xs text-[var(--color-ink-soft)]">{activity.emailAttempted}</p>
                  {activity.failureReason ? <p className="mt-1 text-xs text-rose-700">{activity.failureReason}</p> : null}
                </div>
                <div className="grid gap-1 text-xs text-[var(--color-ink-soft)] lg:min-w-[22rem] lg:text-right">
                  <p>{formatDateTime(activity.createdAt, viewer.locale)}</p>
                  <p>{activity.browserName ?? dictionary.admin.unknownBrowser}{activity.browserVersion ? ` ${activity.browserVersion}` : ""} · {activity.osName ?? dictionary.admin.unknownOs}</p>
                  <p>IP: {activity.ipAddress ?? "—"} · {dictionary.admin.country}: {activity.countryCode ?? "—"}</p>
                </div>
              </div>
            </div>
          ))}
          {!loginActivity.length ? <p className="text-sm text-[var(--color-ink-soft)]">{dictionary.common.noItems}</p> : null}
        </div>
      </Card>
    </AppShell>
  );
}
