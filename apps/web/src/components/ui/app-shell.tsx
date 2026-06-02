import Link from "next/link";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { AppAnnouncementBanner } from "@/components/announcements/app-announcement-banner";
import { BrandLogo } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { ParentStudentSelector } from "@/components/parent/student-selector";
import { ThemeToggle } from "@/components/system/theme-toggle";
import { TeacherStudentSelector } from "@/components/teacher/student-context-selector";
import { DesktopAppShellFrame } from "@/components/ui/desktop-app-shell-frame";
import { MobileNavDrawer, type AppShellNavGroup, type NavIconKey } from "@/components/ui/mobile-nav-drawer";
import { getActiveAnnouncementForViewer, type ShellAnnouncement } from "@/lib/announcements";
import { resolveActiveImpersonation } from "@/lib/admin-impersonation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDictionary } from "@/lib/i18n/dictionary";
import { normalizeLocale, type AppLocale } from "@/lib/i18n/locales";
import { APP_VERSION } from "@/lib/release";

type NavItem = {
  href: string;
  label: string;
  icon: NavIconKey;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

function navGroupsByRole(role: Role, shell: ReturnType<typeof getDictionary>["shell"]): NavGroup[] {
  const { nav, navGroups } = shell;
  const studentNav: NavGroup[] = [
    {
      label: navGroups.start,
      items: [
        { href: "/dashboard", label: nav.home, icon: "house" },
        { href: "/schedule", label: nav.schedule, icon: "calendar" },
      ],
    },
    {
      label: navGroups.learning,
      items: [
        { href: "/videos", label: nav.practice, icon: "video" },
        { href: "/progress", label: nav.progress, icon: "trending" },
        { href: "/repertoire", label: nav.repertoire, icon: "music" },
        { href: "/exams", label: nav.exams, icon: "clipboard" },
      ],
    },
    {
      label: navGroups.account,
      items: [
        { href: "/invoices", label: nav.invoices, icon: "receipt" },
        { href: "/messages", label: nav.messages, icon: "mail" },
        { href: "/notifications", label: nav.notifications, icon: "bell" },
        { href: "/settings", label: nav.profile, icon: "settings" },
      ],
    },
  ];
  const teacherNav: NavGroup[] = [
    {
      label: navGroups.classes,
      items: [
        { href: "/teacher/dashboard", label: nav.today, icon: "calendar" },
        { href: "/teacher/schedule", label: nav.schedule, icon: "calendar" },
        { href: "/teacher/availability", label: nav.availability, icon: "clock" },
        { href: "/teacher/requests", label: nav.reschedules, icon: "refresh" },
      ],
    },
    {
      label: navGroups.learning,
      items: [
        { href: "/teacher/videos", label: nav.videos, icon: "video" },
        { href: "/teacher/progress", label: nav.progress, icon: "trending" },
        { href: "/teacher/progress/exams", label: nav.examAssessments, icon: "clipboard" },
        { href: "/teacher/progress/reports", label: nav.progressReports, icon: "scroll" },
        { href: "/teacher/repertoire", label: nav.repertoire, icon: "music" },
      ],
    },
    {
      label: navGroups.communication,
      items: [
        { href: "/messages", label: nav.messages, icon: "mail" },
        { href: "/notifications", label: nav.notifications, icon: "bell" },
        { href: "/settings", label: nav.profile, icon: "settings" },
      ],
    },
  ];
  const parentNav: NavGroup[] = [
    {
      label: navGroups.start,
      items: [
        { href: "/parent/dashboard", label: nav.home, icon: "house" },
        { href: "/parent/schedule", label: nav.schedule, icon: "calendar" },
      ],
    },
    {
      label: navGroups.learning,
      items: [
        { href: "/parent/videos", label: nav.practice, icon: "video" },
        { href: "/parent/progress", label: nav.progress, icon: "trending" },
        { href: "/parent/repertoire", label: nav.repertoire, icon: "music" },
        { href: "/parent/exams", label: nav.exams, icon: "clipboard" },
      ],
    },
    {
      label: navGroups.account,
      items: [
        { href: "/parent/invoices", label: nav.invoices, icon: "receipt" },
        { href: "/messages", label: nav.messages, icon: "mail" },
        { href: "/notifications", label: nav.notifications, icon: "bell" },
        { href: "/settings", label: nav.profile, icon: "settings" },
      ],
    },
  ];
  const adminNav: NavGroup[] = [
    {
      label: navGroups.operations,
      items: [
        { href: "/admin/dashboard", label: nav.overview, icon: "dashboard" },
        { href: "/admin/schedule", label: nav.schedule, icon: "calendar" },
        { href: "/admin/availability", label: nav.availability, icon: "clock" },
        { href: "/admin/assignments", label: nav.assignments, icon: "clipboard" },
      ],
    },
    {
      label: navGroups.people,
      items: [
        { href: "/admin/students", label: nav.students, icon: "graduation" },
        { href: "/admin/teachers", label: nav.teachers, icon: "users" },
        { href: "/admin/guardians", label: nav.guardians, icon: "users" },
        { href: "/admin/access", label: nav.access, icon: "key" },
        { href: "/admin/consents", label: nav.consents, icon: "signature" },
      ],
    },
    {
      label: navGroups.learning,
      items: [
        { href: "/admin/progress", label: nav.progress, icon: "trending" },
        { href: "/admin/skills", label: nav.skills, icon: "clipboard" },
        { href: "/admin/repertoire", label: nav.repertoire, icon: "music" },
        { href: "/admin/imports", label: nav.imports, icon: "archive" },
      ],
    },
    {
      label: navGroups.financeCommunication,
      items: [
        { href: "/admin/invoices", label: nav.billing, icon: "receipt" },
        { href: "/admin/alegra", label: nav.alegra, icon: "receipt" },
        { href: "/admin/announcements", label: nav.announcements, icon: "megaphone" },
        { href: "/admin/emails", label: nav.emails, icon: "mail" },
        { href: "/notifications", label: nav.notifications, icon: "bell" },
      ],
    },
    {
      label: navGroups.system,
      items: [
        { href: "/admin/health", label: nav.health, icon: "health" },
        { href: "/admin/changelog", label: nav.changelog, icon: "scroll" },
        { href: "/settings", label: nav.settings, icon: "settings" },
      ],
    },
  ];

  if (role === Role.TEACHER) return teacherNav;
  if (role === Role.ADMIN) return adminNav;
  if (role === Role.PARENT) return parentNav;
  return studentNav;
}

export async function AppShell({
  role,
  activePath,
  userName,
  locale,
  selectedTeacherStudentId,
  selectedParentStudentId,
  children,
}: {
  role: Role;
  activePath: string;
  userName: string;
  locale?: AppLocale;
  selectedTeacherStudentId?: string | null;
  selectedParentStudentId?: string | null;
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const activeLocale = normalizeLocale(locale ?? session?.user?.locale);
  const dictionary = getDictionary(activeLocale);
  const groups = navGroupsByRole(role, dictionary.shell);
  const realShellUser = session?.user?.id
    ? await db.user.findUnique({
        where: { id: session.user.id },
        include: { studentProfile: true, teacherProfile: true, parentGuardianProfile: true },
      })
    : null;
  const impersonation = realShellUser ? await resolveActiveImpersonation(realShellUser) : null;
  const effectiveUserId = impersonation?.targetUserId ?? session?.user?.id;
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
  const teacherContextStudents = role === Role.TEACHER && effectiveUserId
    ? await db.teacherProfile.findUnique({
        where: { userId: effectiveUserId },
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
  const parentContextStudents = role === Role.PARENT && effectiveUserId
    ? await db.parentGuardianProfile.findUnique({
        where: { userId: effectiveUserId },
        include: {
          students: {
            include: { student: { include: { user: true } } },
            orderBy: [{ primaryContact: "desc" }, { student: { user: { name: "asc" } } }],
          },
        },
      })
    : null;
  const validParentStudentId = parentContextStudents?.students.some((link) => link.studentId === selectedParentStudentId)
    ? selectedParentStudentId
    : parentContextStudents?.students[0]?.studentId ?? null;

  let unreadCount = 0;
  let announcement: ShellAnnouncement | null = null;
  if (effectiveUserId) {
    [unreadCount, announcement] = await Promise.all([
      db.notification.count({
        where: { userId: effectiveUserId, readAt: null },
      }),
      getActiveAnnouncementForViewer({
        userId: effectiveUserId,
        role,
        locale: activeLocale,
      }),
    ]);
  }

  const navGroups: AppShellNavGroup[] = groups.map((group) => ({
    label: group.label,
    items: group.items.map((item) => ({
      href: withParentStudentContext(withTeacherStudentContext(item.href, role, validTeacherStudentId), role, validParentStudentId),
      label: item.label,
      icon: item.icon,
      active: activePath === item.href,
      badgeCount: item.href === "/notifications" && unreadCount > 0 ? unreadCount : undefined,
    })),
  }));
  const homeHref = homeHrefForRole(role, validTeacherStudentId, validParentStudentId);

  return (
    <DesktopAppShellFrame
      navGroups={navGroups}
      userName={userName}
      signOutLabel={dictionary.common.signOut}
      version={APP_VERSION}
      homeHref={homeHref}
      brandSubtitle={dictionary.shell.brandSubtitle}
      primaryNavigationLabel={mobileNavLabels.primaryNavigation}
      collapsible={role === Role.ADMIN}
      collapseLabel={dictionary.shell.collapseMenu}
      expandLabel={dictionary.shell.expandMenu}
    >
      <div className="flex min-w-0 flex-col">
        <header className="mb-4 rounded-[var(--radius-3xl)] border border-[var(--color-border)] bg-[linear-gradient(145deg,var(--color-paper-elevated),var(--color-surface-glass))] px-3 py-3 shadow-[var(--shadow-card)] backdrop-blur-[18px] sm:px-4 md:mb-5 md:px-5 md:py-3.5 lg:sticky lg:top-5 lg:z-20">
          <div className="flex min-w-0 items-center justify-between gap-3 lg:hidden">
            <MobileNavDrawer
              userName={userName}
              locale={activeLocale}
              signOutLabel={dictionary.common.signOut}
              version={APP_VERSION}
              homeHref={homeHref}
              brandSubtitle={dictionary.shell.brandSubtitle}
              labels={mobileNavLabels}
              settingsHref="/settings"
              groups={navGroups}
              showLanguageToggle={!impersonation}
              showThemeToggle={!impersonation}
            />
            <Link href={homeHref} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl transition focus:ring-4 focus:ring-[var(--focus-ring)] focus:outline-none">
              <BrandLogo compact subtitle={dictionary.shell.brandSubtitle} />
              <div className="min-w-0">
                <p className="truncate font-display text-[1.45rem] leading-none tracking-[-0.04em] text-[var(--color-ink)]">
                  harmoni<span className="text-[var(--color-gold)]">zing</span>
                </p>
                <p className="mt-0.5 truncate text-[0.52rem] tracking-[0.28em] text-[var(--color-ink-muted)] uppercase">{dictionary.shell.brandSubtitle}</p>
              </div>
            </Link>
            <Link href="/settings" className="hidden max-w-[8rem] items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-glass)] px-3 py-2 text-[11px] font-medium tracking-[0.08em] text-[var(--color-ink-soft)] uppercase shadow-[0_10px_20px_rgba(78,55,30,0.04)] transition hover:border-[color-mix(in_srgb,var(--color-gold)_35%,var(--color-border))] hover:text-[var(--color-gold-deep)] focus:ring-4 focus:ring-[var(--focus-ring)] focus:outline-none sm:inline-flex">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-gold)]" />
              <span className="truncate">{userName}</span>
            </Link>
          </div>

          <div className="hidden items-center justify-between gap-4 lg:flex">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.2em] text-[var(--color-gold-deep)] uppercase">
                Harmonizing
              </p>
              <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{dictionary.shell.brandSubtitle}</p>
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
              {!impersonation ? <ThemeToggle locale={activeLocale} compact /> : null}
              {!impersonation ? <LanguageToggle locale={activeLocale} authenticated compact /> : null}
              <UserBadge userName={userName} href="/settings" />
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
          {role === Role.PARENT ? (
            <div className="mt-4 flex min-w-0 lg:justify-end">
              <ParentStudentSelector
                students={(parentContextStudents?.students ?? []).map((link) => ({
                  id: link.student.id,
                  name: link.student.user.name,
                  image: link.student.user.image,
                  instrument: link.student.preferredInstrument,
                  relationship: link.relationship,
                }))}
                selectedStudentId={validParentStudentId}
                locale={activeLocale}
              />
            </div>
          ) : null}
        </header>

        {impersonation ? (
          <ImpersonationBanner
            targetName={impersonation.targetName}
            adminName={impersonation.adminName}
            expiresAt={impersonation.expiresAt.toISOString()}
            locale={activeLocale}
          />
        ) : null}

        {announcement ? (
          <AppAnnouncementBanner announcement={announcement} dismissLabel={dictionary.shell.dismissAnnouncement} />
        ) : null}

        <main className="page-stack min-w-0 flex-1">{children}</main>
        <footer className="mt-6 pb-2 text-center text-xs tracking-[0.12em] text-[var(--color-ink-soft)] uppercase lg:hidden">
          Harmonizing {APP_VERSION}
        </footer>
      </div>
    </DesktopAppShellFrame>
  );
}

function UserBadge({ userName, href }: { userName: string; href?: string }) {
  const className = "inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-glass)] px-3 py-1.5 text-[11px] font-medium tracking-[0.08em] text-[var(--color-ink-soft)] uppercase shadow-[0_10px_20px_rgba(78,55,30,0.035)] transition duration-200 ease-out hover:border-[color-mix(in_srgb,var(--color-gold)_35%,var(--color-border))] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-gold-deep)] focus:ring-4 focus:ring-[var(--focus-ring)] focus:outline-none";
  const content = (
    <>
      <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-gold)]" />
      <span className="truncate">{userName}</span>
    </>
  );

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

function homeHrefForRole(role: Role, teacherStudentId?: string | null, parentStudentId?: string | null) {
  if (role === Role.STUDENT) return "/dashboard";
  if (role === Role.TEACHER) return withTeacherStudentContext("/teacher/dashboard", role, teacherStudentId);
  if (role === Role.PARENT) return withParentStudentContext("/parent/dashboard", role, parentStudentId);
  return "/admin/dashboard";
}

function withTeacherStudentContext(href: string, role: Role, studentId?: string | null) {
  if (role !== Role.TEACHER || !studentId) return href;

  const contextualRoutes = ["/teacher/dashboard", "/teacher/schedule", "/teacher/requests", "/teacher/videos", "/teacher/progress", "/teacher/progress/exams", "/teacher/progress/reports", "/messages"];
  if (!contextualRoutes.includes(href)) return href;

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}studentId=${encodeURIComponent(studentId)}`;
}

function withParentStudentContext(href: string, role: Role, studentId?: string | null) {
  if (role !== Role.PARENT || !studentId) return href;

  const contextualRoutes = ["/parent/dashboard", "/parent/schedule", "/parent/videos", "/parent/progress", "/parent/repertoire", "/parent/exams", "/parent/invoices", "/messages", "/consent"];
  const pathname = href.split("?")[0];
  if (!contextualRoutes.includes(pathname)) return href;

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}studentId=${encodeURIComponent(studentId)}`;
}
