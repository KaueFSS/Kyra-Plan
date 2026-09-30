import { DateTime } from "luxon";
import type { TaskCompletion } from "../types/task";

/**
 * Small, human time phrases used all over the HUD so every widget answers
 * "when?" the same way: "em 20 min", "há 5 min", "faltam 1h10", "1h30".
 */

export function clockToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesOfDay(now: DateTime): number {
  return now.hour * 60 + now.minute;
}

/** "45 min", "1h", "1h30", "2h05". */
export function durationLabel(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** Positive = future ("em 20 min"), negative = past ("há 5 min"), 0 = "agora". */
export function relativeLabel(minutes: number): string {
  const rounded = Math.round(minutes);
  if (rounded === 0) return "agora";
  const text = durationLabel(Math.abs(rounded));
  return rounded > 0 ? `em ${text}` : `há ${text}`;
}

/** "falta 1 min", "faltam 20 min", "faltam 1h10". */
export function remainingLabel(minutes: number): string {
  const rounded = Math.max(0, Math.ceil(minutes));
  return `${rounded === 1 ? "falta" : "faltam"} ${durationLabel(rounded)}`;
}

/** How a timed item relates to now — drives colours everywhere. */
export type Urgency = "overdue" | "soon" | "later";

export const SOON_WINDOW_MIN = 60;

export function urgencyOf(minutesUntil: number): Urgency {
  if (minutesUntil < 0) return "overdue";
  if (minutesUntil <= SOON_WINDOW_MIN) return "soon";
  return "later";
}

/**
 * Consecutive completed days ending today (if already done) or yesterday
 * (today still counts as "in progress", so the streak isn't shown as lost).
 */
export function currentStreak(history: TaskCompletion[], today: string): number {
  const done = new Set(history.filter((h) => h.completed).map((h) => h.cycleDate));
  let day = DateTime.fromISO(today);
  if (!done.has(today)) day = day.minus({ days: 1 });
  let streak = 0;
  while (done.has(day.toISODate()!)) {
    streak++;
    day = day.minus({ days: 1 });
  }
  return streak;
}

/**
 * Minutes until an alarm next rings. `days` uses 0 = Monday … 6 = Sunday;
 * an empty list means every day. Null when it can never ring.
 */
export function minutesUntilAlarm(time: string, days: number[], now: DateTime): number | null {
  const [h, m] = time.split(":").map(Number);
  for (let offset = 0; offset <= 7; offset++) {
    const date = now.plus({ days: offset });
    if (days.length > 0 && !days.includes(date.weekday - 1)) continue;
    const ring = date.set({ hour: h, minute: m, second: 0, millisecond: 0 });
    if (ring > now) return Math.ceil(ring.diff(now, "minutes").minutes);
  }
  return null;
}
