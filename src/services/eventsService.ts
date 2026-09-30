import { invoke } from "./tauri";
import type { CreateEventInput, Event, EventOccurrence, UpdateEventInput } from "../types/event";

export const eventsService = {
  createEvent: (input: CreateEventInput) => invoke<Event>("create_event", { input }),
  updateEvent: (input: UpdateEventInput) => invoke<Event>("update_event", { input }),
  deleteEvent: (id: string) => invoke<void>("delete_event", { id }),
  listOccurrences: (rangeStart: string, rangeEnd: string) =>
    invoke<EventOccurrence[]>("list_event_occurrences", { rangeStart, rangeEnd }),
};
