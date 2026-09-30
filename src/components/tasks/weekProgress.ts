import { DateTime } from "luxon";
import type { TaskWithProgress } from "../../types/task";

/** How a weekly task stands on one day of the current week. */
export type DayTaskStatus = "done" | "missed" | "pending" | "upcoming";

export interface WeekDayInfo {
  day: number;
  date: DateTime;
  isToday: boolean;
  isPast: boolean;
  tasks: TaskWithProgress[];
  done: number;
  missed: number;
}

export function tasksOnDay(tasks: TaskWithProgress[], day: number): TaskWithProgress[] {
  return tasks.filter((t) => (t.recurrenceDays ?? []).includes(day));
}

/**
 * Past days read from the completion history (one row per task per day),
 * today from the live completion, future days are just "upcoming".
 */
export function statusOn(task: TaskWithProgress, day: number, today: number, date: DateTime): DayTaskStatus {
  if (day === today) return task.completion?.completed ? "done" : "pending";
  if (day > today) return "upcoming";
  const iso = date.toISODate();
  return task.history.some((h) => h.cycleDate === iso && h.completed) ? "done" : "missed";
}

/** The current Monday-to-Sunday week, day by day. */
export function buildWeek(tasks: TaskWithProgress[], now: DateTime): WeekDayInfo[] {
  const today = now.weekday - 1;
  const monday = now.startOf("day").minus({ days: today });
  return Array.from({ length: 7 }, (_, day) => {
    const date = monday.plus({ days: day });
    const onDay = tasksOnDay(tasks, day);
    const statuses = onDay.map((t) => statusOn(t, day, today, date));
    return {
      day,
      date,
      isToday: day === today,
      isPast: day < today,
      tasks: onDay,
      done: statuses.filter((s) => s === "done").length,
      missed: statuses.filter((s) => s === "missed").length,
    };
  });
}

export function weekTotals(week: WeekDayInfo[]): { total: number; done: number; dueSoFar: number; perfect: boolean } {
  const total = week.reduce((n, d) => n + d.tasks.length, 0);
  const done = week.reduce((n, d) => n + d.done, 0);
  const dueSoFar = week.filter((d) => d.isPast || d.isToday).reduce((n, d) => n + d.tasks.length, 0);
  return { total, done, dueSoFar, perfect: total > 0 && done === total };
}
