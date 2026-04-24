import { toZonedTime } from "date-fns-tz";
import { normalizeIanaTimezone } from "@/lib/iana-timezones";

type AvailabilityWindow = {
  weekday: number;
  startMinuteLocal: number;
  endMinuteLocal: number;
  timezone: string;
};

function minuteOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function isValidRescheduleDuration(start: Date, end: Date) {
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  return durationMinutes >= 30 && durationMinutes <= 180;
}

export function isSlotWithinAvailability(
  startUtc: Date,
  endUtc: Date,
  availability: AvailabilityWindow[],
  fallbackTimezone: string,
) {
  return availability.some((window) => {
    const timezone = normalizeIanaTimezone(window.timezone || fallbackTimezone);
    const localStart = toZonedTime(startUtc, timezone);
    const localEnd = toZonedTime(endUtc, timezone);

    if (localStart.getDay() !== window.weekday || localEnd.getDay() !== window.weekday) {
      return false;
    }

    const startMinute = minuteOfDay(localStart);
    const endMinute = minuteOfDay(localEnd);
    return startMinute >= window.startMinuteLocal && endMinute <= window.endMinuteLocal;
  });
}

export function overlapsRange(
  firstStart: Date,
  firstEnd: Date,
  secondStart: Date,
  secondEnd: Date,
) {
  return firstStart < secondEnd && firstEnd > secondStart;
}
