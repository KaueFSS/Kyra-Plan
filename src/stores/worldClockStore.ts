import { create } from "zustand";
import { worldClockService } from "../services/worldClockService";
import type { WorldClock } from "../types/worldClock";

interface WorldClockState {
  clocks: WorldClock[];
  availableTimezones: [string, string][];
  loading: boolean;
  load: () => Promise<void>;
  loadTimezones: () => Promise<void>;
  addCity: (city: string, timezone: string) => Promise<void>;
  removeCity: (id: string) => Promise<void>;
  reorder: (orderedIds: string[]) => Promise<void>;
}

export const useWorldClockStore = create<WorldClockState>((set, get) => ({
  clocks: [],
  availableTimezones: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    const clocks = await worldClockService.listClocks();
    set({ clocks, loading: false });
  },

  loadTimezones: async () => {
    const availableTimezones = await worldClockService.listTimezones();
    set({ availableTimezones });
  },

  addCity: async (city, timezone) => {
    await worldClockService.createClock({ city, timezone });
    await get().load();
  },

  removeCity: async (id) => {
    await worldClockService.deleteClock(id);
    await get().load();
  },

  reorder: async (orderedIds) => {
    set({ clocks: orderedIds.map((id) => get().clocks.find((c) => c.id === id)!).filter(Boolean) });
    await worldClockService.reorderClocks(orderedIds);
  },
}));
