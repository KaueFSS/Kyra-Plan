import type { ParsedInput } from "./naturalLanguage";

/** What kind of thing a quick-add field creates — picks the shortcuts and the history it learns from. */
export type SmartKind = "task" | "daily" | "weekly" | "schedule" | "event" | "alarm";

/** Something typed before, with the details it usually came with. */
export interface SuggestionItem {
  title: string;
  /** Text the parser understands, e.g. "seg qua 18:00-19:00" (empty when there's nothing to remember). */
  details: string;
  uses: number;
  /** Sort key: most recently used first. */
  lastUsed: string;
}

/** Lower-case and accent-free, one character in → one out, so lengths line up with the original. */
export function fold(text: string): string {
  return Array.from(text)
    .map((ch) => (ch.normalize("NFD").replace(/[̀-ͯ]/g, "") || ch)[0].toLowerCase())
    .join("");
}

/**
 * Past titles that fit what's being typed: starts-with first, then a word
 * that starts with it, then anywhere. Within a group, the most used and the
 * most recent win. An exact match only shows if it can add details.
 */
export function matchSuggestions(typed: string, pool: SuggestionItem[], limit = 5): SuggestionItem[] {
  const q = fold(typed.trim());
  if (!q) return [];
  const scored: { item: SuggestionItem; rank: number }[] = [];
  for (const item of pool) {
    const title = fold(item.title);
    if (title === q && !item.details) continue;
    const rank = title.startsWith(q) ? 0 : title.split(/\s+/).some((w) => w.startsWith(q)) ? 1 : title.includes(q) ? 2 : -1;
    if (rank >= 0) scored.push({ item, rank });
  }
  return scored
    .sort((a, b) => a.rank - b.rank || b.item.uses - a.item.uses || b.item.lastUsed.localeCompare(a.item.lastUsed))
    .slice(0, limit)
    .map((s) => s.item);
}

/** The most used (then most recent) entries — shown when the field is empty. */
export function topSuggestions(pool: SuggestionItem[], limit = 4): SuggestionItem[] {
  return [...pool].sort((a, b) => b.uses - a.uses || b.lastUsed.localeCompare(a.lastUsed)).slice(0, limit);
}

/** Text to put in the field when a suggestion is accepted. */
export function suggestionText(item: SuggestionItem): string {
  return item.details ? `${item.title} ${item.details}` : item.title;
}

/** The completion of what's typed, if a suggestion starts with it ("Ing" → "lês"). */
export function ghostFor(typed: string, pool: SuggestionItem[]): { item: SuggestionItem; rest: string } | null {
  if (!typed.trim()) return null;
  const q = fold(typed);
  const item = matchSuggestions(typed, pool, 8).find((i) => fold(i.title).startsWith(q) && i.title.length > typed.length);
  return item ? { item, rest: item.title.slice(typed.length) } : null;
}

// ── Quick shortcuts under the field ───────────────────────────────────────

export type Dimension = "date" | "time" | "days" | "duration" | "priority" | "recurrence";

export interface QuickChip {
  label: string;
  /** Appended to the field as typed text. */
  insert: string;
  dim: Dimension;
}

const time = (hour: number): QuickChip => ({ label: `${hour}h`, insert: `${hour}h`, dim: "time" });
const range = (a: number, b: number): QuickChip => ({
  label: `${a}h–${b}h`,
  insert: `${String(a).padStart(2, "0")}:00-${String(b).padStart(2, "0")}:00`,
  dim: "time",
});
const day = (label: string, insert = label): QuickChip => ({ label, insert, dim: "date" });
const days = (label: string, insert: string): QuickChip => ({ label, insert, dim: "days" });
const length = (label: string, insert: string): QuickChip => ({ label, insert, dim: "duration" });
const urgent: QuickChip = { label: "Urgente", insert: "!!", dim: "priority" };

export const QUICK_CHIPS: Record<SmartKind, QuickChip[]> = {
  task: [day("Hoje"), day("Amanhã"), day("Sexta", "sexta"), day("Semana que vem", "semana que vem"), time(9), time(14), time(18), length("30 min", "por 30 min"), urgent],
  daily: [time(9), time(12), time(18), time(22), length("30 min", "por 30 min"), length("1 hora", "por 1 hora"), urgent],
  weekly: [days("Seg a sex", "seg a sex"), days("Fim de semana", "fim de semana"), time(9), time(14), time(18), length("30 min", "por 30 min"), length("1 hora", "por 1 hora"), urgent],
  schedule: [range(8, 9), range(9, 10), range(14, 15), range(19, 20), days("Seg a sex", "seg a sex"), days("Seg qua sex", "seg qua sex"), days("Ter qui", "ter qui")],
  event: [day("Hoje"), day("Amanhã"), day("Semana que vem", "semana que vem"), range(9, 10), range(14, 15), { label: "Toda semana", insert: "toda semana", dim: "recurrence" }],
  alarm: [
    { label: "06:00", insert: "06:00", dim: "time" },
    { label: "07:00", insert: "07:00", dim: "time" },
    { label: "12:00", insert: "12:00", dim: "time" },
    { label: "22:00", insert: "22:00", dim: "time" },
    days("Dias úteis", "dias úteis"),
    { label: "Todo dia", insert: "todo dia", dim: "recurrence" },
    days("Fim de semana", "fim de semana"),
  ],
};

/** Shortcuts that still make sense: hides the ones for things already in the text. */
export function chipsFor(kind: SmartKind, parsed: ParsedInput): QuickChip[] {
  const taken: Record<Dimension, boolean> = {
    date: !!parsed.date,
    time: !!parsed.startTime,
    days: parsed.days.length > 0,
    duration: !!parsed.durationMinutes,
    priority: !!parsed.priority,
    recurrence: !!parsed.recurrence,
  };
  return QUICK_CHIPS[kind].filter((c) => !taken[c.dim]);
}
