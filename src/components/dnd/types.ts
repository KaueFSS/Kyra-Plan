import type { WeeklyScheduleBlock } from "../../types/schedule";
import type { EventOccurrence } from "../../types/event";

/** What is being dragged. Stored as the draggable's `data`. */
export type DragPayload =
  | { type: "schedule-block"; block: WeeklyScheduleBlock }
  | { type: "weekly-task"; taskId: string; fromDay: number; title: string; color: string }
  | { type: "event"; occurrence: EventOccurrence }
  | { type: "daily-task"; taskId: string; title: string }
  | { type: "world-clock"; clockId: string; title: string }
  | { type: "list-task"; taskId: string; listId: string; title: string; color: string };

/** What a drop zone accepts. Stored as the droppable's `data`. */
export type DropTarget =
  /** A day of the weekly schedule. With `minutePx` (a time-axis view) the vertical drag also shifts the time; without it the time stays. */
  | { accepts: "schedule-day"; day: number; minutePx?: number }
  | { accepts: "weekly-task"; day: number }
  | { accepts: "event"; date: string }
  | { accepts: "daily-task"; taskId: string }
  | { accepts: "world-clock"; clockId: string }
  | { accepts: "list-task"; listId: string };
