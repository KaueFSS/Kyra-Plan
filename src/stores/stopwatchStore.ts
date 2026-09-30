import { create } from "zustand";
import { timerService } from "../services/timerService";
import type { TimerSnapshot } from "../types/timer";

interface StopwatchState {
  snapshot: TimerSnapshot | null;
  loading: boolean;
  load: () => Promise<void>;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  restart: () => Promise<void>;
  cancel: () => Promise<void>;
  lap: () => Promise<void>;
}

export const useStopwatchStore = create<StopwatchState>((set, get) => ({
  snapshot: null,
  loading: false,

  load: async () => {
    set({ loading: true });
    const snapshot = await timerService.getActive("stopwatch");
    set({ snapshot, loading: false });
  },

  start: async () => {
    const snapshot = await timerService.start("stopwatch");
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

  lap: async () => {
    const current = get().snapshot;
    if (!current) return;
    const snapshot = await timerService.addLap(current.id);
    set({ snapshot });
  },
}));
