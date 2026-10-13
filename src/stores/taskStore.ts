import { create } from "zustand";
import { tasksService } from "../services/tasksService";
import type { CreateTaskInput, Task, TaskWithProgress, UpdateTaskInput } from "../types/task";
import { ApiError } from "../services/tauri";
import { reportError } from "./toastStore";
import { orderedListTasks } from "../utils/listOrder";
import { playSound } from "../utils/sounds";

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
    listId: task.listId,
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
  /** Ticks/unticks a one-off task (optimistic). */
  toggleSingle: (taskId: string) => Promise<void>;
  /** Moves a one-off task to another list; `beforeTaskId` puts it right above that task. */
  moveToList: (taskId: string, listId: string, beforeTaskId?: string) => Promise<void>;
  /** Saves the manual order of one-off tasks (ids in the order they should appear). */
  reorderSingle: (orderedIds: string[]) => Promise<void>;
  /** Due date of a one-off task (kept in `endDate`; null = no date). */
  setDueDate: (taskId: string, date: string | null) => Promise<void>;
  reorderDaily: (orderedIds: string[]) => Promise<void>;
  moveWeeklyTaskDay: (taskId: string, fromDay: number, toDay: number) => Promise<void>;
  /** Makes a weekly task also happen on another day. */
  addWeeklyTaskDay: (taskId: string, day: number) => Promise<void>;

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
    playSound("add");
    await get().loadAll();
  },

  updateTask: async (input) => {
    await tasksService.updateTask(input);
    await get().loadAll();
  },

  deleteTask: async (id) => {
    await tasksService.deleteTask(id);
    playSound("remove");
    await get().loadAll();
  },

  toggleCompletion: async (taskId) => {
    const before = [...get().daily, ...get().weekly].find((t) => t.id === taskId);
    try {
      await tasksService.toggleCompletion(taskId);
      playSound(before?.completion?.completed ? "uncomplete" : "complete");
    } catch (err) {
      reportError(err, "Não foi possível marcar a tarefa.");
    }
    await get().loadAll();
  },

  toggleSingle: async (taskId) => {
    const wasDone = get().single.find((t) => t.id === taskId)?.status === "completed";
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    set({
      single: get().single.map((t) =>
        t.id === taskId
          ? { ...t, status: t.status === "completed" ? "pending" : "completed", completedAt: t.status === "completed" ? null : now }
          : t,
      ),
    });
    try {
      await tasksService.toggleSingleTask(taskId);
      playSound(wasDone ? "uncomplete" : "complete");
    } catch (err) {
      reportError(err, "Não foi possível marcar a tarefa.");
    }
    await get().loadAll();
  },

  setDueDate: async (taskId, date) => {
    const task = get().single.find((t) => t.id === taskId);
    if (!task) return;
    set({ single: get().single.map((t) => (t.id === taskId ? { ...t, endDate: date } : t)) });
    try {
      await tasksService.updateTask(taskToUpdateInput(task, { endDate: date }));
    } catch (err) {
      reportError(err, "Não foi possível mudar a data.");
    }
    await get().loadAll();
  },

  reorderSingle: async (orderedIds) => {
    const position = new Map(orderedIds.map((id, i) => [id, i]));
    set({ single: get().single.map((t) => (position.has(t.id) ? { ...t, sortOrder: position.get(t.id)! } : t)) });
    try {
      await tasksService.reorderTasks(orderedIds);
    } catch (err) {
      reportError(err, "Não foi possível salvar a ordem.");
      await get().loadAll();
    }
  },

  moveToList: async (taskId, listId, beforeTaskId) => {
    set({ single: get().single.map((t) => (t.id === taskId ? { ...t, listId } : t)) });
    try {
      await tasksService.moveTaskToList(taskId, listId);
      if (beforeTaskId) {
        const ids = orderedListTasks(get().single, listId)
          .map((t) => t.id)
          .filter((id) => id !== taskId);
        const at = ids.indexOf(beforeTaskId);
        ids.splice(at < 0 ? ids.length : at, 0, taskId);
        await get().reorderSingle(ids);
      }
    } catch (err) {
      reportError(err, "Não foi possível mover a tarefa.");
    }
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
    } catch (err) {
      reportError(err, "Não foi possível mover a tarefa.");
    } finally {
      await get().loadAll();
    }
  },

  addWeeklyTaskDay: async (taskId, day) => {
    const task = get().weekly.find((t) => t.id === taskId);
    if (!task || (task.recurrenceDays ?? []).includes(day)) return;
    const nextDays = [...(task.recurrenceDays ?? []), day].sort();
    set({ weekly: get().weekly.map((t) => (t.id === taskId ? { ...t, recurrenceDays: nextDays } : t)) });
    try {
      await tasksService.updateTask(taskToUpdateInput(task, { recurrenceDays: nextDays }));
    } catch (err) {
      reportError(err, "Não foi possível adicionar a tarefa neste dia.");
    }
    await get().loadAll();
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
