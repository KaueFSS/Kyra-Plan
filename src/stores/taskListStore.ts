import { create } from "zustand";
import { taskListsService } from "../services/taskListsService";
import { reportError } from "./toastStore";
import { playSound } from "../utils/sounds";
import { useTaskStore } from "./taskStore";
import type { TaskList } from "../types/taskList";

interface TaskListState {
  lists: TaskList[];
  loaded: boolean;
  load: () => Promise<void>;
  create: (name: string, color: string) => Promise<TaskList | null>;
  update: (id: string, name: string, color: string) => Promise<void>;
  remove: (id: string) => Promise<boolean>;
}

export const useTaskListStore = create<TaskListState>((set, get) => ({
  lists: [],
  loaded: false,

  load: async () => {
    try {
      set({ lists: await taskListsService.list(), loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  create: async (name, color) => {
    try {
      const list = await taskListsService.create(name, color);
      playSound("add");
      set({ lists: [...get().lists, list] });
      return list;
    } catch (err) {
      reportError(err, "Não foi possível criar a lista.");
      return null;
    }
  },

  update: async (id, name, color) => {
    set({ lists: get().lists.map((l) => (l.id === id ? { ...l, name, color } : l)) });
    try {
      await taskListsService.update(id, name, color);
    } catch (err) {
      reportError(err, "Não foi possível salvar a lista.");
      await get().load();
    }
  },

  remove: async (id) => {
    try {
      await taskListsService.remove(id);
      playSound("remove");
      set({ lists: get().lists.filter((l) => l.id !== id) });
      await useTaskStore.getState().loadAll();
      return true;
    } catch (err) {
      reportError(err, "Não foi possível excluir a lista.");
      return false;
    }
  },
}));
