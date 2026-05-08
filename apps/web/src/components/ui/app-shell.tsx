import Link from "next/link";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandLogo } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { TimezoneSync } from "@/components/system/timezone-sync";
import { TeacherStudentSelector } from "@/components/teacher/student-context-selector";
import { canUseAlegra } from "@/lib/alegra/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDictionary } from "@/lib/i18n/dictionary";
import { normalizeLocale, type AppLocale } from "@/lib/i18n/locales";
import { APP_VERSION } from "@/lib/release";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
};

function navByRole(role: Role, nav: ReturnType<typeof getDictionary>["shell"]["nav"]): NavItem[] {
  const studentNav: NavItem[] = [
    { href: "/dashboard", label: nav.home },
    { href: "/schedule", label: nav.schedule },
    { href: "/invoices", label: nav.invoices },
    { href: "/videos", label: nav.practice },
    { href: "/progress", label: nav.progress },
    { href: "/messages", label: nav.messages },
    { href: "/notifications", label: nav.notifications },
    { href: "/settings", label: nav.profile },
  ];
  const teacherNav: NavItem[] = [
    { href: "/teacher/dashboard", label: nav.today },
    { href: "/teacher/requests", label: nav.reschedules },
    { href: "/teacher/videos", label: nav.videos },
    { href: "/teacher/progress", label: nav.progress },
    { href: "/messages", label: nav.messages },
    { href: "/notifications", label: nav.notifications },
  ];
  const adminNav: NavItem[] = [
    { href: "/admin/dashboard", label: nav.overview },
    { href: "/admin/invoices", label: nav.billing },
    { href: "/admin/teachers", label: nav.teachers },
    { href: "/admin/students", label: nav.students },
    { href: "/admin/assignments", label: nav.assignments },
    { href: "/admin/availability", label: nav.availability },
    { href: "/admin/progress", label: nav.progress },
    { href: "/notifications", label: nav.notifications },
    { href: "/settings", label: nav.settings },
  ];

  if (role === Role.TEACHER) return teacherNav;
  if (role === Role.ADMIN) return adminNav;
  return studentNav;
}

export async function AppShell({
  role,
  activePath,
  userName,
  locale,
  selectedTeacherStudentId,
  children,
}: {
  role: Role;
  activePath: string;
  userName: string;
  locale?: AppLocale;
  selectedTeacherStudentId?: string | null;
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const activeLocale = normalizeLocale(locale ?? session?.user?.locale);
  const dictionary = getDictionary(activeLocale);
  const items = navByRole(role, dictionary.shell.nav);
  const notificationIndex = items.findIndex((item) => item.href === "/notifications");
  const alegraConfigured = canUseAlegra();
  const teacherContextStudents = role === Role.TEACHER && session?.user?.id
    ? await db.teacherProfile.findUnique({
        where: { userId: session.user.id },
        include: {
          students: {
            include: { student: { include: { user: true } } },
            orderBy: { student: { user: { name: "asc" } } },
          },
        },
      })
    : null;
  const validTeacherStudentId = teacherContextStudents?.students.some((assignment) => assignment.studentId === selectedTeacherStudentId)
    ? selectedTeacherStudentId
    : null;

  let unreadCount = 0;
  if (session?.user?.id) {
    unreadCount = await db.notification.count({
      where: { userId: session.user.id, readAt: null },
    });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 pb-10 pt-3 sm:px-4 md:px-8 md:pt-6">
      <TimezoneSync />
      <header className="mb-5 overflow-hidden rounded-[var(--radius-3xl)] border border-[var(--color-border)] bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(252,247,241,0.72))] px-3 py-3.5 shadow-[var(--shadow-card)] backdrop-blur-[18px] sm:px-4 md:mb-6 md:px-6 md:py-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link
            href={
              role === Role.STUDENT
                ? "/dashboard"
                : role === Role.TEACHER
                  ? withTeacherStudentContext("/teacher/dashboard", role, validTeacherStudentId)
                  : "/admin/dashboard"
            }
            className="min-w-0"
          >
            <BrandLogo compact={false} />
          </Link>
          <div className="flex w-full flex-wrap items-center justify-between gap-2 md:w-auto md:justify-end">
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold tracking-[0.08em] uppercase",
                alegraConfigured
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700",
              )}
              title={
                alegraConfigured
                  ? dictionary.shell.billingLiveTitle
                  : dictionary.shell.billingDemoTitle
              }
            >
              <span className={cn("h-2 w-2 rounded-full", alegraConfigured ? "bg-emerald-500" : "bg-amber-500")} />
              <span>{alegraConfigured ? dictionary.shell.billingLive : dictionary.shell.billingDemo}</span>
            </div>
            <LanguageToggle locale={activeLocale} authenticated compact />
            <div className="inline-flex max-w-full items-center gap-2 self-start rounded-full border border-[var(--color-border)] bg-white/75 px-3 py-2 text-xs font-medium tracking-[0.08em] text-[var(--color-ink-soft)] uppercase shadow-[0_10px_20px_rgba(78,55,30,0.04)] md:self-auto">
              <span className="h-2 w-2 rounded-full bg-[var(--color-gold)]" />
              <span className="truncate">{userName}</span>
            </div>
            <SignOutButton compact label={dictionary.common.signOut} />
          </div>
        </div>
        {role === Role.TEACHER ? (
          <div className="mt-4">
            <TeacherStudentSelector
              students={(teacherContextStudents?.students ?? []).map((assignment) => ({
                id: assignment.student.id,
                name: assignment.student.user.name,
                image: assignment.student.user.image,
                instrument: assignment.student.preferredInstrument,
              }))}
              selectedStudentId={validTeacherStudentId}
              locale={activeLocale}
            />
          </div>
        ) : null}
        <nav className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 md:mt-5">
          {items.map((item, index) => {
            const active = activePath === item.href;
            const href = withTeacherStudentContext(item.href, role, validTeacherStudentId);
            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "rounded-full px-3.5 py-2.5 text-sm whitespace-nowrap transition-all duration-200 sm:px-4",
                  active
                    ? "bg-[var(--color-gold)] text-white shadow-[var(--shadow-glow)]"
                    : "bg-white/72 text-[var(--color-ink-soft)] hover:bg-[var(--color-gold-soft)] hover:text-[var(--color-gold-deep)]",
                )}
              >
                <span className="inline-flex items-center gap-2">
                  {item.label}
                  {index === notificationIndex && unreadCount > 0 ? (
                    <span className="rounded-full bg-white/88 px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-gold-deep)]">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </span>
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="page-stack flex-1">{children}</main>
      <footer className="mt-6 pb-2 text-center text-xs tracking-[0.12em] text-[var(--color-ink-soft)] uppercase">
        Harmonizing {APP_VERSION}
      </footer>
    </div>
  );
}

function withTeacherStudentContext(href: string, role: Role, studentId?: string | null) {
  if (role !== Role.TEACHER || !studentId) return href;

  const contextualRoutes = ["/teacher/dashboard", "/teacher/requests", "/teacher/videos", "/teacher/progress", "/messages"];
  if (!contextualRoutes.includes(href)) return href;

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}studentId=${encodeURIComponent(studentId)}`;
}
