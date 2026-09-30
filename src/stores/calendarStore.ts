import { create } from "zustand";
import { DateTime } from "luxon";
import { eventsService } from "../services/eventsService";
import type { CreateEventInput, EventOccurrence, UpdateEventInput } from "../types/event";

export type CalendarView = "month" | "week" | "day";

interface CalendarState {
  view: CalendarView;
  focusedDate: string; // ISO date, drives which month/week/day is shown
  occurrences: EventOccurrence[];
  loading: boolean;
  error: string | null;

  setView: (view: CalendarView) => void;
  setFocusedDate: (date: string) => void;
  loadRange: (rangeStartIso: string, rangeEndIso: string) => Promise<void>;
  createEvent: (input: CreateEventInput, rangeStartIso: string, rangeEndIso: string) => Promise<void>;
  updateEvent: (input: UpdateEventInput, rangeStartIso: string, rangeEndIso: string) => Promise<void>;
  deleteEvent: (id: string, rangeStartIso: string, rangeEndIso: string) => Promise<void>;
  /** Drag-and-drop: moves an occurrence to another day, keeping its time of day. */
  moveEventToDate: (occurrence: EventOccurrence, targetDateIso: string, rangeStartIso: string, rangeEndIso: string) => Promise<void>;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  view: "month",
  focusedDate: new Date().toISOString().slice(0, 10),
  occurrences: [],
  loading: false,
  error: null,

  setView: (view) => set({ view }),
  setFocusedDate: (date) => set({ focusedDate: date }),

  loadRange: async (rangeStartIso, rangeEndIso) => {
    set({ loading: true, error: null });
    try {
      const occurrences = await eventsService.listOccurrences(rangeStartIso, rangeEndIso);
      set({ occurrences, loading: false });
    } catch {
      set({ loading: false, error: "Falha ao carregar eventos." });
    }
  },

  createEvent: async (input, rangeStartIso, rangeEndIso) => {
    await eventsService.createEvent(input);
    const occurrences = await eventsService.listOccurrences(rangeStartIso, rangeEndIso);
    set({ occurrences });
  },

  updateEvent: async (input, rangeStartIso, rangeEndIso) => {
    await eventsService.updateEvent(input);
    const occurrences = await eventsService.listOccurrences(rangeStartIso, rangeEndIso);
    set({ occurrences });
  },

  deleteEvent: async (id, rangeStartIso, rangeEndIso) => {
    await eventsService.deleteEvent(id);
    const occurrences = await eventsService.listOccurrences(rangeStartIso, rangeEndIso);
    set({ occurrences });
  },

  moveEventToDate: async (occurrence, targetDateIso, rangeStartIso, rangeEndIso) => {
    const occurrenceDay = DateTime.fromISO(occurrence.occurrenceStart).startOf("day");
    const targetDay = DateTime.fromISO(targetDateIso).startOf("day");
    const deltaDays = Math.round(targetDay.diff(occurrenceDay, "days").days);
    if (deltaDays === 0) return;

    // Shifting the base event (not just this occurrence) keeps recurring
    // series consistent: the whole series moves by the same number of days.
    const shift = (iso: string) => DateTime.fromISO(iso).plus({ days: deltaDays }).toUTC().toISO()!;
    set({
      occurrences: get().occurrences.map((occ) =>
        occ.id === occurrence.id
          ? { ...occ, occurrenceStart: shift(occ.occurrenceStart), occurrenceEnd: shift(occ.occurrenceEnd) }
          : occ,
      ),
    });

    try {
      await eventsService.updateEvent({
        id: occurrence.id,
        title: occurrence.title,
        description: occurrence.description,
        startAt: shift(occurrence.startAt),
        endAt: shift(occurrence.endAt),
        color: occurrence.color,
        recurrenceRule: occurrence.recurrenceRule,
        recurrenceUntil: occurrence.recurrenceUntil,
      });
    } finally {
      const occurrences = await eventsService.listOccurrences(rangeStartIso, rangeEndIso);
      set({ occurrences });
    }
  },
}));
