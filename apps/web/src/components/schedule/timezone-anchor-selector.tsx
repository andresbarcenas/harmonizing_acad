"use client";

import { RecurringTimezoneMode } from "@prisma/client";

import { Input } from "@/components/ui/input";
import { getDictionary } from "@/lib/i18n";
import type { AppLocale } from "@/lib/i18n/locales";

type TimezoneAnchorSelectorProps = {
  anchorTimezone: string;
  customTimezone: string;
  idPrefix: string;
  locale?: AppLocale;
  mode: RecurringTimezoneMode;
  onCustomTimezoneChange: (value: string) => void;
  onModeChange: (value: RecurringTimezoneMode) => void;
  role?: "admin" | "teacher";
  studentTimezone: string;
  teacherTimezone: string;
};

export function TimezoneAnchorSelector({
  anchorTimezone,
  customTimezone,
  idPrefix,
  locale = "en",
  mode,
  onCustomTimezoneChange,
  onModeChange,
  role = "teacher",
  studentTimezone,
  teacherTimezone,
}: TimezoneAnchorSelectorProps) {
  const dictionary = getDictionary(locale);
  const timezoneModeId = `${idPrefix}-timezoneMode`;
  const customTimezoneId = `${idPrefix}-customTimezone`;
  const anchorNotice =
    mode === RecurringTimezoneMode.TEACHER_TIME
      ? dictionary.teacher.recurringTeacherAnchoredNotice
      : mode === RecurringTimezoneMode.CUSTOM_TIMEZONE
        ? dictionary.teacher.recurringCustomAnchoredNotice
        : dictionary.teacher.recurringStudentAnchoredNotice;

  return (
    <>
      <p className="text-xs text-[var(--color-ink-soft)]">
        {dictionary.teacher.teacherTime}: <span className="font-semibold text-[var(--color-ink)]">{teacherTimezone}</span> · {dictionary.teacher.studentTime}:{" "}
        <span className="font-semibold text-[var(--color-ink)]">{studentTimezone}</span>
      </p>

      <div className="rounded-[1.4rem] border border-[var(--color-border)] bg-white/68 p-3">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
          <div className="space-y-1.5">
            <label htmlFor={timezoneModeId} className="text-sm font-semibold text-[var(--color-ink-soft)]">
              {dictionary.teacher.recurringTimezoneModeLabel}
            </label>
            <select
              id={timezoneModeId}
              name="timezoneMode"
              value={mode}
              onChange={(event) => onModeChange(event.target.value as RecurringTimezoneMode)}
              className={selectClassName}
            >
              <option value={RecurringTimezoneMode.STUDENT_TIME}>{dictionary.teacher.recurringStudentTime}</option>
              <option value={RecurringTimezoneMode.TEACHER_TIME}>{dictionary.teacher.recurringTeacherTime}</option>
              {role === "admin" ? <option value={RecurringTimezoneMode.CUSTOM_TIMEZONE}>{dictionary.teacher.recurringCustomTime}</option> : null}
            </select>
          </div>
          {mode === RecurringTimezoneMode.CUSTOM_TIMEZONE ? (
            <div className="space-y-1.5">
              <label htmlFor={customTimezoneId} className="text-sm font-semibold text-[var(--color-ink-soft)]">
                {dictionary.teacher.recurringCustomTimezone}
              </label>
              <Input
                id={customTimezoneId}
                name="customTimezone"
                value={customTimezone}
                onChange={(event) => onCustomTimezoneChange(event.target.value)}
                placeholder="America/New_York"
                required
              />
            </div>
          ) : (
            <div className="rounded-[1.1rem] border border-[var(--color-border)] bg-[var(--color-cream)] px-4 py-3 text-sm text-[var(--color-ink-soft)]">
              {dictionary.common.timezone}: <span className="font-semibold text-[var(--color-ink)]">{anchorTimezone}</span>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-[var(--color-ink-soft)]">{anchorNotice}</p>
      </div>
    </>
  );
}

const selectClassName = "h-[3.1rem] w-full rounded-[1.1rem] border border-[var(--color-border-strong)] bg-white/84 px-4 text-sm text-[var(--color-ink)]";
