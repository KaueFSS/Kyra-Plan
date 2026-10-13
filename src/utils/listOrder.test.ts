import { describe, expect, it } from "vitest";
import { orderByDueDate, orderedListTasks } from "./listOrder";
import type { TaskWithProgress } from "../types/task";

const task = (id: string, sortOrder: number, extra: Partial<TaskWithProgress> = {}): TaskWithProgress => ({
  id, title: id, description: "", taskType: "single", priority: "medium", status: "pending", durationSeconds: null,
  scheduledTime: null, recurrenceDays: null, startDate: "", endDate: null, sortOrder, listId: "a", completedAt: null,
  createdAt: id, updatedAt: "", completion: null, activeSession: null, history: [], ...extra,
});

describe("orderedListTasks", () => {
  it("follows the manual order, sinks ticked tasks and ignores other lists", () => {
    const tasks = [task("c", 2), task("a", 0, { status: "completed" }), task("b", 1), task("x", 0, { listId: "other" })];
    expect(orderedListTasks(tasks, "a").map((t) => t.id)).toEqual(["b", "c", "a"]);
  });
});

describe("orderByDueDate", () => {
  it("puts earlier dates first and undated tasks last", () => {
    const tasks = [task("none", 0), task("late", 1, { endDate: "2026-10-20" }), task("soon", 2, { endDate: "2026-10-14", scheduledTime: "09:00" })];
    expect(orderByDueDate(tasks).map((t) => t.id)).toEqual(["soon", "late", "none"]);
  });
});
