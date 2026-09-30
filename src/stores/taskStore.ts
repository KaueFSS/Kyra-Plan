import { create } from "zustand";
import { tasksService } from "../services/tasksService";
import type { CreateTaskInput, Task, TaskWithProgress, UpdateTaskInput } from "../types/task";
import { ApiError } from "../services/tauri";

export function taskToUpdateInput(task: Task, overrides: Partial<UpdateTaskInput> = {}): UpdateTaskInput {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    priority: task.priority,
    durationSeconds: task.durationSeconds,
    scheduledTime: task.scheduledTime,
    recurrenceDays: task.recurrenceDays,
    startDate: task.startDate,
    endDate: task.endDate,
    status: task.status,
    ...overrides,
  };
}

interface TaskState {
  daily: TaskWithProgress[];
  weekly: TaskWithProgress[];
  single: TaskWithProgress[];
  timed: TaskWithProgress[];
  loading: boolean;
  error: string | null;

  loadAll: () => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<void>;
  updateTask: (input: UpdateTaskInput) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleCompletion: (taskId: string) => Promise<void>;
  reorderDaily: (orderedIds: string[]) => Promise<void>;
  moveWeeklyTaskDay: (taskId: string, fromDay: number, toDay: number) => Promise<void>;

  startTimedTask: (taskId: string) => Promise<void>;
  pauseTimedTask: (sessionId: string) => Promise<void>;
  resumeTimedTask: (sessionId: string) => Promise<void>;
  restartTimedTask: (sessionId: string) => Promise<void>;
  cancelTimedTask: (sessionId: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  daily: [],
  weekly: [],
  single: [],
  timed: [],
  loading: false,
  error: null,

  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const [daily, weekly, single, timed] = await Promise.all([
        tasksService.listDailyTasks(),
        tasksService.listWeeklyTasks(),
        tasksService.listSingleTasks(),
        tasksService.listTimedTasks(),
      ]);
      set({ daily, weekly, single, timed, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof ApiError ? err.message : "Falha ao carregar tarefas." });
    }
  },

  createTask: async (input) => {
    await tasksService.createTask(input);
    await get().loadAll();
  },

  updateTask: async (input) => {
    await tasksService.updateTask(input);
    await get().loadAll();
  },

  deleteTask: async (id) => {
    await tasksService.deleteTask(id);
    await get().loadAll();
  },

  toggleCompletion: async (taskId) => {
    await tasksService.toggleCompletion(taskId);
    await get().loadAll();
  },

  // Drag-and-drop actions update local state first so the dropped item
  // stays where the user released it instead of snapping back while the
  // backend round-trip is in flight; a failure reloads the true state.
  reorderDaily: async (orderedIds) => {
    const byId = new Map(get().daily.map((t) => [t.id, t]));
    set({ daily: orderedIds.map((id) => byId.get(id)).filter((t): t is TaskWithProgress => !!t) });
    try {
      await tasksService.reorderTasks(orderedIds);
    } catch {
      await get().loadAll();
    }
  },

  moveWeeklyTaskDay: async (taskId, fromDay, toDay) => {
    if (fromDay === toDay) return;
    const task = get().weekly.find((t) => t.id === taskId);
    if (!task) return;

    const current = task.recurrenceDays ?? [];
    const nextDays = Array.from(new Set(current.filter((d) => d !== fromDay).concat(toDay))).sort();

    set({ weekly: get().weekly.map((t) => (t.id === taskId ? { ...t, recurrenceDays: nextDays } : t)) });
    try {
      await tasksService.updateTask(taskToUpdateInput(task, { recurrenceDays: nextDays }));
    } finally {
      await get().loadAll();
    }
  },

  startTimedTask: async (taskId) => {
    await tasksService.startTimedTask(taskId);
    await get().loadAll();
  },

  pauseTimedTask: async (sessionId) => {
    await tasksService.pauseTimedTask(sessionId);
    await get().loadAll();
  },

  resumeTimedTask: async (sessionId) => {
    await tasksService.resumeTimedTask(sessionId);
    await get().loadAll();
  },

  restartTimedTask: async (sessionId) => {
    await tasksService.restartTimedTask(sessionId);
    await get().loadAll();
  },

  cancelTimedTask: async (sessionId) => {
    await tasksService.cancelTimedTask(sessionId);
    await get().loadAll();
  },
}));
