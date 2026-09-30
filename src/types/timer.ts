export type TimerKind = "timer" | "stopwatch";
export type TimerStatus = "idle" | "running" | "paused" | "completed" | "cancelled";

export interface TimerSession {
  id: string;
  kind: TimerKind;
  label: string;
  durationSeconds: number | null;
  elapsedSeconds: number;
  status: TimerStatus;
  startedAt: string | null;
  pausedAt: string | null;
  laps: number[];
  createdAt: string;
  updatedAt: string;
}

export interface TimerSnapshot extends TimerSession {
  elapsedSecondsNow: number;
}
