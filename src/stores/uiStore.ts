import { create } from "zustand";

export type Page =
  | "dashboard"
  | "calendar"
  | "daily-tasks"
  | "weekly-tasks"
  | "weekly-schedule"
  | "timer"
  | "alarms"
  | "world-clock"
  | "settings";

interface UiState {
  activePage: Page;
  searchOpen: boolean;
  /** Day picked in the calendar widget; the events widget follows it, on any tab. */
  selectedDate: string;
  setPage: (page: Page) => void;
  openSearch: () => void;
  closeSearch: () => void;
  setSelectedDate: (date: string) => void;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const useUiStore = create<UiState>((set) => ({
  activePage: "dashboard",
  searchOpen: false,
  selectedDate: todayIso(),
  setPage: (page) => set({ activePage: page, searchOpen: false }),
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
  setSelectedDate: (date) => set({ selectedDate: date }),
}));
