"use client";

import Link from "next/link";
import { Megaphone, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ShellAnnouncement } from "@/lib/announcements";
import { cn } from "@/lib/utils";

export function AppAnnouncementBanner({ announcement, dismissLabel }: { announcement: ShellAnnouncement; dismissLabel: string }) {
  const [visible, setVisible] = useState(true);
  const [dismissing, setDismissing] = useState(false);

  if (!visible) return null;

  async function dismiss() {
    setDismissing(true);
    setVisible(false);
    try {
      await fetch(`/api/announcements/${announcement.id}/dismiss`, { method: "POST" });
    } catch {
      setVisible(true);
    } finally {
      setDismissing(false);
    }
  }

  return (
    <section
      aria-label={announcement.typeLabel}
      className={cn(
        "mb-4 overflow-hidden rounded-[var(--radius-2xl)] border border-[color-mix(in_srgb,var(--color-gold)_24%,var(--color-border))]",
        "[background:var(--background-active-nav)] px-4 py-3 shadow-[var(--shadow-card)]",
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--color-gold)_30%,var(--color-border))] bg-[var(--color-control-strong)] text-[var(--color-gold-deep)] shadow-[0_10px_24px_rgba(135,83,29,0.1)]">
            <Megaphone className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="gold">{announcement.typeLabel}</Badge>
              <h2 className="text-sm font-semibold tracking-[-0.01em] text-[var(--color-ink)] md:text-base">{announcement.title}</h2>
            </div>
            <p className="mt-1 text-sm leading-6 text-[var(--color-ink-soft)]">{announcement.body}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
          {announcement.ctaUrl && announcement.ctaLabel ? (
            <Link href={announcement.ctaUrl}>
              <Button type="button" variant="outline" size="sm">{announcement.ctaLabel}</Button>
            </Link>
          ) : null}
          <button
            type="button"
            onClick={dismiss}
            disabled={dismissing}
            aria-label={dismissLabel}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-control)] text-[var(--color-ink-soft)] transition hover:border-[color-mix(in_srgb,var(--color-gold)_35%,var(--color-border))] hover:text-[var(--color-gold-deep)] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)] disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
