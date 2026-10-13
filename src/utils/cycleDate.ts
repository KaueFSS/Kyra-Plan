import { DateTime } from "luxon";

interface ResetSettings {
  dailyResetTime: string;
  dailyResetTimezone: string;
}

/**
 * "Now" as the task cycle sees it — the same rule as the backend's
 * `time_util::cycle_date`: in the reset timezone, and before the reset time
 * it's still the previous day. Use this (not the raw clock) whenever the UI
 * decides which day is "today" for daily/weekly tasks, or the screen and
 * the backend disagree late at night and ticking a task gets refused.
 */
export function cycleNow(settings: ResetSettings | null | undefined, at: DateTime = DateTime.now()): DateTime {
  if (!settings) return at;
  const zoned = at.setZone(settings.dailyResetTimezone);
  const now = zoned.isValid ? zoned : at;
  const [h, m] = settings.dailyResetTime.split(":").map(Number);
  return now.hour * 60 + now.minute < (h || 0) * 60 + (m || 0) ? now.minus({ days: 1 }) : now;
}

/** The computer's IANA timezone, e.g. "America/Sao_Paulo". */
export function systemTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
