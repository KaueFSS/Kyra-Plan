import { invoke } from "./tauri";
import type {
  CreateWeeklyScheduleBlockInput,
  UpdateWeeklyScheduleBlockInput,
  WeeklyScheduleBlock,
} from "../types/schedule";

export const scheduleService = {
  listBlocks: () => invoke<WeeklyScheduleBlock[]>("list_schedule_blocks"),
  createBlock: (input: CreateWeeklyScheduleBlockInput) => invoke<WeeklyScheduleBlock>("create_schedule_block", { input }),
  updateBlock: (input: UpdateWeeklyScheduleBlockInput) => invoke<WeeklyScheduleBlock>("update_schedule_block", { input }),
  deleteBlock: (id: string) => invoke<void>("delete_schedule_block", { id }),
};
