import { invoke } from "./tauri";

export interface Settings {
  theme: string;
  accentColor: string;
  uiDensity: string;
  timeFormat: string;
  weekStart: string;
  timezone: string;
  dailyResetTime: string;
  dailyResetTimezone: string;
  taskNotificationsEnabled: boolean;
  timerSoundEnabled: boolean;
  timerDefaultPresetSeconds: number;
  launchOnStartup: boolean;
  minimizeToTray: boolean;
  /** Hours a finished one-off task stays in its list. */
  doneTasksVisibleHours: number;
  updatedAt: string;
}

export type UpdateSettingsInput = Omit<Settings, "updatedAt">;

export const settingsService = {
  get: () => invoke<Settings>("get_settings"),
  update: (input: UpdateSettingsInput) => invoke<Settings>("update_settings", { input }),
};
