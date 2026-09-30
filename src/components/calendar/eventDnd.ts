import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { DragPayload, DropTarget } from "../dnd/types";
import type { EventOccurrence } from "../../types/event";

/** Makes an event occurrence draggable onto any calendar day. */
export function useEventDraggable(occurrence: EventOccurrence, scope: string) {
  const payload: DragPayload = { type: "event", occurrence };
  return useDraggable({ id: `event-${scope}-${occurrence.id}-${occurrence.occurrenceStart}`, data: payload });
}

/** Makes a calendar day cell accept dropped events. */
export function useDayDroppable(dateIso: string, scope: string) {
  const target: DropTarget = { accepts: "event", date: dateIso };
  return useDroppable({ id: `cal-day-${scope}-${dateIso}`, data: target });
}
