import { invoke } from "./tauri";
import type { TimerKind, TimerSnapshot } from "../types/timer";

export const timerService = {
  getActive: (kind: TimerKind) => invoke<TimerSnapshot | null>("get_active_timer", { kind }),
  start: (kind: TimerKind, label?: string, durationSeconds?: number) =>
    invoke<TimerSnapshot>("start_timer", { kind, label, durationSeconds }),
  pause: (id: string) => invoke<TimerSnapshot>("pause_timer", { id }),
  resume: (id: string) => invoke<TimerSnapshot>("resume_timer", { id }),
  restart: (id: string) => invoke<TimerSnapshot>("restart_timer", { id }),
  cancel: (id: string) => invoke<void>("cancel_timer", { id }),
  check: (id: string) => invoke<TimerSnapshot>("check_timer", { id }),
  addLap: (id: string) => invoke<TimerSnapshot>("add_timer_lap", { id }),
};
