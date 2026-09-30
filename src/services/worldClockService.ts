import { invoke } from "./tauri";
import type { CreateWorldClockInput, WorldClock } from "../types/worldClock";

export const worldClockService = {
  listClocks: () => invoke<WorldClock[]>("list_world_clocks"),
  createClock: (input: CreateWorldClockInput) => invoke<WorldClock>("create_world_clock", { input }),
  deleteClock: (id: string) => invoke<void>("delete_world_clock", { id }),
  reorderClocks: (orderedIds: string[]) => invoke<void>("reorder_world_clocks", { input: { orderedIds } }),
  listTimezones: () => invoke<[string, string][]>("list_timezones"),
};
