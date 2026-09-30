import { create } from "zustand";
import { scheduleService } from "../services/scheduleService";
import type { CreateWeeklyScheduleBlockInput, UpdateWeeklyScheduleBlockInput, WeeklyScheduleBlock } from "../types/schedule";

interface ScheduleState {
  blocks: WeeklyScheduleBlock[];
  loading: boolean;
  load: () => Promise<void>;
  create: (input: CreateWeeklyScheduleBlockInput) => Promise<void>;
  update: (input: UpdateWeeklyScheduleBlockInput) => Promise<void>;
  /** Drag/resize: applied locally first so the block stays where it was dropped. */
  reschedule: (id: string, dayOfWeek: number, startTime: string, endTime: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  blocks: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    const blocks = await scheduleService.listBlocks();
    set({ blocks, loading: false });
  },

  create: async (input) => {
    await scheduleService.createBlock(input);
    await get().load();
  },

  update: async (input) => {
    await scheduleService.updateBlock(input);
    await get().load();
  },

  reschedule: async (id, dayOfWeek, startTime, endTime) => {
    const block = get().blocks.find((b) => b.id === id);
    if (!block) return;
    set({ blocks: get().blocks.map((b) => (b.id === id ? { ...b, dayOfWeek, startTime, endTime } : b)) });
    try {
      await scheduleService.updateBlock({
        id,
        dayOfWeek,
        startTime,
        endTime,
        title: block.title,
        description: block.description,
        color: block.color,
      });
    } catch {
      await get().load();
    }
  },

  remove: async (id) => {
    await scheduleService.deleteBlock(id);
    await get().load();
  },
}));
