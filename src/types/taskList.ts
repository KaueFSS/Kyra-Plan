export interface TaskList {
  id: string;
  name: string;
  color: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export type DayResult = "perfect" | "missed" | "empty" | "today";

export interface StreakDay {
  date: string;
  result: DayResult;
  done: number;
  total: number;
}

export interface Streak {
  current: number;
  best: number;
  todayDone: number;
  todayTotal: number;
  /** Last 14 days, oldest first, ending today. */
  recent: StreakDay[];
}
