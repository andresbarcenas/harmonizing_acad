import Link from "next/link";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import {
  Archive,
  Bell,
  CalendarDays,
  ClipboardList,
  Clock3,
  FileSignature,
  GraduationCap,
  House,
  KeyRound,
  LayoutDashboard,
  Mail,
  Music2,
  ReceiptText,
  RefreshCcw,
  ScrollText,
  Settings,
  TrendingUp,
  UsersRound,
  Video,
} from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandLogo } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { TimezoneSync } from "@/components/system/timezone-sync";
import { TeacherStudentSelector } from "@/components/teacher/student-context-selector";
import { MobileNavDrawer, type AppShellNavGroup, type AppShellNavLink, type NavIconKey } from "@/components/ui/mobile-nav-drawer";
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
  icon: NavIconKey;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

type BillingStatus = {
  label: string;
  title: string;
  live: boolean;
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
        { href: "/admin/access", label: nav.access, icon: "key" },
        { href: "/admin/consents", label: nav.consents, icon: "signature" },
      ],
    },
    {
      label: navGroups.learning,
      items: [
        { href: "/admin/progress", label: nav.progress, icon: "trending" },
        { href: "/admin/repertoire", label: nav.repertoire, icon: "music" },
        { href: "/admin/imports", label: nav.imports, icon: "archive" },
      ],
    },
    {
      label: navGroups.financeCommunication,
      items: [
        { href: "/admin/invoices", label: nav.billing, icon: "receipt" },
        { href: "/admin/emails", label: nav.emails, icon: "mail" },
        { href: "/notifications", label: nav.notifications, icon: "bell" },
      ],
    },
    {
      label: navGroups.system,
      items: [
        { href: "/admin/changelog", label: nav.changelog, icon: "scroll" },
        { href: "/settings", label: nav.settings, icon: "settings" },
      ],
    },
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
  const groups = navGroupsByRole(role, dictionary.shell);
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

  const navGroups: AppShellNavGroup[] = groups.map((group) => ({
    label: group.label,
    items: group.items.map((item) => ({
      href: withTeacherStudentContext(item.href, role, validTeacherStudentId),
      label: item.label,
      icon: item.icon,
      active: activePath === item.href,
      badgeCount: item.href === "/notifications" && unreadCount > 0 ? unreadCount : undefined,
    })),
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

        <nav className="mt-6 space-y-5" aria-label={mobileNavLabels.primaryNavigation}>
          {navGroups.map((group) => (
            <ShellNavGroup key={group.label} group={group} />
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
              userName={userName}
              locale={activeLocale}
              signOutLabel={dictionary.common.signOut}
              version={APP_VERSION}
              homeHref={homeHrefForRole(role, validTeacherStudentId)}
              labels={mobileNavLabels}
              billing={billing}
              settingsHref="/settings"
              groups={navGroups}
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
            <Link href="/settings" className="hidden max-w-[8rem] items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/75 px-3 py-2 text-[11px] font-medium tracking-[0.08em] text-[var(--color-ink-soft)] uppercase shadow-[0_10px_20px_rgba(78,55,30,0.04)] transition hover:border-[color-mix(in_srgb,var(--color-gold)_35%,white)] hover:text-[var(--color-gold-deep)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-gold)_16%,white)] focus:outline-none sm:inline-flex">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-gold)]" />
              <span className="truncate">{userName}</span>
            </Link>
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

function UserBadge({ userName, href }: { userName: string; href?: string }) {
  const className = "inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/75 px-3 py-2 text-xs font-medium tracking-[0.08em] text-[var(--color-ink-soft)] uppercase shadow-[0_10px_20px_rgba(78,55,30,0.04)] transition hover:border-[color-mix(in_srgb,var(--color-gold)_35%,white)] hover:text-[var(--color-gold-deep)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-gold)_16%,white)] focus:outline-none";
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

function ShellNavGroup({ group }: { group: AppShellNavGroup }) {
  return (
    <div className="space-y-2">
      <p className="px-3 text-[0.66rem] font-semibold tracking-[0.2em] text-[var(--color-gold-deep)] uppercase">
        {group.label}
      </p>
      <div className="grid gap-1.5">
        {group.items.map((item) => (
          <ShellNavLink key={item.href} item={item} />
        ))}
      </div>
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
      <span className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border",
            item.active ? "border-white/24 bg-white/16" : "border-[var(--color-border)] bg-white/70",
          )}
        >
          <NavIcon icon={item.icon} className="h-4 w-4" />
        </span>
        <span className="truncate">{item.label}</span>
      </span>
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

function NavIcon({ icon, className }: { icon: NavIconKey; className?: string }) {
  if (icon === "archive") return <Archive className={className} aria-hidden="true" />;
  if (icon === "bell") return <Bell className={className} aria-hidden="true" />;
  if (icon === "calendar") return <CalendarDays className={className} aria-hidden="true" />;
  if (icon === "clipboard") return <ClipboardList className={className} aria-hidden="true" />;
  if (icon === "clock") return <Clock3 className={className} aria-hidden="true" />;
  if (icon === "dashboard") return <LayoutDashboard className={className} aria-hidden="true" />;
  if (icon === "graduation") return <GraduationCap className={className} aria-hidden="true" />;
  if (icon === "house") return <House className={className} aria-hidden="true" />;
  if (icon === "key") return <KeyRound className={className} aria-hidden="true" />;
  if (icon === "mail") return <Mail className={className} aria-hidden="true" />;
  if (icon === "music") return <Music2 className={className} aria-hidden="true" />;
  if (icon === "receipt") return <ReceiptText className={className} aria-hidden="true" />;
  if (icon === "refresh") return <RefreshCcw className={className} aria-hidden="true" />;
  if (icon === "scroll") return <ScrollText className={className} aria-hidden="true" />;
  if (icon === "settings") return <Settings className={className} aria-hidden="true" />;
  if (icon === "signature") return <FileSignature className={className} aria-hidden="true" />;
  if (icon === "trending") return <TrendingUp className={className} aria-hidden="true" />;
  if (icon === "users") return <UsersRound className={className} aria-hidden="true" />;
  return <Video className={className} aria-hidden="true" />;
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
