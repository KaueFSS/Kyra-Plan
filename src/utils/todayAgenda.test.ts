import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { buildTodayAgenda, nowAndNext } from "./todayAgenda";
import { currentStreak, durationLabel, minutesUntilAlarm, relativeLabel, remainingLabel } from "./timeHints";
import type { WeeklyScheduleBlock } from "../types/schedule";
import type { TaskCompletion, TaskWithProgress } from "../types/task";
import type { Alarm } from "../types/alarm";

// Tuesday 29/09/2026 10:30
const NOW = DateTime.fromISO("2026-09-29T10:30:00");

const block = (id: string, day: number, start: string, end: string): WeeklyScheduleBlock => ({
  id, dayOfWeek: day, startTime: start, endTime: end, title: id, description: "", color: "#2b8af7", createdAt: "", updatedAt: "",
});

const task = (id: string, time: string | null, extra: Partial<TaskWithProgress> = {}): TaskWithProgress => ({
  id, title: id, description: "", taskType: "daily", priority: "medium", status: "pending", durationSeconds: null,
  scheduledTime: time, recurrenceDays: null, startDate: "", endDate: null, sortOrder: 0, createdAt: "", updatedAt: "",
  completion: null, activeSession: null, history: [], ...extra,
});

const alarm = (id: string, time: string, days: number[], enabled = true): Alarm => ({
  id, label: id, time, days, sound: "", enabled, notify: true, lastTriggeredAt: null, createdAt: "", updatedAt: "",
});

describe("timeHints", () => {
  it("formats durations and relative times", () => {
    expect(durationLabel(45)).toBe("45 min");
    expect(durationLabel(60)).toBe("1h");
    expect(durationLabel(95)).toBe("1h35");
    expect(relativeLabel(20)).toBe("em 20 min");
    expect(relativeLabel(-5)).toBe("há 5 min");
    expect(relativeLabel(0)).toBe("agora");
    expect(remainingLabel(1)).toBe("falta 1 min");
    expect(remainingLabel(70)).toBe("faltam 1h10");
  });

  it("counts a streak through yesterday when today isn't done yet", () => {
    const h = (date: string, completed = true): TaskCompletion => ({ id: date, taskId: "t", cycleDate: date, completed, completedAt: null });
    const history = [h("2026-09-26"), h("2026-09-27"), h("2026-09-28")];
    expect(currentStreak(history, "2026-09-29")).toBe(3);
    expect(currentStreak([...history, h("2026-09-29")], "2026-09-29")).toBe(4);
    expect(currentStreak([h("2026-09-27")], "2026-09-29")).toBe(0);
  });

  it("finds the next alarm ring across days", () => {
    expect(minutesUntilAlarm("11:00", [], NOW)).toBe(30);
    // 10:00 already passed today (Tuesday) → next is Wednesday 10:00.
    expect(minutesUntilAlarm("10:00", [], NOW)).toBe(23 * 60 + 30);
    // Only Mondays → next Monday.
    expect(minutesUntilAlarm("10:00", [0], NOW)).toBe(6 * 24 * 60 - 30);
  });
});

describe("buildTodayAgenda", () => {
  it("merges today's sources in time order and tags past / now / next / later", () => {
    const agenda = buildTodayAgenda(
      {
        blocks: [block("Cálculo", 1, "08:00", "09:00"), block("Física", 1, "10:00", "11:00"), block("Outro dia", 2, "10:00", "11:00")],
        occurrences: [],
        daily: [task("Ler", "12:00"), task("Sem hora", null), task("Esquecida", "09:45"), task("Água", "09:30", { completion: { id: "c", taskId: "Água", cycleDate: "", completed: true, completedAt: null } })],
        weekly: [task("Academia", "18:00", { taskType: "weekly", recurrenceDays: [1] }), task("Quarta", "18:00", { recurrenceDays: [2] })],
        alarms: [alarm("Acordar", "06:30", [0, 1, 2, 3, 4]), alarm("Desligado", "11:30", [], false), alarm("Remédio", "20:00", [])],
      },
      NOW,
    );

    expect(agenda.map((i) => `${i.title}:${i.status}`)).toEqual([
      "Acordar:past",
      "Cálculo:past",
      "Água:past",
      "Esquecida:past",
      "Física:now",
      "Ler:next",
      "Academia:later",
      "Remédio:later",
    ]);
    expect(agenda.filter((i) => i.overdue).map((i) => i.title)).toEqual(["Esquecida"]);
    const { now, next } = nowAndNext(agenda);
    expect(now.map((i) => i.title)).toEqual(["Física"]);
    expect(next?.title).toBe("Ler");
  });
});
