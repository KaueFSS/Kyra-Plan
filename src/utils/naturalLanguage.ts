import { DateTime } from "luxon";
import type { RecurrenceRule } from "../types/event";

/**
 * Understands short Portuguese phrases typed into quick-add fields, e.g.
 *   "Academia seg qua sex 18h"      → days Mon/Wed/Fri, 18:00
 *   "Prova amanhã 9h-11h"           → tomorrow, 09:00–11:00
 *   "Aula de cálculo 08:00 - 10:00" → 08:00–10:00
 *   "Reunião toda semana qui 14h"   → weekly, Thursday, 14:00
 * Whatever isn't recognised as a day/date/time stays as the title.
 */
export interface ParsedInput {
  title: string;
  /** Weekdays mentioned, 0 = Monday … 6 = Sunday. */
  days: number[];
  /** A specific calendar date mentioned ("amanhã", "15/10", "dia 3"). */
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  recurrence: RecurrenceRule | null;
  /** How long the task takes ("por 1h", "30 min", "2 horas") — gives it a countdown. */
  durationMinutes: number | null;
}

const DAY_PATTERNS: [RegExp, number][] = [
  [/seg(?:unda)?s?(?:-feiras?)?/, 0],
  [/ter(?:ca)?s?(?:-feiras?)?/, 1],
  [/qua(?:rta)?s?(?:-feiras?)?/, 2],
  [/qui(?:nta)?s?(?:-feiras?)?/, 3],
  [/sex(?:ta)?s?(?:-feiras?)?/, 4],
  [/sab(?:ado)?s?/, 5],
  [/dom(?:ingo)?s?/, 6],
];

const DAY_ALTERNATION = DAY_PATTERNS.map(([re]) => re.source).join("|");

function dayIndex(word: string): number | null {
  for (const [re, index] of DAY_PATTERNS) {
    if (new RegExp(`^(?:${re.source})$`).test(word)) return index;
  }
  return null;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function clock(hours: string, minutes?: string): string | null {
  const h = Number(hours);
  const m = minutes ? Number(minutes) : 0;
  if (h > 23 || m > 59) return null;
  return `${pad(h)}:${pad(m)}`;
}

/** Lower-cases and strips accents while keeping a 1:1 index mapping to the original. */
function normalize(text: string): string {
  return Array.from(text)
    .map((ch) => (ch.normalize("NFD").replace(/[̀-ͯ]/g, "") || ch)[0].toLowerCase())
    .join("");
}

export function parseNatural(text: string, now: DateTime = DateTime.now()): ParsedInput {
  const norm = normalize(text);
  const consumed = new Array<boolean>(text.length).fill(false);
  const result: ParsedInput = { title: "", days: [], date: null, startTime: null, endTime: null, recurrence: null, durationMinutes: null };

  const take = (re: RegExp, handle: (m: RegExpExecArray) => boolean) => {
    const global = new RegExp(re.source, "g");
    let m: RegExpExecArray | null;
    while ((m = global.exec(norm)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      if (m[0].length === 0) {
        global.lastIndex++;
        continue;
      }
      if (consumed.slice(start, end).some(Boolean)) continue;
      if (handle(m)) consumed.fill(true, start, end);
    }
  };

  const addDays = (...days: number[]) => {
    result.days = Array.from(new Set([...result.days, ...days])).sort((a, b) => a - b);
  };

  // Recurrence words first, so "todo dia" isn't read as a weekday.
  take(/\b(?:todos os dias|todo dia|diariamente)\b/, () => {
    result.recurrence = "daily";
    addDays(0, 1, 2, 3, 4, 5, 6);
    return true;
  });
  take(/\b(?:toda semana|todas as semanas|semanalmente|semanal)\b/, () => ((result.recurrence = "weekly"), true));
  take(/\b(?:todo mes|todos os meses|mensalmente|mensal)\b/, () => ((result.recurrence = "monthly"), true));

  // Explicit dates before times, so "15/10 às 14h" isn't read as "10 às 14h".
  take(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/, (m) => {
    const year = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : now.year;
    let date = DateTime.fromObject({ year, month: Number(m[2]), day: Number(m[1]) });
    if (!date.isValid) return false;
    if (!m[3] && date < now.startOf("day")) date = date.plus({ years: 1 });
    result.date = date.toISODate();
    return true;
  });
  take(/\bdia (\d{1,2})\b(?![h:])/, (m) => {
    let date = now.set({ day: Number(m[1]) });
    if (!date.isValid || date.day !== Number(m[1])) return false;
    if (date < now.startOf("day")) date = date.plus({ months: 1 });
    result.date = date.toISODate();
    return true;
  });

  // Durations, before clock times so "por 1h" isn't read as 01:00. Only
  // unambiguous forms count: a "por/durante" prefix, or a spelled-out unit.
  const setDuration = (minutes: number) => {
    if (minutes <= 0 || minutes > 24 * 60) return false;
    result.durationMinutes = minutes;
    return true;
  };
  take(/\b(?:por|durante)\s+(\d{1,2})\s*(?:h|horas?)\s*(?:e\s*)?(\d{1,2})?\s*(?:m|min|minutos?)?(?!\w)/, (m) =>
    setDuration(Number(m[1]) * 60 + Number(m[2] ?? 0)),
  );
  take(/\b(?:(?:por|durante)\s+)?(\d{1,3})\s*(?:min|mins|minutos?)\b/, (m) => setDuration(Number(m[1])));
  take(/\b(?:(?:por|durante)\s+)?(\d{1,2})\s+horas?\b/, (m) => setDuration(Number(m[1]) * 60));
  take(/\b(?:(?:por|durante)\s+)?(uma|meia)\s+hora\b/, (m) => setDuration(m[1] === "uma" ? 60 : 30));

  // Time range: "9h-11h", "09:00 - 10:30", "das 9 às 11h", "8h a 9h".
  take(
    /\b(?:(?:das|de)\s+)?(\d{1,2})(?:h(\d{2})?|:(\d{2}))?\s*(?:-|–|ate\s+as|ate|as|a)\s*(\d{1,2})(?:h(\d{2})?|:(\d{2}))?(?!\w)/,
    (m) => {
      if (!/[h:]/.test(m[0])) return false;
      const start = clock(m[1], m[2] ?? m[3]);
      const end = clock(m[4], m[5] ?? m[6]);
      if (!start || !end || end <= start) return false;
      result.startTime = start;
      result.endTime = end;
      return true;
    },
  );

  // Single time: "18h", "18:30", "18h30", "às 7h".
  take(/\b(?:(?:as|a)\s+)?(\d{1,2})(?:h(\d{2})?|:(\d{2}))(?!\w)/, (m) => {
    if (result.startTime) return false;
    const start = clock(m[1], m[2] ?? m[3]);
    if (!start) return false;
    result.startTime = start;
    return true;
  });

  // Day groups and ranges: "dias úteis", "fim de semana", "seg a sex".
  take(/\b(?:dias uteis|durante a semana)\b/, () => (addDays(0, 1, 2, 3, 4), true));
  take(/\b(?:fim de semana|fins de semana|fds)\b/, () => (addDays(5, 6), true));
  take(new RegExp(`\\b(${DAY_ALTERNATION})\\s+(?:a|ate)\\s+(${DAY_ALTERNATION})\\b`), (m) => {
    const from = dayIndex(m[1]);
    const to = dayIndex(m[2]);
    if (from === null || to === null) return false;
    for (let d = from; d !== (to + 1) % 7; d = (d + 1) % 7) addDays(d);
    return true;
  });
  take(new RegExp(`\\b(?:(na|no|nas|nos|toda|todo|todas|todos)\\s+)?(${DAY_ALTERNATION})\\b`), (m) => {
    const day = dayIndex(m[2]);
    if (day === null) return false;
    addDays(day);
    // "toda quinta" / "às segundas" (plural) mean every week, not just the next one.
    if ((m[1]?.startsWith("tod") || /s(?:-feiras)?$/.test(m[2])) && !result.recurrence) result.recurrence = "weekly";
    return true;
  });

  // Specific dates.
  take(/\bdepois de amanha\b/, () => ((result.date = now.plus({ days: 2 }).toISODate()), true));
  take(/\bamanha\b/, () => ((result.date = now.plus({ days: 1 }).toISODate()), true));
  take(/\bhoje\b/, () => ((result.date = now.toISODate()), true));

  result.title = buildTitle(text, consumed);
  return result;
}

const CONNECTORS = new Set(["as", "às", "a", "de", "das", "do", "e", "na", "no", "nas", "nos", "em", "para", ",", "-", "–"]);

/**
 * What's left after removing recognised parts. Small connector words
 * ("e", "às", "de"…) are dropped only when they sit next to a removed part
 * ("seg e qua" → ""), so titles like "Pão e leite" stay intact.
 */
function buildTitle(text: string, consumed: boolean[]): string {
  const tokens: { text: string; consumed: boolean }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const span = consumed.slice(m.index, m.index + m[0].length);
    tokens.push({ text: m[0], consumed: span.every(Boolean) });
    // Partially-consumed tokens keep only their unconsumed characters.
    if (!span.every(Boolean) && span.some(Boolean)) {
      tokens[tokens.length - 1].text = Array.from(m[0]).filter((_, i) => !span[i]).join("");
    }
  }

  const kept = tokens.filter((token, i) => {
    if (token.consumed || !token.text.trim()) return false;
    if (!CONNECTORS.has(token.text.toLowerCase())) return true;
    const prev = tokens[i - 1];
    const next = tokens[i + 1];
    return !(prev === undefined || prev.consumed || next === undefined || next.consumed);
  });

  const title = kept
    .map((t) => t.text)
    .join(" ")
    .replace(/[,;\-–]+$/, "")
    .trim();
  return title ? title[0].toUpperCase() + title.slice(1) : "";
}

/** First date on/after `from` that falls on `weekday` (0 = Monday). */
export function nextWeekday(weekday: number, from: DateTime = DateTime.now()): string {
  const current = from.weekday - 1;
  const ahead = (weekday - current + 7) % 7;
  return from.plus({ days: ahead }).toISODate()!;
}

export function addMinutesToClock(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(23 * 60 + 59, h * 60 + m + minutes);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

const SHORT_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function describeDays(days: number[]): string {
  if (days.length === 7) return "Todo dia";
  if (days.length === 5 && [0, 1, 2, 3, 4].every((d) => days.includes(d))) return "Seg a sex";
  if (days.length === 2 && days.includes(5) && days.includes(6)) return "Fim de semana";
  return days.map((d) => SHORT_DAYS[d]).join(", ");
}

/** Human-readable chips of what was understood, shown under quick-add fields. */
export function describeParsed(p: ParsedInput, now: DateTime = DateTime.now()): string[] {
  const chips: string[] = [];
  if (p.date) {
    const date = DateTime.fromISO(p.date).setLocale("pt-BR");
    const diff = Math.round(date.startOf("day").diff(now.startOf("day"), "days").days);
    chips.push(diff === 0 ? "Hoje" : diff === 1 ? "Amanhã" : date.toFormat("ccc, dd/MM"));
  }
  if (p.days.length > 0 && p.recurrence !== "daily") chips.push(describeDays(p.days));
  if (p.startTime) chips.push(p.endTime ? `${p.startTime}–${p.endTime}` : p.startTime);
  if (p.recurrence === "daily") chips.push("Todo dia");
  if (p.recurrence === "weekly") chips.push("Toda semana");
  if (p.recurrence === "monthly") chips.push("Todo mês");
  if (p.durationMinutes) chips.push(`Duração ${formatMinutes(p.durationMinutes)}`);
  return chips;
}

/** Preview chips for tasks: optional days, then time and duration. */
export function describeTask(p: ParsedInput, daysLabel?: string): string[] {
  return [
    ...(daysLabel ? [daysLabel] : []),
    ...(p.startTime ? [p.startTime] : []),
    ...(p.durationMinutes ? [`Duração ${formatMinutes(p.durationMinutes)}`] : []),
  ];
}

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${pad(m)}`;
}
