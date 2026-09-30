import { invoke } from "./tauri";
import type { CreateTaskInput, Task, TaskCompletion, TaskSession, TaskWithProgress, UpdateTaskInput } from "../types/task";

export const tasksService = {
  createTask: (input: CreateTaskInput) => invoke<Task>("create_task", { input }),
  updateTask: (input: UpdateTaskInput) => invoke<Task>("update_task", { input }),
  deleteTask: (id: string) => invoke<void>("delete_task", { id }),
  reorderTasks: (orderedIds: string[]) => invoke<void>("reorder_tasks", { orderedIds }),

  listDailyTasks: () => invoke<TaskWithProgress[]>("list_daily_tasks"),
  listWeeklyTasks: () => invoke<TaskWithProgress[]>("list_weekly_tasks"),
  listSingleTasks: () => invoke<TaskWithProgress[]>("list_single_tasks"),
  listTimedTasks: () => invoke<TaskWithProgress[]>("list_timed_tasks"),

  toggleCompletion: (taskId: string) => invoke<TaskCompletion>("toggle_task_completion", { taskId }),

  startTimedTask: (taskId: string) => invoke<TaskSession>("start_timed_task", { taskId }),
  pauseTimedTask: (sessionId: string) => invoke<TaskSession>("pause_timed_task", { sessionId }),
  resumeTimedTask: (sessionId: string) => invoke<TaskSession>("resume_timed_task", { sessionId }),
  restartTimedTask: (sessionId: string) => invoke<TaskSession>("restart_timed_task", { sessionId }),
  cancelTimedTask: (sessionId: string) => invoke<void>("cancel_timed_task", { sessionId }),
  checkTimedTask: (sessionId: string) => invoke<TaskSession>("check_timed_task", { sessionId }),
};
