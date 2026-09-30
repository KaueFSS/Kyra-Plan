import { DateTime } from "luxon";
import type { WeeklyScheduleBlock } from "../types/schedule";
import type { EventOccurrence } from "../types/event";
import type { TaskWithProgress } from "../types/task";
import type { Alarm } from "../types/alarm";
import { clockToMinutes, minutesOfDay } from "./timeHints";

export type AgendaKind = "aula" | "evento" | "tarefa" | "alarme";
export type AgendaStatus = "past" | "now" | "next" | "later";

/** One thing on today's timeline, whatever store it came from. Times are minutes since midnight. */
export interface AgendaItem {
  id: string;
  kind: AgendaKind;
  title: string;
  start: number;
  end: number | null;
  color: string;
  done: boolean;
  status: AgendaStatus;
  /** A task whose time has passed without being done. */
  overdue: boolean;
}

export interface AgendaSources {
  blocks: WeeklyScheduleBlock[];
  occurrences: EventOccurrence[];
  daily: TaskWithProgress[];
  weekly: TaskWithProgress[];
  alarms: Alarm[];
}

const TASK_COLOR = "var(--color-accent-500)";
const ALARM_COLOR = "var(--color-warning)";

/**
 * Everything with a time today — timetable blocks, events, daily/weekly
 * tasks with a set hour and alarms that ring today — merged into one
 * ordered list, each tagged past / now / next / later relative to `now`.
 */
export function buildTodayAgenda(src: AgendaSources, now: DateTime = DateTime.now()): AgendaItem[] {
  const weekday = now.weekday - 1;
  const dayStart = now.startOf("day");
  const dayEnd = now.endOf("day");
  const items: Omit<AgendaItem, "status" | "overdue">[] = [];

  for (const block of src.blocks) {
    if (block.dayOfWeek !== weekday) continue;
    items.push({
      id: `aula-${block.id}`,
      kind: "aula",
      title: block.title,
      start: clockToMinutes(block.startTime),
      end: clockToMinutes(block.endTime),
      color: block.color,
      done: false,
    });
  }

  for (const occ of src.occurrences) {
    const start = DateTime.fromISO(occ.occurrenceStart);
    const end = DateTime.fromISO(occ.occurrenceEnd);
    if (end <= dayStart || start > dayEnd) continue;
    items.push({
      id: `evento-${occ.id}-${occ.occurrenceStart}`,
      kind: "evento",
      title: occ.title,
      start: start < dayStart ? 0 : minutesOfDay(start),
      end: end > dayEnd ? 24 * 60 : minutesOfDay(end),
      color: occ.color,
      done: false,
    });
  }

  const tasks = [...src.daily, ...src.weekly.filter((t) => (t.recurrenceDays ?? []).includes(weekday))];
  for (const task of tasks) {
    if (!task.scheduledTime) continue;
    const start = clockToMinutes(task.scheduledTime);
    const duration = task.durationSeconds ? Math.round(task.durationSeconds / 60) : 0;
    items.push({
      id: `tarefa-${task.id}`,
      kind: "tarefa",
      title: task.title,
      start,
      end: duration > 0 ? start + duration : null,
      color: TASK_COLOR,
      done: task.completion?.completed ?? false,
    });
  }

  for (const alarm of src.alarms) {
    if (!alarm.enabled) continue;
    if (alarm.days.length > 0 && !alarm.days.includes(weekday)) continue;
    items.push({
      id: `alarme-${alarm.id}`,
      kind: "alarme",
      title: alarm.label || "Alarme",
      start: clockToMinutes(alarm.time),
      end: null,
      color: ALARM_COLOR,
      done: false,
    });
  }

  items.sort((a, b) => a.start - b.start || (a.end ?? a.start) - (b.end ?? b.start));

  const current = minutesOfDay(now);
  let nextMarked = false;
  return items.map((item) => {
    const end = item.end ?? item.start;
    let status: AgendaStatus;
    if (item.done || end < current || (item.end === null && item.start < current)) status = "past";
    else if (item.end !== null && item.start <= current && current < item.end) status = "now";
    else if (!nextMarked) {
      status = "next";
      nextMarked = true;
    } else status = "later";
    return { ...item, status, overdue: item.kind === "tarefa" && !item.done && status === "past" };
  });
}

/** What is happening right now (longest-running first) and what comes next. */
export function nowAndNext(agenda: AgendaItem[]): { now: AgendaItem[]; next: AgendaItem | undefined } {
  return { now: agenda.filter((i) => i.status === "now"), next: agenda.find((i) => i.status === "next") };
}
