import { describe, expect, it } from "vitest";
import { GRID_COLS, GRID_ROWS, HOME_LAYOUT, TAB_TEMPLATES, findFreeSpot } from "./gridLayout";
import type { WidgetPlacement } from "../types/dashboard";

function overlaps(widgets: WidgetPlacement[]): boolean {
  const cells = new Set<string>();
  for (const w of widgets) {
    for (let x = w.x; x < w.x + w.w; x++) {
      for (let y = w.y; y < w.y + w.h; y++) {
        const key = `${x},${y}`;
        if (cells.has(key)) return true;
        cells.add(key);
      }
    }
  }
  return false;
}

describe("gridLayout", () => {
  it("places a widget in the top-left of an empty tab at its default size", () => {
    expect(findFreeSpot([], "calendar")).toEqual({ x: 0, y: 0, w: 3, h: 7 });
  });

  it("finds the next free area without overlapping", () => {
    const spot = findFreeSpot([{ i: "a", type: "schedule", x: 0, y: 0, w: 6, h: 7 }], "events");
    expect(spot).toEqual({ x: 6, y: 0, w: 3, h: 5 });
  });

  it("shrinks towards the minimum size when space is tight, then gives up", () => {
    const almostFull: WidgetPlacement[] = [{ i: "a", type: "schedule", x: 0, y: 0, w: 10, h: 12 }];
    expect(findFreeSpot(almostFull, "events")).toEqual({ x: 10, y: 0, w: 2, h: 5 });
    const full: WidgetPlacement[] = [{ i: "a", type: "schedule", x: 0, y: 0, w: 12, h: 12 }];
    expect(findFreeSpot(full, "events")).toBeNull();
  });

  it("ships home and template layouts that fit the grid without overlaps", () => {
    for (const layout of [HOME_LAYOUT, ...TAB_TEMPLATES.map((t) => t.widgets)]) {
      expect(overlaps(layout)).toBe(false);
      expect(layout.every((w) => w.x + w.w <= GRID_COLS && w.y + w.h <= GRID_ROWS)).toBe(true);
    }
  });
});
