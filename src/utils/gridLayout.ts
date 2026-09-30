import type { WidgetPlacement, WidgetType } from "../types/dashboard";

export const GRID_COLS = 12;
export const GRID_ROWS = 12;

export interface WidgetSize {
  w: number;
  h: number;
  minW: number;
  minH: number;
}

/** Default and minimum size of each widget on the 12x12 grid. */
export const WIDGET_SIZES: Record<WidgetType, WidgetSize> = {
  calendar: { w: 3, h: 7, minW: 3, minH: 5 },
  events: { w: 3, h: 5, minW: 2, minH: 3 },
  schedule: { w: 6, h: 7, minW: 4, minH: 4 },
  "daily-tasks": { w: 3, h: 5, minW: 2, minH: 3 },
  "weekly-tasks": { w: 6, h: 5, minW: 4, minH: 3 },
  focus: { w: 3, h: 4, minW: 3, minH: 3 },
  time: { w: 3, h: 5, minW: 2, minH: 3 },
  "world-clock": { w: 3, h: 5, minW: 2, minH: 3 },
  alarms: { w: 3, h: 5, minW: 2, minH: 3 },
  today: { w: 3, h: 8, minW: 3, minH: 4 },
};

function collides(a: Omit<WidgetPlacement, "i" | "type">, b: WidgetPlacement): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * First top-left position where a `w`x`h` widget fits without overlapping
 * anything, scanning row by row. Tries the default size, then shrinks
 * towards the widget's minimum. Returns null when the tab is full.
 */
export function findFreeSpot(widgets: WidgetPlacement[], type: WidgetType): { x: number; y: number; w: number; h: number } | null {
  const size = WIDGET_SIZES[type];
  const candidates: [number, number][] = [];
  for (let h = size.h; h >= size.minH; h--) {
    for (let w = size.w; w >= size.minW; w--) candidates.push([w, h]);
  }

  for (const [w, h] of candidates) {
    for (let y = 0; y + h <= GRID_ROWS; y++) {
      for (let x = 0; x + w <= GRID_COLS; x++) {
        const rect = { x, y, w, h };
        if (!widgets.some((placed) => collides(rect, placed))) return rect;
      }
    }
  }
  return null;
}

const place = (type: WidgetType, x: number, y: number, w: number, h: number): WidgetPlacement => ({ i: type, type, x, y, w, h });

/** The "everything in one place" tab — must match the seed in migration 0010. */
export const HOME_LAYOUT: WidgetPlacement[] = [
  place("calendar", 0, 0, 3, 7),
  { ...place("schedule", 3, 0, 6, 7) },
  place("focus", 9, 0, 3, 3),
  { ...place("daily-tasks", 9, 3, 3, 4), i: "daily" },
  place("events", 0, 7, 3, 5),
  { ...place("weekly-tasks", 3, 7, 6, 5), i: "weekly" },
  place("time", 9, 7, 3, 5),
];

export interface TabTemplate {
  id: string;
  name: string;
  description: string;
  widgets: WidgetPlacement[];
}

export const TAB_TEMPLATES: TabTemplate[] = [
  { id: "blank", name: "Em branco", description: "Comece do zero e adicione só o que quiser", widgets: [] },
  {
    id: "study",
    name: "Estudos",
    description: "Grade de horários, foco, tarefas do dia e da semana",
    widgets: [place("schedule", 0, 0, 8, 7), place("focus", 8, 0, 4, 4), place("daily-tasks", 8, 4, 4, 8), place("weekly-tasks", 0, 7, 8, 5)],
  },
  {
    id: "day",
    name: "Meu Dia",
    description: "Linha do dia, foco, tarefas de hoje e programação",
    widgets: [place("today", 0, 0, 4, 12), place("focus", 4, 0, 4, 5), place("daily-tasks", 4, 5, 4, 7), place("schedule", 8, 0, 4, 12)],
  },
  {
    id: "planning",
    name: "Planejamento",
    description: "Calendário, eventos, programação e semana",
    widgets: [place("calendar", 0, 0, 4, 7), place("events", 0, 7, 4, 5), place("schedule", 4, 0, 8, 7), place("weekly-tasks", 4, 7, 8, 5)],
  },
  {
    id: "time",
    name: "Relógio",
    description: "Timer/cronômetro, relógio mundial e alarmes",
    widgets: [place("focus", 0, 0, 6, 12), place("world-clock", 6, 0, 6, 6), place("alarms", 6, 6, 6, 6)],
  },
];

export function parseLayout(json: string): WidgetPlacement[] {
  try {
    const value = JSON.parse(json) as unknown;
    return Array.isArray(value) ? (value as WidgetPlacement[]) : [];
  } catch {
    return [];
  }
}
