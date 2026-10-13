import type { TaskWithProgress } from "../types/task";

/**
 * One list's tasks in the order they're shown: open ones first, in the
 * user's own order (drag to rearrange), ticked ones sinking to the bottom.
 * Ties fall back to creation time so new tasks stay where they were added.
 */
export function orderedListTasks(single: TaskWithProgress[], listId: string | null | undefined): TaskWithProgress[] {
  const byOrder = (a: TaskWithProgress, b: TaskWithProgress) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt);
  const inList = single.filter((t) => t.listId === listId);
  return [...inList.filter((t) => t.status !== "completed").sort(byOrder), ...inList.filter((t) => t.status === "completed").sort(byOrder)];
}

/** Same tasks, earliest due date first (undated ones last) — the "Ordenar por data" action. */
export function orderByDueDate(tasks: TaskWithProgress[]): TaskWithProgress[] {
  const key = (t: TaskWithProgress) => `${t.endDate ?? "9999-99-99"} ${t.scheduledTime ?? "99:99"}`;
  return [...tasks].sort((a, b) => key(a).localeCompare(key(b)) || a.sortOrder - b.sortOrder);
}
