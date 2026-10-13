import { invoke } from "./tauri";
import type { Streak, TaskList } from "../types/taskList";

export const taskListsService = {
  list: () => invoke<TaskList[]>("list_task_lists"),
  create: (name: string, color: string) => invoke<TaskList>("create_task_list", { name, color }),
  update: (id: string, name: string, color: string) => invoke<TaskList>("update_task_list", { id, name, color }),
  remove: (id: string) => invoke<void>("delete_task_list", { id }),
  streak: () => invoke<Streak>("get_streak"),
};
