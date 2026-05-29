"use client";

import Link from "next/link";
import {
  Archive,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileSignature,
  GraduationCap,
  House,
  KeyRound,
  LayoutDashboard,
  Mail,
  Megaphone,
  Music2,
  ReceiptText,
  RefreshCcw,
  ScrollText,
  Settings,
  TrendingUp,
  UsersRound,
  Video,
} from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandLogo } from "@/components/brand/logo";
import { type AppShellNavGroup, type AppShellNavLink, type NavIconKey } from "@/components/ui/mobile-nav-drawer";
import { cn } from "@/lib/utils";

const ADMIN_SIDEBAR_STORAGE_KEY = "harmonizing:admin-sidebar-collapsed";
const ADMIN_SIDEBAR_STORAGE_EVENT = "harmonizing:admin-sidebar-collapsed-change";

type DesktopAppShellFrameProps = {
  navGroups: AppShellNavGroup[];
  userName: string;
  signOutLabel: string;
  version: string;
  homeHref: string;
  brandSubtitle: string;
  primaryNavigationLabel: string;
  collapsible?: boolean;
  collapseLabel: string;
  expandLabel: string;
  children: ReactNode;
};

export function DesktopAppShellFrame({
  navGroups,
  userName,
  signOutLabel,
  version,
  homeHref,
  brandSubtitle,
  primaryNavigationLabel,
  collapsible = false,
  collapseLabel,
  expandLabel,
  children,
}: DesktopAppShellFrameProps) {
  const collapsed = useSyncExternalStore(
    subscribeToSidebarPreference,
    () => (collapsible ? readSidebarPreference() : false),
    () => false,
  );

  function toggleCollapsed() {
    if (!collapsible) return;

    window.localStorage.setItem(ADMIN_SIDEBAR_STORAGE_KEY, String(!collapsed));
    window.dispatchEvent(new Event(ADMIN_SIDEBAR_STORAGE_EVENT));
  }

  return (
    <div
      className={cn(
        "mx-auto grid min-h-screen w-full max-w-[96rem] grid-cols-1 gap-4 px-3 pb-10 pt-3 transition-[grid-template-columns] duration-200 ease-out sm:px-4 lg:px-6 lg:pt-5",
        collapsed ? "lg:grid-cols-[5.25rem_minmax(0,1fr)]" : "lg:grid-cols-[17rem_minmax(0,1fr)]",
      )}
    >
      <aside
        id="desktop-app-sidebar"
        className={cn(
          "relative hidden h-[calc(100vh-2.5rem)] min-h-[38rem] flex-col overflow-y-auto rounded-[var(--radius-3xl)] border border-[var(--color-border)] bg-[linear-gradient(160deg,var(--color-paper-elevated),var(--color-surface-sidebar))] p-3.5 shadow-[var(--shadow-card)] backdrop-blur-[18px] transition-all duration-200 ease-out lg:sticky lg:top-5 lg:flex",
          collapsed && "items-center p-2.5",
        )}
      >
        <div className={cn("flex items-center gap-2", collapsed ? "w-full justify-center" : "justify-between")}>
          <Link
            href={homeHref}
            className={cn(
              "min-w-0 rounded-[1.55rem] p-1 transition duration-200 ease-out hover:bg-white/62 focus:ring-4 focus:ring-[var(--focus-ring)] focus:outline-none",
              collapsed && "flex justify-center",
            )}
            title={collapsed ? "Harmonizing" : undefined}
            aria-label={collapsed ? "Harmonizing" : undefined}
          >
            <BrandLogo compact={collapsed} subtitle={brandSubtitle} />
          </Link>

          {collapsible ? (
            <button
              type="button"
              aria-controls="desktop-app-sidebar"
              aria-expanded={!collapsed}
              aria-label={collapsed ? expandLabel : collapseLabel}
              title={collapsed ? expandLabel : collapseLabel}
              onClick={toggleCollapsed}
              className={cn(
                "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/76 text-[var(--color-ink-soft)] shadow-[0_10px_20px_rgba(78,55,30,0.045)] transition duration-200 ease-out hover:border-[color-mix(in_srgb,var(--color-gold)_35%,white)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-gold-deep)] focus:ring-4 focus:ring-[var(--focus-ring)] focus:outline-none",
                collapsed && "absolute top-4 right-2 z-10 bg-white/94",
              )}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" aria-hidden="true" /> : <ChevronLeft className="h-4 w-4" aria-hidden="true" />}
            </button>
          ) : null}
        </div>

        <div className={cn("mt-4 grid gap-2.5", collapsed && "w-full place-items-center")}>
          <SidebarUserBadge userName={userName} collapsed={collapsed} />
        </div>

        <nav className={cn("mt-5 w-full", collapsed ? "space-y-3" : "space-y-4")} aria-label={primaryNavigationLabel}>
          {navGroups.map((group) => (
            <ShellNavGroup key={group.label} group={group} collapsed={collapsed} />
          ))}
        </nav>

        <div className={cn("mt-auto grid w-full gap-3 pt-6", collapsed && "justify-items-center")}>
          <SignOutButton compact label={signOutLabel} className={cn(collapsed && "w-full px-0 text-[0.64rem]")} />
          <p
            className={cn(
              "pb-1 text-center text-[10px] tracking-[0.16em] text-[var(--color-ink-muted)] uppercase",
              collapsed && "tracking-[0.08em]",
            )}
            title={`Harmonizing ${version}`}
          >
            {collapsed ? version : `Harmonizing ${version}`}
          </p>
        </div>
      </aside>

      {children}
    </div>
  );
}

function readSidebarPreference() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ADMIN_SIDEBAR_STORAGE_KEY) === "true";
}

function subscribeToSidebarPreference(onStoreChange: () => void) {
  function handleStorageChange(event: StorageEvent | Event) {
    if (event instanceof StorageEvent && event.key !== ADMIN_SIDEBAR_STORAGE_KEY) return;
    onStoreChange();
  }

  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(ADMIN_SIDEBAR_STORAGE_EVENT, handleStorageChange);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(ADMIN_SIDEBAR_STORAGE_EVENT, handleStorageChange);
  };
}

function SidebarUserBadge({ userName, collapsed }: { userName: string; collapsed: boolean }) {
  if (collapsed) {
    return (
      <div
        title={userName}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-gold)_26%,white)] bg-white/80 font-semibold tracking-[0.08em] text-[var(--color-gold-deep)] uppercase shadow-[0_10px_20px_rgba(78,55,30,0.045)]"
      >
        {userName.trim().slice(0, 1) || "H"}
      </div>
    );
  }

  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-glass)] px-3 py-1.5 text-[11px] font-medium tracking-[0.08em] text-[var(--color-ink-soft)] uppercase shadow-[0_10px_20px_rgba(78,55,30,0.035)] transition duration-200 ease-out hover:border-[color-mix(in_srgb,var(--color-gold)_35%,white)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-gold-deep)] focus:ring-4 focus:ring-[var(--focus-ring)] focus:outline-none">
      <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-gold)]" />
      <span className="truncate">{userName}</span>
    </div>
  );
}

function ShellNavGroup({ group, collapsed }: { group: AppShellNavGroup; collapsed: boolean }) {
  return (
    <div className={cn("space-y-1.5", collapsed && "space-y-2")}>
      <p className={collapsed ? "sr-only" : "px-3 text-[0.62rem] font-semibold tracking-[0.22em] text-[var(--color-ink-muted)] uppercase"}>
        {group.label}
      </p>
      {collapsed ? <span className="mx-auto block h-px w-8 rounded-full bg-[var(--color-border)]" aria-hidden="true" /> : null}
      <div className="grid gap-1">
        {group.items.map((item) => (
          <ShellNavLink key={item.href} item={item} collapsed={collapsed} />
        ))}
      </div>
    </div>
  );
}

function ShellNavLink({ item, collapsed }: { item: AppShellNavLink; collapsed: boolean }) {
  const badgeLabel = item.badgeCount ? ` (${item.badgeCount > 99 ? "99+" : item.badgeCount})` : "";

  return (
    <Link
      href={item.href}
      aria-current={item.active ? "page" : undefined}
      aria-label={collapsed ? `${item.label}${badgeLabel}` : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "relative flex items-center overflow-hidden rounded-2xl border text-sm font-semibold transition-all duration-200 ease-out focus:ring-4 focus:ring-[var(--focus-ring)] focus:outline-none",
        collapsed ? "justify-center px-2 py-2.5" : "justify-between gap-3 px-3 py-2.5",
        item.active
          ? "border-[color-mix(in_srgb,var(--color-gold)_24%,white)] bg-[linear-gradient(135deg,rgba(255,255,255,0.9),var(--color-gold-soft))] text-[var(--color-ink)] shadow-[var(--shadow-active)]"
          : "border-transparent bg-transparent text-[var(--color-ink-soft)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-gold-deep)]",
      )}
    >
      <span className={cn("absolute inset-y-2 left-1 w-1 rounded-full transition-opacity", item.active ? "bg-[var(--color-gold)] opacity-100" : "opacity-0")} />
      <span className={cn("flex min-w-0 items-center", collapsed ? "justify-center" : "gap-3")}>
        <span
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 ease-out",
            item.active
              ? "border-[color-mix(in_srgb,var(--color-gold)_28%,white)] bg-white/86 text-[var(--color-gold-deep)] shadow-[0_8px_20px_rgba(135,83,29,0.12)]"
              : "border-[var(--color-border)] bg-white/64 text-[var(--color-ink-soft)]",
          )}
        >
          <NavIcon icon={item.icon} className="h-4 w-4" />
        </span>
        {!collapsed ? <span className="truncate">{item.label}</span> : null}
      </span>
      {item.badgeCount ? (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold",
            collapsed && "absolute top-1 right-1 px-1.5 py-0 text-[9px] shadow-[0_6px_14px_rgba(135,83,29,0.12)]",
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
  if (icon === "megaphone") return <Megaphone className={className} aria-hidden="true" />;
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
