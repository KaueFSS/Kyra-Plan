import { create } from "zustand";
import { alarmsService } from "../services/alarmsService";
import type { Alarm, CreateAlarmInput, UpdateAlarmInput } from "../types/alarm";

interface AlarmState {
  alarms: Alarm[];
  loading: boolean;
  load: () => Promise<void>;
  create: (input: CreateAlarmInput) => Promise<void>;
  update: (input: UpdateAlarmInput) => Promise<void>;
  setEnabled: (id: string, enabled: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useAlarmStore = create<AlarmState>((set, get) => ({
  alarms: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    const alarms = await alarmsService.listAlarms();
    set({ alarms, loading: false });
  },

  create: async (input) => {
    await alarmsService.createAlarm(input);
    await get().load();
  },

  update: async (input) => {
    await alarmsService.updateAlarm(input);
    await get().load();
  },

  setEnabled: async (id, enabled) => {
    await alarmsService.setEnabled(id, enabled);
    await get().load();
  },

  remove: async (id) => {
    await alarmsService.deleteAlarm(id);
    await get().load();
  },
}));
