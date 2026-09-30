import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { buildWeek, weekTotals } from "./weekProgress";
import type { TaskWithProgress } from "../../types/task";

// Wednesday 30/09/2026
const NOW = DateTime.fromISO("2026-09-30T15:00:00");

const task = (id: string, days: number[], doneOn: string[], doneToday = false): TaskWithProgress => ({
  id, title: id, description: "", taskType: "weekly", priority: "medium", status: "pending", durationSeconds: null,
  scheduledTime: null, recurrenceDays: days, startDate: "", endDate: null, sortOrder: 0, createdAt: "", updatedAt: "",
  completion: doneToday ? { id: "c", taskId: id, cycleDate: "2026-09-30", completed: true, completedAt: null } : null,
  activeSession: null,
  history: doneOn.map((d) => ({ id: d, taskId: id, cycleDate: d, completed: true, completedAt: null })),
});

describe("buildWeek", () => {
  it("reads past days from history, today from the live completion, and leaves the future open", () => {
    const week = buildWeek(
      [task("Academia", [0, 1, 2, 4], ["2026-09-28"], true), task("Leitura", [2], [])],
      NOW,
    );

    expect(week.map((d) => d.date.toISODate())[0]).toBe("2026-09-28");
    const [mon, tue, wed, , fri] = week;
    expect([mon.done, mon.missed]).toEqual([1, 0]);
    expect([tue.done, tue.missed]).toEqual([0, 1]);
    expect(wed.isToday).toBe(true);
    expect([wed.tasks.length, wed.done, wed.missed]).toEqual([2, 1, 0]);
    expect([fri.done, fri.missed, fri.isPast]).toEqual([0, 0, false]);

    expect(weekTotals(week)).toEqual({ total: 5, done: 2, dueSoFar: 4, perfect: false });
  });
});
