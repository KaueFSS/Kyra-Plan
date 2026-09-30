import { invoke } from "./tauri";
import type { Alarm, CreateAlarmInput, UpdateAlarmInput } from "../types/alarm";

export const alarmsService = {
  listAlarms: () => invoke<Alarm[]>("list_alarms"),
  createAlarm: (input: CreateAlarmInput) => invoke<Alarm>("create_alarm", { input }),
  updateAlarm: (input: UpdateAlarmInput) => invoke<Alarm>("update_alarm", { input }),
  setEnabled: (id: string, enabled: boolean) => invoke<Alarm>("set_alarm_enabled", { id, enabled }),
  deleteAlarm: (id: string) => invoke<void>("delete_alarm", { id }),
};
