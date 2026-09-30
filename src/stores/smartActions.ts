import { DateTime } from "luxon";
import { useTaskStore } from "./taskStore";
import { useCalendarStore } from "./calendarStore";
import { useScheduleStore } from "./scheduleStore";
import { useAlarmStore } from "./alarmStore";
import { addMinutesToClock, nextWeekday, type ParsedInput } from "../utils/naturalLanguage";
import { PALETTE } from "../components/ui/FormControls";
import { todayIsoDate } from "../utils/format";
import { ApiError } from "../services/tauri";

/**
 * Turns a parsed quick-add phrase into the right store actions, applying the
 * "smart defaults" in one place so every widget behaves the same way.
 */

function nextFullHour(): string {
  const next = DateTime.now().plus({ hours: 1 }).startOf("hour");
  return next.hour === 0 ? "23:00" : next.toFormat("HH:mm");
}

const durationSeconds = (p: ParsedInput) => (p.durationMinutes ? p.durationMinutes * 60 : null);

export async function createDailyTask(p: ParsedInput): Promise<void> {
  await useTaskStore.getState().createTask({
    title: p.title,
    taskType: "daily",
    priority: "medium",
    scheduledTime: p.startTime,
    durationSeconds: durationSeconds(p),
    startDate: todayIsoDate(),
  });
}

export async function createWeeklyTask(p: ParsedInput, defaultDays: number[]): Promise<void> {
  const days = p.days.length > 0 ? p.days : defaultDays;
  await useTaskStore.getState().createTask({
    title: p.title,
    taskType: "weekly",
    priority: "medium",
    scheduledTime: p.startTime,
    durationSeconds: durationSeconds(p),
    recurrenceDays: days,
    startDate: todayIsoDate(),
  });
}

/**
 * Events: an explicit date wins; otherwise named weekdays become their next
 * occurrence (one event per day, repeating weekly when the phrase said so);
 * otherwise the day currently selected in the calendar is used.
 */
export async function createEvents(
  p: ParsedInput,
  fallbackDate: string,
  range: { start: string; end: string },
): Promise<void> {
  const start = p.startTime ?? nextFullHour();
  const end = p.endTime ?? addMinutesToClock(start, 60);
  const recurrence = p.recurrence ?? "none";

  const dates = p.date
    ? [p.date]
    : p.days.length > 0 && recurrence !== "daily"
      ? p.days.map((d) => nextWeekday(d))
      : [fallbackDate];

  const color = colorForTitle(p.title, []);
  for (const date of dates) {
    await useCalendarStore.getState().createEvent(
      {
        title: p.title,
        startAt: DateTime.fromISO(`${date}T${start}`).toUTC().toISO()!,
        endAt: DateTime.fromISO(`${date}T${end}`).toUTC().toISO()!,
        color,
        recurrenceRule: recurrence,
      },
      range.start,
      range.end,
    );
  }
}

/** Same title → same colour, so a subject keeps its colour across the week. */
export function colorForTitle(title: string, existing: { title: string; color: string }[]): string {
  const match = existing.find((b) => b.title.trim().toLowerCase() === title.trim().toLowerCase());
  if (match) return match.color;
  const distinctTitles = new Set(existing.map((b) => b.title.trim().toLowerCase()));
  return PALETTE[distinctTitles.size % PALETTE.length];
}

/** The slot a brand-new timetable row should default to: right after the last one. */
export function suggestNextSlot(): { startTime: string; endTime: string } {
  const blocks = useScheduleStore.getState().blocks;
  if (blocks.length === 0) return { startTime: "08:00", endTime: "09:00" };
  const lastEnd = blocks.map((b) => b.endTime).sort().reverse()[0];
  if (lastEnd >= "23:00") return { startTime: "22:00", endTime: "23:00" };
  return { startTime: lastEnd, endTime: addMinutesToClock(lastEnd, 60) };
}

export async function createScheduleBlocks(
  p: ParsedInput,
  defaultDays: number[],
  defaultSlot: { startTime: string; endTime: string },
): Promise<void> {
  const store = useScheduleStore.getState();
  const days = p.days.length > 0 ? p.days : defaultDays;
  const startTime = p.startTime ?? defaultSlot.startTime;
  const endTime = p.endTime ?? (p.startTime ? addMinutesToClock(p.startTime, 60) : defaultSlot.endTime);
  if (endTime <= startTime) throw new ApiError("O fim deve ser depois do início.");

  const color = colorForTitle(p.title, store.blocks);
  for (const dayOfWeek of days) {
    await store.create({ dayOfWeek, startTime, endTime, title: p.title, description: "", color });
  }
}

export async function createAlarm(p: ParsedInput): Promise<void> {
  if (!p.startTime) throw new ApiError("Diga o horário, ex.: 06:30.");
  await useAlarmStore.getState().create({ time: p.startTime, days: p.days, label: p.title, notify: true });
}
