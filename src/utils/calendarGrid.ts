import { DateTime } from "luxon";

export function monthGridDays(focusedIso: string): DateTime[] {
  const focused = DateTime.fromISO(focusedIso);
  const firstOfMonth = focused.startOf("month");
  // Grid starts on the Monday on/before the 1st of the month.
  const gridStart = firstOfMonth.minus({ days: (firstOfMonth.weekday + 6) % 7 });

  return Array.from({ length: 42 }, (_, i) => gridStart.plus({ days: i }));
}

export function weekDays(focusedIso: string): DateTime[] {
  const focused = DateTime.fromISO(focusedIso);
  const weekStart = focused.minus({ days: (focused.weekday + 6) % 7 });
  return Array.from({ length: 7 }, (_, i) => weekStart.plus({ days: i }));
}
