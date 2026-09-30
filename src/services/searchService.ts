import { invoke } from "./tauri";

export type SearchResultKind = "task" | "event" | "alarm" | "schedule_block";

export interface SearchResult {
  kind: SearchResultKind;
  id: string;
  title: string;
  subtitle: string;
}

export const searchService = {
  search: (query: string) => invoke<SearchResult[]>("search", { query }),
};
