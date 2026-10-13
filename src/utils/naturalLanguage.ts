import { DateTime } from "luxon";
import type { RecurrenceRule } from "../types/event";
import type { Priority } from "../types/task";

/**
 * Understands short phrases in Portuguese or English typed into quick-add
 * fields, and any mix of the two:
 *   "Academia seg qua sex 18h"          → Mon/Wed/Fri, 18:00
 *   "Prova amanhã 9h-11h"               → tomorrow, 09:00–11:00
 *   "Call dentist tomorrow at 3pm"      → tomorrow, 15:00
 *   "Reunião toda quinta de manhã"      → weekly Thursday, 09:00
 *   "Pay rent in 3 days !!"             → 3 days from now, high priority
 *   "Estudar por 1h30 dia 15 de outubro" → 15 Oct, 90-minute countdown
 * Whatever isn't recognised as a day/date/time/duration/priority stays as the title.
 */
export interface ParsedInput {
  title: string;
  /** Weekdays mentioned, 0 = Monday … 6 = Sunday. */
  days: number[];
  /** A specific calendar date mentioned ("amanhã", "15/10", "dia 3", "oct 15", "in 3 days"). */
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  recurrence: RecurrenceRule | null;
  /** How long the task takes ("por 1h", "30 min", "for 2 hours") — gives it a countdown. */
  durationMinutes: number | null;
  /** "urgente", "urgent", "!!", "prioridade baixa"… */
  priority: Priority | null;
}

const DAY_PATTERNS: [RegExp, number][] = [
  [/seg(?:unda)?s?(?:-feiras?)?|mon(?:day)?s?/, 0],
  [/ter(?:ca)?s?(?:-feiras?)?|tue(?:s|sday)?s?/, 1],
  [/qua(?:rta)?s?(?:-feiras?)?|wed(?:nesday)?s?/, 2],
  [/qui(?:nta)?s?(?:-feiras?)?|thu(?:r|rs|rsday)?s?/, 3],
  [/sex(?:ta)?s?(?:-feiras?)?|fri(?:day)?s?/, 4],
  [/sab(?:ado)?s?|sat(?:urday)?s?/, 5],
  [/dom(?:ingo)?s?|sun(?:day)?s?/, 6],
];

const DAY_ALTERNATION = DAY_PATTERNS.map(([re]) => `(?:${re.source})`).join("|");

function dayIndex(word: string): number | null {
  for (const [re, index] of DAY_PATTERNS) {
    if (new RegExp(`^(?:${re.source})$`).test(word)) return index;
  }
  return null;
}

const MONTHS: Record<string, number> = {
  janeiro: 1, january: 1, jan: 1,
  fevereiro: 2, february: 2, fev: 2, feb: 2,
  marco: 3, march: 3, mar: 3,
  abril: 4, april: 4, abr: 4, apr: 4,
  maio: 5, may: 5, mai: 5,
  junho: 6, june: 6, jun: 6,
  julho: 7, july: 7, jul: 7,
  agosto: 8, august: 8, ago: 8, aug: 8,
  setembro: 9, september: 9, sept: 9, sep: 9, set: 9,
  outubro: 10, october: 10, out: 10, oct: 10,
  novembro: 11, november: 11, nov: 11,
  dezembro: 12, december: 12, dez: 12, dec: 12,
};
/** Month words are matched longest-first so "setembro" isn't read as "set". */
const MONTH_ALT = Object.keys(MONTHS)
  .sort((a, b) => b.length - a.length)
  .join("|");
/** For "month first" dates ("oct 15") skip short words that are also common words ("set 3 alarms"). */
const MONTH_FIRST_ALT = Object.keys(MONTHS)
  .filter((m) => !["set", "mar", "may", "mai", "out", "dec", "dez", "ago"].includes(m))
  .sort((a, b) => b.length - a.length)
  .join("|");

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function clock(hours: string | number, minutes?: string | number): string | null {
  const h = Number(hours);
  const m = minutes ? Number(minutes) : 0;
  if (h > 23 || m > 59) return null;
  return `${pad(h)}:${pad(m)}`;
}

/** 12-hour clock to 24-hour: 12am = 00, 12pm = 12, 3pm = 15. */
function to24(hour: number, meridiem?: string): number {
  if (meridiem === "pm") return hour < 12 ? hour + 12 : hour;
  if (meridiem === "am") return hour === 12 ? 0 : hour;
  return hour;
}

/** Lower-cases and strips accents while keeping a 1:1 index mapping to the original. */
function normalize(text: string): string {
  return Array.from(text)
    .map((ch) => (ch.normalize("NFD").replace(/[̀-ͯ]/g, "") || ch)[0].toLowerCase())
    .join("");
}

const H = "h(?:rs?|s)?"; // "18h", "18hs", "18hr", "18hrs"

export function parseNatural(text: string, now: DateTime = DateTime.now()): ParsedInput {
  const norm = normalize(text);
  const consumed = new Array<boolean>(text.length).fill(false);
  const result: ParsedInput = {
    title: "",
    days: [],
    date: null,
    startTime: null,
    endTime: null,
    recurrence: null,
    durationMinutes: null,
    priority: null,
  };

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

  const setDate = (date: DateTime) => {
    if (!date.isValid) return false;
    result.date = date.toISODate();
    return true;
  };

  /** A day/month that has already passed this year means next year. */
  const calendarDate = (day: number, month: number) => {
    let date = DateTime.fromObject({ year: now.year, month, day });
    if (!date.isValid) return false;
    if (date < now.startOf("day")) date = date.plus({ years: 1 });
    return setDate(date);
  };

  // Recurrence words first, so "todo dia" isn't read as a weekday.
  take(/\b(?:todos os dias|todo dia|diariamente|every ?day|daily)\b/, () => {
    result.recurrence = "daily";
    addDays(0, 1, 2, 3, 4, 5, 6);
    return true;
  });
  take(/\b(?:toda semana|todas as semanas|semanalmente|semanal|every week|weekly)\b/, () => ((result.recurrence = "weekly"), true));
  take(/\b(?:todo mes|todos os meses|mensalmente|mensal|every month|monthly)\b/, () => ((result.recurrence = "monthly"), true));

  // Priority: words ("urgente", "urgent", "asap", "prioridade alta/baixa") or an isolated "!".
  take(/\b(?:urgente|urgent|asap|prioridade alta|alta prioridade|high priority|priority high)\b/, () => ((result.priority = "high"), true));
  take(/\b(?:prioridade baixa|baixa prioridade|low priority|priority low|sem pressa)\b/, () => ((result.priority = "low"), true));
  take(/(?<!\S)!+(?!\S)/, () => ((result.priority = "high"), true));

  // Dates with a month name: "15 de outubro", "15 oct", "oct 15", "October 15th".
  take(
    new RegExp(`\\b(?:(?:dia|on(?: the)?)\\s+)?(\\d{1,2})(?:st|nd|rd|th|o)?\\s*(?:de\\s+|of\\s+)?(${MONTH_ALT})\\b`),
    (m) => calendarDate(Number(m[1]), MONTHS[m[2]]),
  );
  take(
    new RegExp(`\\b(?:on\\s+)?(${MONTH_FIRST_ALT})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?![h:\\d])`),
    (m) => calendarDate(Number(m[2]), MONTHS[m[1]]),
  );

  // Numeric dates before times, so "15/10 às 14h" isn't read as "10 às 14h".
  take(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/, (m) => {
    const year = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : now.year;
    let date = DateTime.fromObject({ year, month: Number(m[2]), day: Number(m[1]) });
    if (!date.isValid) return false;
    if (!m[3] && date < now.startOf("day")) date = date.plus({ years: 1 });
    return setDate(date);
  });
  take(/\b(?:dia|on the|the) (\d{1,2})(?:st|nd|rd|th)?\b(?![h:])/, (m) => {
    let date = now.set({ day: Number(m[1]) });
    if (!date.isValid || date.day !== Number(m[1])) return false;
    if (date < now.startOf("day")) date = date.plus({ months: 1 });
    return setDate(date);
  });

  // Relative dates: "em 3 dias", "in 2 weeks", "semana que vem", "next month".
  take(/\b(?:em|in)\s+(\d{1,2})\s+(dias?|days?|semanas?|weeks?|meses|mes|months?)\b/, (m) => {
    const n = Number(m[1]);
    const unit = /^(?:dia|day)/.test(m[2]) ? "days" : /^(?:sem|week)/.test(m[2]) ? "weeks" : "months";
    return setDate(now.plus({ [unit]: n }));
  });
  take(/\b(?:semana que vem|proxima semana|next week)\b/, () => setDate(now.plus({ weeks: 1 })));
  take(/\b(?:mes que vem|proximo mes|next month)\b/, () => setDate(now.plus({ months: 1 })));
  // "próxima segunda", "next friday", "esta sexta", "this friday", "sexta que vem".
  take(new RegExp(`\\b(?:(?:na|no|em|on)\\s+)?(proxim[ao]|next|esta|este|this)\\s+(${DAY_ALTERNATION})\\b`), (m) => {
    const day = dayIndex(m[2]);
    if (day === null) return false;
    const strictlyAfter = /^(?:proxim|next)/.test(m[1]);
    return setDate(DateTime.fromISO(nextWeekday(day, strictlyAfter ? now.plus({ days: 1 }) : now)));
  });
  take(new RegExp(`\\b(${DAY_ALTERNATION})\\s+que\\s+vem\\b`), (m) => {
    const day = dayIndex(m[1]);
    return day === null ? false : setDate(DateTime.fromISO(nextWeekday(day, now.plus({ days: 1 }))));
  });

  // Durations, before clock times so "por 1h" isn't read as 01:00. Only
  // unambiguous forms count: a "por/durante/for" prefix, or a spelled-out unit.
  const setDuration = (minutes: number) => {
    if (minutes <= 0 || minutes > 24 * 60) return false;
    result.durationMinutes = minutes;
    return true;
  };
  take(
    /\b(?:por|durante|for)\s+(\d{1,2})\s*(?:h|hr|hrs|horas?|hours?)\s*(?:e\s*|and\s*)?(\d{1,2})?\s*(?:m|min|minutos?|minutes?)?(?!\w)/,
    (m) => setDuration(Number(m[1]) * 60 + Number(m[2] ?? 0)),
  );
  take(/\b(?:(?:por|durante|for)\s+)?(\d{1,3})\s*(?:min|mins|minutos?|minutes?)\b/, (m) => setDuration(Number(m[1])));
  take(/\b(?:(?:por|durante|for)\s+)?(\d{1,2})\s+(?:horas?|hours?|hrs?)\b/, (m) => setDuration(Number(m[1]) * 60));
  take(/\b(?:(?:por|durante|for)\s+)?(uma|meia|an|one|half an|half)\s+(?:hora|hour)\b/, (m) =>
    setDuration(/^(?:uma|an|one)$/.test(m[1]) ? 60 : 30),
  );

  // 12-hour range: "2pm-4pm", "2-4pm", "from 2 to 4 pm".
  take(
    /\b(?:(?:das|de|from)\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|to|until|till|ate|as|a)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/,
    (m) => {
      const endMeridiem = m[6];
      const start = clock(to24(Number(m[1]), m[3] ?? endMeridiem), m[2]);
      const end = clock(to24(Number(m[4]), endMeridiem), m[5]);
      if (!start || !end || end <= start) return false;
      result.startTime = start;
      result.endTime = end;
      return true;
    },
  );

  // 24-hour range: "9h-11h", "09:00 - 10:30", "das 9 às 11h", "8h a 9h", "9h to 11h".
  take(
    new RegExp(
      `\\b(?:(?:das|de|from)\\s+)?(\\d{1,2})(?:${H}(\\d{2})?|:(\\d{2}))?\\s*(?:-|–|ate\\s+as|ate|as|a|to|until|till)\\s*(\\d{1,2})(?:${H}(\\d{2})?|:(\\d{2}))?(?!\\w)`,
    ),
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

  // Single time with am/pm: "3pm", "3:30 pm", "at 9 am".
  take(/\b(?:(?:as|at|a)\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/, (m) => {
    if (result.startTime) return false;
    const h = Number(m[1]);
    if (h < 1 || h > 12) return false;
    const start = clock(to24(h, m[3]), m[2]);
    if (!start) return false;
    result.startTime = start;
    return true;
  });

  // Single time: "18h", "18:30", "18h30", "18hs", "às 7h", "at 7:30".
  take(new RegExp(`\\b(?:(?:as|at|a)\\s+)?(\\d{1,2})(?:${H}(\\d{2})?|:(\\d{2}))(?!\\w)`), (m) => {
    if (result.startTime) return false;
    const start = clock(m[1], m[2] ?? m[3]);
    if (!start) return false;
    result.startTime = start;
    return true;
  });

  // Just an hour after "às/at/@": "às 7", "at 7", "@9".
  take(/(?:\b(?:as|at)\s+|@)(\d{1,2})(?![\w:])/, (m) => {
    if (result.startTime) return false;
    const start = clock(m[1]);
    if (!start) return false;
    result.startTime = start;
    return true;
  });

  // Named moments.
  take(/\b(?:meio[- ]?dia|noon|midday)\b/, () => {
    if (result.startTime) return false;
    result.startTime = "12:00";
    return true;
  });
  take(/\b(?:meia[- ]?noite|midnight)\b/, () => {
    if (result.startTime) return false;
    result.startTime = "00:00";
    return true;
  });
  take(/\b(?:tonight|esta noite)\b/, () => {
    result.date = now.toISODate();
    if (!result.startTime) result.startTime = "20:00";
    return true;
  });

  // Parts of the day: "de manhã", "à tarde", "7 da noite", "in the evening". With a
  // time they shift it to the right half of the day; alone they pick a typical hour.
  take(
    /\b(?:de|da|do|pela|pelo|na|no|a|as|in the|in|at|this|every|toda|todo)\s+(manha|tarde|noite|morning|afternoon|evening|night)\b/,
    (m) => {
      const afternoonish = /^(?:tarde|noite|afternoon|evening|night)$/.test(m[1]);
      if (result.startTime) {
        const [h, min] = result.startTime.split(":").map(Number);
        if (afternoonish && h >= 1 && h < 12) {
          result.startTime = clock(h + 12, min);
          if (result.endTime) {
            const [eh, emin] = result.endTime.split(":").map(Number);
            if (eh < 12 && `${pad(eh + 12)}:${pad(emin)}` > result.startTime!) result.endTime = clock(eh + 12, emin);
          }
        }
        return true;
      }
      result.startTime = { manha: "09:00", morning: "09:00", tarde: "15:00", afternoon: "15:00", noite: "20:00", evening: "19:00", night: "21:00" }[m[1]] ?? null;
      return result.startTime !== null;
    },
  );

  // Day groups and ranges: "dias úteis", "fim de semana", "weekdays", "seg a sex", "mon to fri".
  take(/\b(?:dias uteis|durante a semana|weekdays?)\b/, () => (addDays(0, 1, 2, 3, 4), true));
  take(/\b(?:fim de semana|fins de semana|fds|weekends?)\b/, () => (addDays(5, 6), true));
  take(new RegExp(`\\b(${DAY_ALTERNATION})\\s+(?:a|ate|to|through|thru)\\s+(${DAY_ALTERNATION})\\b`), (m) => {
    const from = dayIndex(m[1]);
    const to = dayIndex(m[2]);
    if (from === null || to === null) return false;
    for (let d = from; d !== (to + 1) % 7; d = (d + 1) % 7) addDays(d);
    return true;
  });
  take(new RegExp(`\\b(?:(na|no|nas|nos|toda|todo|todas|todos|on|every|each)\\s+)?(${DAY_ALTERNATION})\\b`), (m) => {
    const day = dayIndex(m[2]);
    if (day === null) return false;
    addDays(day);
    // "toda quinta" / "every thursday" / "às segundas" (plural) mean every week, not just the next one.
    if ((/^(?:tod|every|each)/.test(m[1] ?? "") || /s(?:-feiras)?$/.test(m[2])) && !result.recurrence) result.recurrence = "weekly";
    return true;
  });

  // Specific dates.
  take(/\b(?:depois de amanha|(?:the )?day after tomorrow)\b/, () => setDate(now.plus({ days: 2 })));
  take(/\b(?:amanha|tomorrow)\b/, () => setDate(now.plus({ days: 1 })));
  take(/\b(?:hoje|today)\b/, () => setDate(now));

  result.title = buildTitle(text, consumed);
  return result;
}

const CONNECTORS = new Set([
  "as", "às", "a", "de", "das", "do", "e", "na", "no", "nas", "nos", "em", "para", ",", "-", "–",
  "at", "on", "in", "for", "to", "the", "from", "until", "till", "and", "every", "each", "next", "this", "of", "@",
]);

/**
 * What's left after removing recognised parts. Small connector words
 * ("e", "às", "de", "at"…) are dropped only when they sit next to a removed
 * part ("seg e qua" → ""), so titles like "Pão e leite" stay intact.
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

const PRIORITY_CHIP: Record<Priority, string> = { high: "Prioridade alta", medium: "Prioridade média", low: "Prioridade baixa" };

/** Human-readable chips of what was understood, shown under quick-add fields. */
export function describeParsed(p: ParsedInput, now: DateTime = DateTime.now()): string[] {
  const chips: string[] = [];
  if (p.date) {
    const date = DateTime.fromISO(p.date).setLocale("pt-BR");
    const diff = Math.round(date.startOf("day").diff(now.startOf("day"), "days").days);
    chips.push(diff === 0 ? "Hoje" : diff === 1 ? "Amanhã" : date.toFormat("ccc, dd/MM").replace(/\./g, ""));
  }
  if (p.days.length > 0 && p.recurrence !== "daily") chips.push(describeDays(p.days));
  if (p.startTime) chips.push(p.endTime ? `${p.startTime}–${p.endTime}` : p.startTime);
  if (p.recurrence === "daily") chips.push("Todo dia");
  if (p.recurrence === "weekly") chips.push("Toda semana");
  if (p.recurrence === "monthly") chips.push("Todo mês");
  if (p.durationMinutes) chips.push(`Duração ${formatMinutes(p.durationMinutes)}`);
  if (p.priority) chips.push(PRIORITY_CHIP[p.priority]);
  return chips;
}

/** Preview chips for tasks: optional days, then time, duration and priority. */
export function describeTask(p: ParsedInput, daysLabel?: string): string[] {
  return [
    ...(daysLabel ? [daysLabel] : []),
    ...(p.startTime ? [p.startTime] : []),
    ...(p.durationMinutes ? [`Duração ${formatMinutes(p.durationMinutes)}`] : []),
    ...(p.priority ? [PRIORITY_CHIP[p.priority]] : []),
  ];
}

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h}h` : `${h}h${pad(m)}`;
}
