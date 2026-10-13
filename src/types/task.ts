export type TaskType = "single" | "daily" | "weekly" | "timed";
export type Priority = "low" | "medium" | "high";
export type TaskStatus = "pending" | "in_progress" | "paused" | "completed" | "cancelled";
export type TaskSessionStatus = "running" | "paused" | "completed" | "cancelled";

export interface Task {
  id: string;
  title: string;
  description: string;
  taskType: TaskType;
  priority: Priority;
  status: TaskStatus;
  durationSeconds: number | null;
  scheduledTime: string | null;
  recurrenceDays: number[] | null;
  startDate: string;
  endDate: string | null;
  sortOrder: number;
  /** One-off tasks live in a named list; recurring tasks have none. */
  listId: string | null;
  /** When a one-off task was ticked (UTC "YYYY-MM-DD HH:MM:SS"). */
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCompletion {
  id: string;
  taskId: string;
  cycleDate: string;
  completed: boolean;
  completedAt: string | null;
}

export interface TaskSession {
  id: string;
  taskId: string;
  cycleDate: string;
  status: TaskSessionStatus;
  durationSeconds: number;
  elapsedSeconds: number;
  startedAt: string | null;
  pausedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWithProgress extends Task {
  completion: TaskCompletion | null;
  activeSession: TaskSession | null;
  history: TaskCompletion[];
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  taskType: TaskType;
  priority: Priority;
  durationSeconds?: number | null;
  scheduledTime?: string | null;
  recurrenceDays?: number[] | null;
  startDate: string;
  endDate?: string | null;
  listId?: string | null;
}

export interface UpdateTaskInput {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  durationSeconds?: number | null;
  scheduledTime?: string | null;
  recurrenceDays?: number[] | null;
  startDate: string;
  endDate?: string | null;
  status: TaskStatus;
  listId?: string | null;
}
