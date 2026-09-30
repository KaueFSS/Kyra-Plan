export type WidgetType =
  | "calendar"
  | "events"
  | "schedule"
  | "daily-tasks"
  | "weekly-tasks"
  | "focus"
  | "time"
  | "world-clock"
  | "alarms"
  | "today";

/** A widget's place on a tab's 12x12 grid. */
export interface WidgetPlacement {
  i: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** As stored by the backend: `layout` is a JSON string of `WidgetPlacement[]`. */
export interface DashboardTabRecord {
  id: string;
  name: string;
  position: number;
  layout: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardTab {
  id: string;
  name: string;
  position: number;
  widgets: WidgetPlacement[];
}
