import { useMemo } from "react";
import { DateTime } from "luxon";
import { useTaskStore } from "../stores/taskStore";
import { useScheduleStore } from "../stores/scheduleStore";
import { useCalendarStore } from "../stores/calendarStore";
import { useAlarmStore } from "../stores/alarmStore";
import type { SmartKind, SuggestionItem } from "../utils/smartSuggest";

const DAY_TOKENS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];

/** Weekdays as text the parser reads back ("seg qua sex", "dias úteis", "todo dia"). */
export function dayText(days: number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  if (sorted.length === 7) return "todo dia";
  if (sorted.length === 5 && sorted.every((d, i) => d === i)) return "dias úteis";
  if (sorted.length === 2 && sorted[0] === 5 && sorted[1] === 6) return "fim de semana";
  return sorted.map((d) => DAY_TOKENS[d]).join(" ");
}

function minutesText(seconds: number | null): string {
  return seconds ? `por ${Math.round(seconds / 60)} min` : "";
}

/** Folds repeated titles into one entry that remembers the latest details and how often it was used. */
export function collect(entries: { title: string; details: string; when: string }[]): SuggestionItem[] {
  const byTitle = new Map<string, SuggestionItem>();
  for (const e of [...entries].sort((a, b) => a.when.localeCompare(b.when))) {
    const key = e.title.trim().toLowerCase();
    if (!key) continue;
    const prev = byTitle.get(key);
    byTitle.set(key, { title: e.title.trim(), details: e.details, uses: (prev?.uses ?? 0) + 1, lastUsed: e.when });
  }
  return [...byTitle.values()];
}

/**
 * What the user has typed before for this kind of field, with the time,
 * days and length it usually had — the source of predictions and of the
 * "recent" list.
 */
export function useSuggestionPool(kind: SmartKind): SuggestionItem[] {
  const daily = useTaskStore((s) => s.daily);
  const weekly = useTaskStore((s) => s.weekly);
  const single = useTaskStore((s) => s.single);
  const blocks = useScheduleStore((s) => s.blocks);
  const occurrences = useCalendarStore((s) => s.occurrences);
  const alarms = useAlarmStore((s) => s.alarms);

  return useMemo(() => {
    if (kind === "schedule") {
      return collect(
        blocks.map((b) => {
          // Same subject at the same time on several days counts as one habit.
          const sameSlot = blocks.filter((o) => o.title === b.title && o.startTime === b.startTime && o.endTime === b.endTime);
          return { title: b.title, details: `${dayText(sameSlot.map((o) => o.dayOfWeek))} ${b.startTime}-${b.endTime}`, when: b.updatedAt };
        }),
      );
    }
    if (kind === "event") {
      return collect(
        occurrences.map((o) => ({
          title: o.title,
          details: `${DateTime.fromISO(o.occurrenceStart).toFormat("HH:mm")}-${DateTime.fromISO(o.occurrenceEnd).toFormat("HH:mm")}`,
          when: o.updatedAt,
        })),
      );
    }
    if (kind === "alarm") {
      return collect(
        alarms
          .filter((a) => a.label.trim())
          .map((a) => ({ title: a.label, details: `${a.time} ${a.days.length && a.days.length < 7 ? dayText(a.days) : ""}`.trim(), when: a.updatedAt })),
      );
    }
    // Tasks learn from every kind of task, so "Academia" typed once is offered everywhere.
    return collect([
      ...daily.map((t) => ({ title: t.title, details: [t.scheduledTime ?? "", minutesText(t.durationSeconds)].filter(Boolean).join(" "), when: t.updatedAt })),
      ...weekly.map((t) => ({
        title: t.title,
        details: [dayText(t.recurrenceDays ?? []), t.scheduledTime ?? "", minutesText(t.durationSeconds)].filter(Boolean).join(" "),
        when: t.updatedAt,
      })),
      ...single.map((t) => ({ title: t.title, details: [t.scheduledTime ?? "", minutesText(t.durationSeconds)].filter(Boolean).join(" "), when: t.updatedAt })),
    ]);
  }, [kind, daily, weekly, single, blocks, occurrences, alarms]);
}
