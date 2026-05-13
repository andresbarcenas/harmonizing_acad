import Link from "next/link";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandLogo } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { TimezoneSync } from "@/components/system/timezone-sync";
import { TeacherStudentSelector } from "@/components/teacher/student-context-selector";
import { MobileNavDrawer, type AppShellNavLink } from "@/components/ui/mobile-nav-drawer";
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

type BillingStatus = {
  label: string;
  title: string;
  live: boolean;
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
    { href: "/teacher/schedule", label: nav.schedule },
    { href: "/teacher/requests", label: nav.reschedules },
    { href: "/teacher/videos", label: nav.videos },
    { href: "/teacher/progress", label: nav.progress },
    { href: "/messages", label: nav.messages },
    { href: "/notifications", label: nav.notifications },
  ];
  const adminNav: NavItem[] = [
    { href: "/admin/dashboard", label: nav.overview },
    { href: "/admin/schedule", label: nav.schedule },
    { href: "/admin/invoices", label: nav.billing },
    { href: "/admin/teachers", label: nav.teachers },
    { href: "/admin/students", label: nav.students },
    { href: "/admin/assignments", label: nav.assignments },
    { href: "/admin/availability", label: nav.availability },
    { href: "/admin/progress", label: nav.progress },
    { href: "/admin/imports", label: nav.imports },
    { href: "/admin/changelog", label: nav.changelog },
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
  const billing: BillingStatus = {
    label: alegraConfigured ? dictionary.shell.billingLive : dictionary.shell.billingDemo,
    title: alegraConfigured ? dictionary.shell.billingLiveTitle : dictionary.shell.billingDemoTitle,
    live: alegraConfigured,
  };
  const mobileNavLabels = activeLocale === "es"
    ? {
        openMenu: "Abrir menú de navegación",
        closeMenu: "Cerrar menú de navegación",
        navigationMenu: "Menú de navegación",
        primaryNavigation: "Navegación principal",
      }
    : {
        openMenu: "Open navigation menu",
        closeMenu: "Close navigation menu",
        navigationMenu: "Navigation menu",
        primaryNavigation: "Primary navigation",
      };
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

  const navLinks: AppShellNavLink[] = items.map((item, index) => ({
    href: withTeacherStudentContext(item.href, role, validTeacherStudentId),
    label: item.label,
    active: activePath === item.href,
    badgeCount: index === notificationIndex && unreadCount > 0 ? unreadCount : undefined,
  }));

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-[96rem] grid-cols-1 gap-4 px-3 pb-10 pt-3 sm:px-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:px-6 lg:pt-6">
      <TimezoneSync />
      <aside className="hidden h-[calc(100vh-3rem)] min-h-[38rem] flex-col overflow-y-auto rounded-[var(--radius-3xl)] border border-[var(--color-border)] bg-[linear-gradient(160deg,rgba(255,255,255,0.9),rgba(252,247,241,0.76))] p-4 shadow-[var(--shadow-card)] backdrop-blur-[18px] lg:sticky lg:top-6 lg:flex">
        <Link href={homeHrefForRole(role, validTeacherStudentId)} className="rounded-[1.6rem] p-1 transition hover:bg-white/60 focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-gold)_16%,white)] focus:outline-none">
          <BrandLogo compact={false} />
        </Link>

        <div className="mt-5 grid gap-3">
          <BillingStatusBadge billing={billing} />
          <UserBadge userName={userName} />
        </div>

        <nav className="mt-6 grid gap-2" aria-label={mobileNavLabels.primaryNavigation}>
          {navLinks.map((item) => (
            <ShellNavLink key={item.href} item={item} />
          ))}
        </nav>

        <div className="mt-auto grid gap-3 pt-6">
          <SignOutButton compact label={dictionary.common.signOut} />
          <p className="pb-1 text-center text-[10px] tracking-[0.16em] text-[var(--color-ink-muted)] uppercase">
            Harmonizing {APP_VERSION}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="mb-5 rounded-[var(--radius-3xl)] border border-[var(--color-border)] bg-[linear-gradient(145deg,rgba(255,255,255,0.86),rgba(252,247,241,0.72))] px-3 py-3.5 shadow-[var(--shadow-card)] backdrop-blur-[18px] sm:px-4 md:mb-6 md:px-6 md:py-4 lg:sticky lg:top-6 lg:z-20">
          <div className="flex min-w-0 items-center justify-between gap-3 lg:hidden">
            <MobileNavDrawer
              items={navLinks}
              userName={userName}
              locale={activeLocale}
              signOutLabel={dictionary.common.signOut}
              version={APP_VERSION}
              homeHref={homeHrefForRole(role, validTeacherStudentId)}
              labels={mobileNavLabels}
              billing={billing}
            />
            <Link href={homeHrefForRole(role, validTeacherStudentId)} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl transition focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-gold)_16%,white)] focus:outline-none">
              <BrandLogo compact />
              <div className="min-w-0">
                <p className="truncate font-display text-[1.45rem] leading-none tracking-[-0.04em] text-[var(--color-ink)]">
                  harmoni<span className="text-[var(--color-gold)]">zing</span>
                </p>
                <p className="mt-0.5 truncate text-[0.52rem] tracking-[0.28em] text-[var(--color-ink-muted)] uppercase">Academia musical</p>
              </div>
            </Link>
            <div className="hidden max-w-[8rem] items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/75 px-3 py-2 text-[11px] font-medium tracking-[0.08em] text-[var(--color-ink-soft)] uppercase shadow-[0_10px_20px_rgba(78,55,30,0.04)] sm:inline-flex">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-gold)]" />
              <span className="truncate">{userName}</span>
            </div>
          </div>

          <div className="hidden items-center justify-between gap-4 lg:flex">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-[var(--color-gold-deep)] uppercase">
                Harmonizing
              </p>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{billing.title}</p>
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
              <BillingStatusBadge billing={billing} />
              <LanguageToggle locale={activeLocale} authenticated compact />
              <UserBadge userName={userName} />
            </div>
          </div>

          {role === Role.TEACHER ? (
            <div className="mt-4 flex min-w-0 lg:justify-end">
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
        </header>

        <main className="page-stack min-w-0 flex-1">{children}</main>
        <footer className="mt-6 pb-2 text-center text-xs tracking-[0.12em] text-[var(--color-ink-soft)] uppercase lg:hidden">
          Harmonizing {APP_VERSION}
        </footer>
      </div>
    </div>
  );
}

function BillingStatusBadge({ billing }: { billing: BillingStatus }) {
  return (
    <div
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold tracking-[0.08em] uppercase",
        billing.live ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700",
      )}
      title={billing.title}
    >
      <span className={cn("h-2 w-2 rounded-full", billing.live ? "bg-emerald-500" : "bg-amber-500")} />
      <span>{billing.label}</span>
    </div>
  );
}

function UserBadge({ userName }: { userName: string }) {
  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/75 px-3 py-2 text-xs font-medium tracking-[0.08em] text-[var(--color-ink-soft)] uppercase shadow-[0_10px_20px_rgba(78,55,30,0.04)]">
      <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-gold)]" />
      <span className="truncate">{userName}</span>
    </div>
  );
}

function ShellNavLink({ item }: { item: AppShellNavLink }) {
  return (
    <Link
      href={item.href}
      aria-current={item.active ? "page" : undefined}
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200",
        item.active
          ? "bg-[var(--color-gold)] text-white shadow-[var(--shadow-glow)]"
          : "bg-white/72 text-[var(--color-ink-soft)] hover:bg-[var(--color-gold-soft)] hover:text-[var(--color-gold-deep)]",
      )}
    >
      <span>{item.label}</span>
      {item.badgeCount ? (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold",
            item.active ? "bg-white/90 text-[var(--color-gold-deep)]" : "bg-[var(--color-gold-soft)] text-[var(--color-gold-deep)]",
          )}
        >
          {item.badgeCount > 99 ? "99+" : item.badgeCount}
        </span>
      ) : null}
    </Link>
  );
}

function homeHrefForRole(role: Role, studentId?: string | null) {
  if (role === Role.STUDENT) return "/dashboard";
  if (role === Role.TEACHER) return withTeacherStudentContext("/teacher/dashboard", role, studentId);
  return "/admin/dashboard";
}

function withTeacherStudentContext(href: string, role: Role, studentId?: string | null) {
  if (role !== Role.TEACHER || !studentId) return href;

  const contextualRoutes = ["/teacher/dashboard", "/teacher/schedule", "/teacher/requests", "/teacher/videos", "/teacher/progress", "/messages"];
  if (!contextualRoutes.includes(href)) return href;

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}studentId=${encodeURIComponent(studentId)}`;
}
