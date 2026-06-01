import Link from "next/link";
import type { SessionStatus } from "@prisma/client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CancelPendingClassButton } from "@/components/teacher/cancel-pending-class-button";
import { classStatusLabel, classTypeLabel } from "@/lib/class-session-labels";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";
import { intlLocale, type AppLocale } from "@/lib/i18n/locales";

export type ClassSessionListItem = {
  id: string;
  startsAtUtc: Date;
  endsAtUtc: Date;
  type: string;
  status: SessionStatus;
  primaryName: string;
  primaryImage?: string | null;
  secondaryName?: string | null;
  viewerTimezone: string;
  studentTimezone: string;
  teacherTimezone?: string | null;
  lessonFocus?: string | null;
  attachmentCount?: number;
  detailHref: string;
  completeHref?: string;
  rescheduleHref?: string;
  canCancelPending?: boolean;
};

type DayGroup = {
  key: string;
  label: string;
  accent: (typeof dayAccents)[number];
  sessions: ClassSessionListItem[];
};

const dayAccents = [
  {
    header: "border-[color-mix(in_srgb,var(--color-gold)_20%,var(--color-border))] bg-[var(--color-surface-inset)]",
    chip: "border-[color-mix(in_srgb,var(--color-gold)_28%,var(--color-border))] bg-[var(--color-gold-soft)] text-[var(--color-ink)]",
    rail: "bg-[var(--color-gold)]",
  },
  {
    header: "border-[color-mix(in_srgb,var(--color-gold)_18%,var(--color-border))] bg-[var(--color-surface-glass)]",
    chip: "border-[color-mix(in_srgb,var(--color-gold)_24%,var(--color-border))] bg-[var(--color-surface-inset)] text-[var(--color-ink)]",
    rail: "bg-[color-mix(in_srgb,var(--color-gold)_82%,var(--color-ink-muted))]",
  },
  {
    header: "border-[color-mix(in_srgb,var(--color-gold)_16%,var(--color-border))] bg-[var(--color-paper-frost)]",
    chip: "border-[color-mix(in_srgb,var(--color-gold)_20%,var(--color-border))] bg-[var(--color-control)] text-[var(--color-ink)]",
    rail: "bg-[color-mix(in_srgb,var(--color-gold)_66%,var(--color-ink-muted))]",
  },
  {
    header: "border-[color-mix(in_srgb,var(--color-gold)_22%,var(--color-border))] bg-[var(--color-surface-inset)]",
    chip: "border-[color-mix(in_srgb,var(--color-gold)_26%,var(--color-border))] bg-[var(--color-gold-soft)] text-[var(--color-ink)]",
    rail: "bg-[color-mix(in_srgb,var(--color-gold)_88%,var(--color-paper))]",
  },
  {
    header: "border-[color-mix(in_srgb,var(--color-gold)_14%,var(--color-border))] bg-[var(--color-surface-glass)]",
    chip: "border-[color-mix(in_srgb,var(--color-gold)_18%,var(--color-border))] bg-[var(--color-control)] text-[var(--color-ink)]",
    rail: "bg-[color-mix(in_srgb,var(--color-gold)_54%,var(--color-ink-muted))]",
  },
] as const;

export function ClassSessionDayList({
  sessions,
  locale,
  emptyText,
  showTeacherTime = false,
}: {
  sessions: ClassSessionListItem[];
  locale: AppLocale;
  emptyText: string;
  showTeacherTime?: boolean;
}) {
  const groups = groupSessionsByDay(sessions, locale);

  if (!groups.length) {
    return <p className="text-sm text-[var(--color-ink-soft)]">{emptyText}</p>;
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.key} className="space-y-2">
          <div className={`rounded-[1.25rem] border px-4 py-3 shadow-[var(--shadow-card)] ${group.accent.header}`}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-display text-2xl font-normal tracking-[-0.04em] text-[var(--color-ink)]">{group.label}</h3>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
                {group.sessions.length} {locale === "es" ? (group.sessions.length === 1 ? "clase" : "clases") : (group.sessions.length === 1 ? "class" : "classes")}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {group.sessions.map((session) => (
              <ClassSessionRow key={session.id} session={session} locale={locale} accent={group.accent} showTeacherTime={showTeacherTime} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ClassSessionRow({
  session,
  locale,
  accent,
  showTeacherTime,
}: {
  session: ClassSessionListItem;
  locale: AppLocale;
  accent: (typeof dayAccents)[number];
  showTeacherTime: boolean;
}) {
  const durationMinutes = Math.round((session.endsAtUtc.getTime() - session.startsAtUtc.getTime()) / 60000);
  const viewerTime = formatTimeOnly(session.startsAtUtc, session.viewerTimezone, locale);
  const studentTime = formatTimeOnly(session.startsAtUtc, session.studentTimezone, locale);
  const teacherTime = session.teacherTimezone ? formatTimeOnly(session.startsAtUtc, session.teacherTimezone, locale) : null;

  return (
    <div className="interactive-lift relative overflow-hidden rounded-[1.25rem] border border-[var(--color-border)] bg-[var(--color-paper-elevated)] p-4 shadow-[0_10px_30px_rgba(90,64,33,0.04)] hover:border-[color-mix(in_srgb,var(--color-gold)_24%,var(--color-border))]">
      <div className={`absolute inset-y-0 left-0 w-1.5 ${accent.rail}`} />
      <div className="flex flex-col gap-4 pl-1 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start">
          <div className={`w-fit shrink-0 rounded-[1.05rem] border px-4 py-3 text-center shadow-[var(--shadow-active)] ${accent.chip}`}>
            <p className="font-display text-3xl leading-none tracking-[-0.05em]">{viewerTime}</p>
            <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] opacity-75">{durationMinutes} min</p>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              {session.primaryImage !== undefined ? <Avatar src={session.primaryImage} alt={session.primaryName} fallback={session.primaryName.slice(0, 1)} className="h-8 w-8 text-[10px]" locale={locale} /> : null}
              <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                {session.primaryName}{session.secondaryName ? ` · ${session.secondaryName}` : ""}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant={session.type === "RECURRING" ? "default" : "gold"}>{classTypeLabel(session.type, locale)}</Badge>
              <Badge variant={session.status === "CANCELLED" ? "danger" : session.status === "COMPLETED" ? "success" : "default"}>{classStatusLabel(session.status, locale)}</Badge>
            </div>
            <div className="metadata-row mt-2 grid gap-1">
              <p>{locale === "es" ? "Hora estudiante" : "Student time"}: {studentTime} ({session.studentTimezone})</p>
              {showTeacherTime && teacherTime && session.teacherTimezone ? <p>{locale === "es" ? "Hora docente" : "Teacher time"}: {teacherTime} ({session.teacherTimezone})</p> : null}
              {session.attachmentCount ? <p className="font-semibold text-[var(--color-gold-deep)]">{locale === "es" ? "Materiales" : "Files"}: {session.attachmentCount}</p> : null}
            </div>
            {session.lessonFocus ? (
              <p className="mt-3 rounded-[1rem] border border-[var(--color-border)] bg-[var(--color-surface-inset)] px-3 py-2 text-xs leading-5 text-[var(--color-ink-soft)]">
                {session.lessonFocus}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
          <Link href={session.detailHref}><Button size="sm" variant="outline">{locale === "es" ? "Detalle" : "Detail"}</Button></Link>
          {session.rescheduleHref ? <Link href={session.rescheduleHref}><Button size="sm" variant="gold">{locale === "es" ? "Reagendar" : "Reschedule"}</Button></Link> : null}
          {session.canCancelPending ? <CancelPendingClassButton classId={session.id} locale={locale} /> : null}
          {session.completeHref ? <Link href={session.completeHref}><Button size="sm" variant="gold">{locale === "es" ? "Completar" : "Complete"}</Button></Link> : null}
        </div>
      </div>
    </div>
  );
}

function groupSessionsByDay(sessions: ClassSessionListItem[], locale: AppLocale): DayGroup[] {
  const groups = new Map<string, DayGroup>();

  for (const session of sessions) {
    const key = dayKey(session.startsAtUtc, session.viewerTimezone);
    const existing = groups.get(key);
    if (existing) {
      existing.sessions.push(session);
      continue;
    }

    groups.set(key, {
      key,
      label: dayLabel(session.startsAtUtc, session.viewerTimezone, locale),
      accent: dayAccents[groups.size % dayAccents.length],
      sessions: [session],
    });
  }

  return [...groups.values()].map((group) => ({
    ...group,
    sessions: group.sessions.sort((a, b) => a.startsAtUtc.getTime() - b.startsAtUtc.getTime()),
  }));
}

function dayKey(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: normalizeIanaTimezone(timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  return `${year}-${month}-${day}`;
}

function dayLabel(date: Date, timezone: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: normalizeIanaTimezone(timezone),
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatTimeOnly(date: Date, timezone: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: normalizeIanaTimezone(timezone),
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
