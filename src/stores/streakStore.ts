import { create } from "zustand";
import { taskListsService } from "../services/taskListsService";
import { useTaskStore } from "./taskStore";
import type { Streak } from "../types/taskList";

interface StreakState {
  streak: Streak | null;
  /** Bumps when today just became complete, so the badge can celebrate. */
  celebrateKey: number;
  load: () => Promise<void>;
}

export const useStreakStore = create<StreakState>((set, get) => ({
  streak: null,
  celebrateKey: 0,
  load: async () => {
    try {
      const next = await taskListsService.streak();
      const before = get().streak;
      const justCompleted =
        before !== null && next.todayTotal > 0 && next.todayDone === next.todayTotal && before.todayDone < before.todayTotal;
      set({ streak: next, celebrateKey: justCompleted ? get().celebrateKey + 1 : get().celebrateKey });
    } catch {
      // No backend (browser preview) or a transient error: keep the last value.
    }
  },
}));

// Any change to recurring tasks can change the streak: recompute after it.
let pending: ReturnType<typeof setTimeout> | undefined;
useTaskStore.subscribe((state, prev) => {
  if (state.daily === prev.daily && state.weekly === prev.weekly) return;
  clearTimeout(pending);
  pending = setTimeout(() => void useStreakStore.getState().load(), 250);
});
