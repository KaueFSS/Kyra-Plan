import { create } from "zustand";
import { timerService } from "../services/timerService";
import type { TimerSnapshot } from "../types/timer";

interface TimerState {
  snapshot: TimerSnapshot | null;
  loading: boolean;
  load: () => Promise<void>;
  start: (durationSeconds: number, label?: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  restart: () => Promise<void>;
  cancel: () => Promise<void>;
  /** Polled roughly once a second while running to detect real completion. */
  check: () => Promise<void>;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  snapshot: null,
  loading: false,

  load: async () => {
    set({ loading: true });
    const snapshot = await timerService.getActive("timer");
    set({ snapshot, loading: false });
  },

  start: async (durationSeconds, label) => {
    const snapshot = await timerService.start("timer", label, durationSeconds);
    set({ snapshot });
  },

  pause: async () => {
    const current = get().snapshot;
    if (!current) return;
    const snapshot = await timerService.pause(current.id);
    set({ snapshot });
  },

  resume: async () => {
    const current = get().snapshot;
    if (!current) return;
    const snapshot = await timerService.resume(current.id);
    set({ snapshot });
  },

  restart: async () => {
    const current = get().snapshot;
    if (!current) return;
    const snapshot = await timerService.restart(current.id);
    set({ snapshot });
  },

  cancel: async () => {
    const current = get().snapshot;
    if (!current) return;
    await timerService.cancel(current.id);
    set({ snapshot: null });
  },

  check: async () => {
    const current = get().snapshot;
    if (!current || current.status !== "running") return;
    const snapshot = await timerService.check(current.id);
    set({ snapshot });
  },
}));
