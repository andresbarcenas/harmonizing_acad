"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandLogo } from "@/components/brand/logo";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { type AppLocale } from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

export type AppShellNavLink = {
  href: string;
  label: string;
  active: boolean;
  badgeCount?: number;
};

type MobileNavDrawerProps = {
  items: AppShellNavLink[];
  userName: string;
  locale: AppLocale;
  signOutLabel: string;
  version: string;
  homeHref: string;
  labels: {
    openMenu: string;
    closeMenu: string;
    navigationMenu: string;
    primaryNavigation: string;
  };
  settingsHref?: string;
  billing: {
    label: string;
    title: string;
    live: boolean;
  };
};

export function MobileNavDrawer({ items, userName, locale, signOutLabel, version, homeHref, labels, settingsHref, billing }: MobileNavDrawerProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const drawer = open && typeof document !== "undefined"
    ? createPortal(
        <div className="fixed inset-0 z-[1000] h-[100svh] min-h-dvh w-screen overflow-hidden lg:hidden">
          <button
            type="button"
            aria-label={labels.closeMenu}
            className="absolute inset-0 bg-[rgba(33,29,26,0.38)] backdrop-blur-[6px]"
            onClick={() => setOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={labels.navigationMenu}
            className="relative flex h-[100svh] min-h-dvh w-full flex-col overflow-hidden border-r border-[var(--color-border)] bg-[linear-gradient(155deg,rgba(255,255,255,0.97),rgba(252,247,241,0.94))] px-[max(1rem,env(safe-area-inset-left))] pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_32px_80px_rgba(45,34,24,0.28)] sm:w-[22rem] sm:max-w-[calc(100dvw-2rem)] sm:px-4 sm:py-4"
          >
            <div className="flex shrink-0 items-center justify-between gap-3">
              <Link href={homeHref} onClick={() => setOpen(false)} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl transition focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-gold)_16%,white)] focus:outline-none">
                <BrandLogo compact />
                <div className="min-w-0">
                  <p className="truncate font-display text-[1.55rem] leading-none tracking-[-0.04em] text-[var(--color-ink)]">
                    harmoni<span className="text-[var(--color-gold)]">zing</span>
                  </p>
                  <p className="mt-0.5 truncate text-[0.52rem] tracking-[0.28em] text-[var(--color-ink-muted)] uppercase">
                    Academia musical
                  </p>
                </div>
              </Link>
              <button
                type="button"
                aria-label={labels.closeMenu}
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/82 text-[var(--color-ink-soft)] transition hover:text-[var(--color-gold-deep)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-gold)_16%,white)] focus:outline-none"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 grid shrink-0 gap-3">
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
              <Link
                href={settingsHref ?? "/settings"}
                onClick={() => setOpen(false)}
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/78 px-3 py-2 text-xs font-medium tracking-[0.08em] text-[var(--color-ink-soft)] uppercase shadow-[0_10px_20px_rgba(78,55,30,0.04)] transition hover:border-[color-mix(in_srgb,var(--color-gold)_35%,white)] hover:text-[var(--color-gold-deep)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-gold)_16%,white)] focus:outline-none"
              >
                <span className="h-2 w-2 rounded-full bg-[var(--color-gold)]" />
                <span className="truncate">{userName}</span>
              </Link>
              <LanguageToggle locale={locale} authenticated compact />
            </div>

            <nav className="mt-5 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pr-1" aria-label={labels.primaryNavigation}>
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
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
              ))}
            </nav>

            <div className="grid shrink-0 gap-3 pt-4">
              <SignOutButton label={signOutLabel} />
              <p className="pb-2 text-center text-[10px] tracking-[0.16em] text-[var(--color-ink-muted)] uppercase">
                Harmonizing {version}
              </p>
            </div>
          </aside>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        type="button"
        aria-label={labels.openMenu}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-white/84 text-[var(--color-ink)] shadow-[0_12px_26px_rgba(78,55,30,0.08)] transition hover:border-[color-mix(in_srgb,var(--color-gold)_35%,white)] hover:text-[var(--color-gold-deep)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--color-gold)_16%,white)] focus:outline-none lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {drawer}
    </>
  );
}
