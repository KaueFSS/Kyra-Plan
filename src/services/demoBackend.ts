import { DateTime } from "luxon";
import type { Alarm } from "../types/alarm";
import type { DashboardTabRecord, WidgetPlacement } from "../types/dashboard";
import type { Event, EventOccurrence } from "../types/event";
import type { WeeklyScheduleBlock } from "../types/schedule";
import type { Task, TaskCompletion, TaskSession, TaskWithProgress } from "../types/task";
import type { Streak, StreakDay, TaskList } from "../types/taskList";
import type { TimerSnapshot } from "../types/timer";
import type { WorldClock } from "../types/worldClock";
import type { Settings } from "./settingsService";

/**
 * Stand-in for the Rust backend when the interface runs in a plain browser
 * (the online demo, `npm run dev`, screenshots). It answers the same
 * commands with the same shapes, keeping everything in memory: ticking a
 * task, creating an event or starting a timer works, and a reload starts
 * over. The real app never loads this file (see `services/tauri.ts`).
 */

type Args = Record<string, any> | undefined;

const nowIso = () => DateTime.utc().toFormat("yyyy-MM-dd HH:mm:ss");
const uid = () => crypto.randomUUID();
const zone = DateTime.local().zoneName || "UTC";
const today = () => DateTime.now().startOf("day");
const dow = (d: DateTime) => d.weekday - 1;
const at = (day: DateTime, time: string) => {
  const [h, m] = time.split(":").map(Number);
  return day.set({ hour: h, minute: m }).toUTC().toISO()!;
};

// ───────────────────────────── seed data ─────────────────────────────

// Links can try other colours: ?mode=light&tone=%23f3ede2&accent=%23c2410c
const query = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
const settings: Settings = {
  theme: query.get("mode") ?? "dark",
  accentColor: `${query.get("tone") ?? "#0d0d0d"}:${query.get("accent") ?? "#65676c"}`,
  uiDensity: "comfortable",
  timeFormat: "24h",
  weekStart: "monday",
  timezone: zone,
  dailyResetTime: "00:00",
  dailyResetTimezone: zone,
  taskNotificationsEnabled: true,
  timerSoundEnabled: true,
  timerDefaultPresetSeconds: 1500,
  launchOnStartup: false,
  minimizeToTray: true,
  doneTasksVisibleHours: 3,
  updatedAt: nowIso(),
};

const taskLists: TaskList[] = [
  { id: "inbox", name: "Tarefas", color: "#2b8af7", position: 0, createdAt: nowIso(), updatedAt: nowIso() },
  { id: "estudos", name: "Faculdade", color: "#c7962f", position: 1, createdAt: nowIso(), updatedAt: nowIso() },
  { id: "casa", name: "Casa", color: "#30a46c", position: 2, createdAt: nowIso(), updatedAt: nowIso() },
];

let sortCounter = 0;
function makeTask(partial: Partial<Task> & Pick<Task, "title" | "taskType">): Task {
  return {
    id: uid(),
    description: "",
    priority: "medium",
    status: "pending",
    durationSeconds: null,
    scheduledTime: null,
    recurrenceDays: null,
    startDate: today().minus({ days: 20 }).toISODate()!,
    endDate: null,
    sortOrder: sortCounter++,
    listId: null,
    completedAt: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...partial,
  };
}

const tasks: Task[] = [
  makeTask({ title: "Beber 2 litros de água", taskType: "daily", scheduledTime: "08:00" }),
  makeTask({ title: "Estudar Rust", taskType: "daily", scheduledTime: "09:30", durationSeconds: 3600 }),
  makeTask({ title: "Academia", taskType: "daily", scheduledTime: "18:00", durationSeconds: 3600 }),
  makeTask({ title: "Ler 20 páginas", taskType: "daily", scheduledTime: "21:00" }),
  makeTask({ title: "Meditar 10 minutos", taskType: "daily", scheduledTime: "22:00", durationSeconds: 600 }),
  makeTask({ title: "Treino de pernas", taskType: "weekly", recurrenceDays: [0, 3], scheduledTime: "18:00" }),
  makeTask({ title: "Aula de inglês", taskType: "weekly", recurrenceDays: [1, 3], scheduledTime: "14:00", durationSeconds: 3600 }),
  makeTask({ title: "Revisão semanal", taskType: "weekly", recurrenceDays: [6], scheduledTime: "20:00", priority: "high" }),
  makeTask({ title: "Ir ao mercado", taskType: "weekly", recurrenceDays: [5], scheduledTime: "10:00" }),
  makeTask({ title: "Backup dos projetos", taskType: "weekly", recurrenceDays: [4] }),
  makeTask({ title: "Foco: projeto Kyra Plan", taskType: "timed", durationSeconds: 25 * 60, priority: "high" }),
  makeTask({ title: "Entregar relatório de estágio", taskType: "single", listId: "inbox", priority: "high", scheduledTime: "17:00", startDate: today().toISODate()! }),
  makeTask({ title: "Renovar passaporte", taskType: "single", listId: "inbox", startDate: today().plus({ days: 3 }).toISODate()! }),
  makeTask({ title: "Responder o e-mail da recrutadora", taskType: "single", listId: "inbox", priority: "high" }),
  makeTask({ title: "Comprar presente da Ana", taskType: "single", listId: "inbox", startDate: today().plus({ days: 6 }).toISODate()! }),
  makeTask({ title: "Prova de Banco de Dados", taskType: "single", listId: "estudos", priority: "high", startDate: today().plus({ days: 4 }).toISODate()!, scheduledTime: "08:00" }),
  makeTask({ title: "Resumo de Sistemas Operacionais", taskType: "single", listId: "estudos" }),
  makeTask({ title: "Lista de exercícios de Cálculo", taskType: "single", listId: "estudos", startDate: today().plus({ days: 2 }).toISODate()! }),
  makeTask({ title: "Trocar a lâmpada da sala", taskType: "single", listId: "casa" }),
  makeTask({ title: "Pagar o condomínio", taskType: "single", listId: "casa", priority: "high", startDate: today().plus({ days: 1 }).toISODate()! }),
];
tasks.find((t) => t.title === "Resumo de Sistemas Operacionais")!.status = "completed";
tasks.find((t) => t.title === "Resumo de Sistemas Operacionais")!.completedAt = nowIso();

const completions: TaskCompletion[] = [];
function setCompletion(task: Task, date: string, completed: boolean) {
  const found = completions.find((c) => c.taskId === task.id && c.cycleDate === date);
  if (found) {
    found.completed = completed;
    found.completedAt = completed ? nowIso() : null;
    return found;
  }
  const created: TaskCompletion = { id: uid(), taskId: task.id, cycleDate: date, completed, completedAt: completed ? nowIso() : null };
  completions.push(created);
  return created;
}
const isDue = (t: Task, d: DateTime) => (t.taskType === "daily" ? true : t.taskType === "weekly" ? !!t.recurrenceDays?.includes(dow(d)) : false);

// The last two weeks: a clean recent run, with two slips further back.
(() => {
  const dailies = tasks.filter((t) => t.taskType === "daily");
  for (let back = 1; back <= 13; back++) {
    const day = today().minus({ days: back });
    const date = day.toISODate()!;
    dailies.forEach((t, i) => setCompletion(t, date, !((back === 5 && i === 3) || (back === 9 && i === 0))));
    tasks.filter((t) => t.taskType === "weekly" && isDue(t, day)).forEach((t) => setCompletion(t, date, back !== 9));
  }
  const date = today().toISODate()!;
  dailies.slice(0, 3).forEach((t) => setCompletion(t, date, true));
  const sunday = tasks.find((t) => t.title === "Backup dos projetos")!;
  if (isDue(sunday, today())) setCompletion(sunday, date, true);
})();

const events: Event[] = (() => {
  const mk = (title: string, dayOffset: number, from: string, to: string, color: string, rule: Event["recurrenceRule"] = "none", description = ""): Event => {
    const day = today().plus({ days: dayOffset });
    return { id: uid(), title, description, startAt: at(day, from), endAt: at(day, to), color, recurrenceRule: rule, recurrenceUntil: null, createdAt: nowIso(), updatedAt: nowIso() };
  };
  return [
    mk("Alinhamento do time", -dow(today()), "09:00", "09:30", "#2b8af7", "weekly"),
    mk("Jantar com a família", 0, "20:00", "21:30", "#c9557f"),
    mk("Almoço com a equipe", 0, "12:30", "13:30", "#30a46c"),
    mk("Reunião com o orientador", 1, "15:00", "16:00", "#c7962f"),
    mk("Revisão de código", 2, "10:00", "11:00", "#2aa198"),
    mk("Entrevista técnica", 3, "14:00", "15:30", "#c9557f", "none", "Preparar: arquitetura do projeto e perguntas sobre Rust."),
    mk("Prova de Banco de Dados", 4, "08:00", "10:00", "#d0683f"),
    mk("Futebol com os amigos", 5, "19:00", "21:00", "#30a46c", "weekly"),
    mk("Aniversário da Ana", 6, "20:00", "23:00", "#c9557f"),
    mk("Reunião de planejamento", -2, "11:00", "12:00", "#5f86a6"),
    mk("Entrega do trabalho final", 9, "23:00", "23:59", "#d0683f"),
    mk("Pagamento do aluguel", 12, "09:00", "09:30", "#6b7a90", "monthly"),
  ];
})();

const blocks: WeeklyScheduleBlock[] = (() => {
  const out: WeeklyScheduleBlock[] = [];
  const add = (days: number[], start: string, end: string, title: string, color: string) =>
    days.forEach((d) => out.push({ id: uid(), dayOfWeek: d, startTime: start, endTime: end, title, description: "", color, createdAt: nowIso(), updatedAt: nowIso() }));
  add([0, 1, 2, 3, 4], "08:00", "12:00", "Faculdade", "#2b8af7");
  add([0, 1, 2, 3, 4], "13:30", "17:30", "Trabalho", "#2aa198");
  add([0, 2, 4], "18:00", "19:00", "Academia", "#30a46c");
  add([1, 3], "19:30", "20:30", "Inglês", "#c7962f");
  add([1, 3], "20:30", "21:30", "Projeto pessoal", "#c9557f");
  add([5], "09:00", "11:00", "Estudo livre", "#5f86a6");
  add([5], "16:00", "18:00", "Futebol", "#30a46c");
  add([6], "10:00", "12:00", "Planejar a semana", "#d0683f");
  return out;
})();

const alarms: Alarm[] = [
  { id: uid(), label: "Acordar", time: "06:30", days: [0, 1, 2, 3, 4], sound: "classic", enabled: true, notify: true, lastTriggeredAt: null, createdAt: nowIso(), updatedAt: nowIso() },
  { id: uid(), label: "Hora do remédio", time: "13:00", days: [], sound: "classic", enabled: true, notify: true, lastTriggeredAt: null, createdAt: nowIso(), updatedAt: nowIso() },
  { id: uid(), label: "Academia", time: "17:30", days: [0, 2, 4], sound: "classic", enabled: true, notify: true, lastTriggeredAt: null, createdAt: nowIso(), updatedAt: nowIso() },
  { id: uid(), label: "Dormir cedo", time: "23:00", days: [], sound: "classic", enabled: false, notify: true, lastTriggeredAt: null, createdAt: nowIso(), updatedAt: nowIso() },
];

const clocks: WorldClock[] = [
  { id: uid(), city: "São Paulo", timezone: "America/Sao_Paulo", position: 0, createdAt: nowIso() },
  { id: uid(), city: "Lisboa", timezone: "Europe/Lisbon", position: 1, createdAt: nowIso() },
  { id: uid(), city: "Nova York", timezone: "America/New_York", position: 2, createdAt: nowIso() },
  { id: uid(), city: "Tóquio", timezone: "Asia/Tokyo", position: 3, createdAt: nowIso() },
];

const timezones: [string, string][] = [
  ["São Paulo", "America/Sao_Paulo"],
  ["Nova York", "America/New_York"],
  ["Los Angeles", "America/Los_Angeles"],
  ["Londres", "Europe/London"],
  ["Lisboa", "Europe/Lisbon"],
  ["Paris", "Europe/Paris"],
  ["Berlim", "Europe/Berlin"],
  ["Dubai", "Asia/Dubai"],
  ["Tóquio", "Asia/Tokyo"],
  ["Sydney", "Australia/Sydney"],
];

const widget = (type: WidgetPlacement["type"], x: number, y: number, w: number, h: number, extra: Partial<WidgetPlacement> = {}): WidgetPlacement => ({ i: extra.i ?? type, type, x, y, w, h, ...extra });
const tabs: DashboardTabRecord[] = [
  {
    id: "home",
    name: "Início",
    position: 0,
    layout: JSON.stringify([
      widget("calendar", 0, 0, 3, 6),
      widget("schedule", 3, 0, 9, 6),
      widget("daily-tasks", 0, 6, 3, 6, { i: "daily" }),
      widget("weekly-tasks", 3, 6, 9, 6, { i: "weekly" }),
    ]),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "estudos",
    name: "Estudos",
    position: 1,
    layout: JSON.stringify([
      widget("focus", 0, 0, 4, 4),
      widget("calendar", 0, 4, 4, 8),
      widget("tasks", 4, 0, 4, 8, { i: "tasks-estudos", listId: "estudos" }),
      widget("events", 4, 8, 4, 4),
      widget("today", 8, 0, 4, 8),
      widget("world-clock", 8, 8, 4, 4, { i: "clock" }),
    ]),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "planejamento",
    name: "Planejamento",
    position: 2,
    layout: JSON.stringify([
      widget("weekly-tasks", 0, 0, 12, 6, { i: "weekly" }),
      widget("tasks", 0, 6, 4, 6, { i: "tasks-inbox", listId: "inbox" }),
      widget("alarms", 4, 6, 4, 6),
      widget("events", 8, 6, 4, 6),
    ]),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

// ───────────────────────────── helpers ─────────────────────────────

function sessionSeconds(s: { elapsedSeconds: number; status: string; startedAt: string | null }): number {
  if (s.status !== "running" || !s.startedAt) return s.elapsedSeconds;
  return s.elapsedSeconds + Math.max(0, Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000));
}

const taskSessions = new Map<string, TaskSession>();

function withProgress(task: Task): TaskWithProgress {
  const date = today().toISODate()!;
  const mine = completions.filter((c) => c.taskId === task.id);
  return {
    ...task,
    completion: mine.find((c) => c.cycleDate === date) ?? null,
    activeSession: taskSessions.get(task.id) ?? null,
    history: mine.filter((c) => c.cycleDate >= today().minus({ days: 14 }).toISODate()!),
  };
}

const byOrder = (a: Task, b: Task) => a.sortOrder - b.sortOrder;

function streak(): Streak {
  const recent: StreakDay[] = [];
  for (let back = 13; back >= 0; back--) {
    const day = today().minus({ days: back });
    const date = day.toISODate()!;
    const due = tasks.filter((t) => isDue(t, day));
    const done = due.filter((t) => completions.some((c) => c.taskId === t.id && c.cycleDate === date && c.completed)).length;
    const result = back === 0 ? "today" : due.length === 0 ? "empty" : done === due.length ? "perfect" : "missed";
    recent.push({ date, result, done, total: due.length });
  }
  const last = recent[recent.length - 1];
  let current = last.total > 0 && last.done === last.total ? 1 : 0;
  for (let i = recent.length - 2; i >= 0; i--) {
    if (recent[i].result === "perfect") current++;
    else if (recent[i].result === "missed") break;
  }
  return { current, best: Math.max(current, 12), todayDone: last.done, todayTotal: last.total, recent };
}

function occurrences(rangeStart: string, rangeEnd: string): EventOccurrence[] {
  const from = DateTime.fromISO(rangeStart);
  const to = DateTime.fromISO(rangeEnd);
  const out: EventOccurrence[] = [];
  for (const e of events) {
    const length = DateTime.fromISO(e.endAt).diff(DateTime.fromISO(e.startAt));
    const unit = e.recurrenceRule === "daily" ? { days: 1 } : e.recurrenceRule === "weekly" ? { weeks: 1 } : e.recurrenceRule === "monthly" ? { months: 1 } : null;
    let start = DateTime.fromISO(e.startAt);
    for (let guard = 0; guard < 800; guard++) {
      if (start > to) break;
      const end = start.plus(length);
      if (end >= from) out.push({ ...e, occurrenceStart: start.toUTC().toISO()!, occurrenceEnd: end.toUTC().toISO()! });
      if (!unit) break;
      start = start.plus(unit);
      if (e.recurrenceUntil && start > DateTime.fromISO(e.recurrenceUntil)) break;
    }
  }
  return out.sort((a, b) => a.occurrenceStart.localeCompare(b.occurrenceStart));
}

const timers: Record<string, TimerSnapshot | undefined> = {};
const snapshot = (t: TimerSnapshot): TimerSnapshot => ({ ...t, elapsedSecondsNow: sessionSeconds(t) });

function pick<T extends { id: string }>(list: T[], id: string): T {
  const found = list.find((x) => x.id === id);
  if (!found) throw "Não encontrado.";
  return found;
}

function reorder<T extends { id: string }>(list: T[], ids: string[], key: "sortOrder" | "position") {
  ids.forEach((id, i) => {
    const item = list.find((x) => x.id === id);
    if (item) Object.assign(item, { [key]: i });
  });
}

// ───────────────────────────── commands ─────────────────────────────

const commands: Record<string, (a: Record<string, any>) => unknown> = {
  get_settings: () => settings,
  update_settings: ({ input }) => Object.assign(settings, input, { updatedAt: nowIso() }),
  get_streak: streak,
  list_timezones: () => timezones,
  search: ({ query }) => {
    const q = String(query ?? "").trim().toLowerCase();
    if (!q) return [];
    const has = (s: string) => s.toLowerCase().includes(q);
    return [
      ...tasks.filter((t) => has(t.title)).map((t) => ({ kind: "task", id: t.id, title: t.title, subtitle: `Tarefa · ${t.taskType}` })),
      ...events.filter((e) => has(e.title)).map((e) => ({ kind: "event", id: e.id, title: e.title, subtitle: `Evento · ${e.startAt}` })),
      ...alarms.filter((a) => has(a.label)).map((a) => ({ kind: "alarm", id: a.id, title: a.label, subtitle: `Alarme · ${a.time}` })),
      ...blocks.filter((b) => has(b.title)).map((b) => ({ kind: "schedule_block", id: b.id, title: b.title, subtitle: `Programação · ${b.startTime}` })),
    ].slice(0, 20);
  },

  // tasks
  list_daily_tasks: () => tasks.filter((t) => t.taskType === "daily").sort(byOrder).map(withProgress),
  list_weekly_tasks: () => tasks.filter((t) => t.taskType === "weekly").sort(byOrder).map(withProgress),
  list_timed_tasks: () => tasks.filter((t) => t.taskType === "timed").sort(byOrder).map(withProgress),
  list_single_tasks: () => {
    const limit = Date.now() - settings.doneTasksVisibleHours * 3_600_000;
    return tasks
      .filter((t) => t.taskType === "single" && (!t.completedAt || new Date(t.completedAt.replace(" ", "T") + "Z").getTime() >= limit))
      .sort(byOrder)
      .map(withProgress);
  },
  create_task: ({ input }) => {
    const single = input.taskType === "single";
    const task = makeTask({
      ...input,
      listId: single ? (input.listId ?? "inbox") : null,
      sortOrder: Math.max(-1, ...tasks.map((t) => t.sortOrder)) + 1,
    });
    tasks.push(task);
    return task;
  },
  update_task: ({ input }) => {
    const task = pick(tasks, input.id);
    return Object.assign(task, input, { updatedAt: nowIso() });
  },
  delete_task: ({ id }) => {
    const i = tasks.findIndex((t) => t.id === id);
    if (i >= 0) tasks.splice(i, 1);
  },
  reorder_tasks: ({ orderedIds }) => reorder(tasks, orderedIds, "sortOrder"),
  toggle_task_completion: ({ taskId }) => {
    const task = pick(tasks, taskId);
    const date = today().toISODate()!;
    const current = completions.find((c) => c.taskId === task.id && c.cycleDate === date);
    return setCompletion(task, date, !current?.completed);
  },
  toggle_single_task: ({ id }) => {
    const task = pick(tasks, id);
    const done = task.status !== "completed";
    task.status = done ? "completed" : "pending";
    task.completedAt = done ? nowIso() : null;
    return task;
  },
  move_task_to_list: ({ taskId, listId }) => Object.assign(pick(tasks, taskId), { listId }),

  // task lists
  list_task_lists: () => [...taskLists].sort((a, b) => a.position - b.position),
  create_task_list: ({ name, color }) => {
    const list: TaskList = { id: uid(), name, color, position: taskLists.length, createdAt: nowIso(), updatedAt: nowIso() };
    taskLists.push(list);
    return list;
  },
  update_task_list: ({ id, name, color }) => Object.assign(pick(taskLists, id), { name, color, updatedAt: nowIso() }),
  delete_task_list: ({ id }) => {
    const i = taskLists.findIndex((l) => l.id === id);
    if (i >= 0) taskLists.splice(i, 1);
    tasks.forEach((t) => {
      if (t.listId === id) t.listId = "inbox";
    });
  },

  // timed tasks
  start_timed_task: ({ taskId }) => {
    const task = pick(tasks, taskId);
    const session: TaskSession = {
      id: uid(),
      taskId,
      cycleDate: today().toISODate()!,
      status: "running",
      durationSeconds: task.durationSeconds ?? 1500,
      elapsedSeconds: 0,
      startedAt: new Date().toISOString(),
      pausedAt: null,
      completedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    taskSessions.set(taskId, session);
    return session;
  },
  pause_timed_task: ({ sessionId }) => {
    const s = [...taskSessions.values()].find((x) => x.id === sessionId);
    if (!s) throw "Sessão não encontrada.";
    s.elapsedSeconds = sessionSeconds(s);
    return Object.assign(s, { status: "paused", startedAt: null, pausedAt: new Date().toISOString() });
  },
  resume_timed_task: ({ sessionId }) => {
    const s = [...taskSessions.values()].find((x) => x.id === sessionId);
    if (!s) throw "Sessão não encontrada.";
    return Object.assign(s, { status: "running", startedAt: new Date().toISOString(), pausedAt: null });
  },
  restart_timed_task: ({ sessionId }) => {
    const s = [...taskSessions.values()].find((x) => x.id === sessionId);
    if (!s) throw "Sessão não encontrada.";
    return Object.assign(s, { status: "running", elapsedSeconds: 0, startedAt: new Date().toISOString(), pausedAt: null });
  },
  cancel_timed_task: ({ sessionId }) => {
    for (const [key, s] of taskSessions) if (s.id === sessionId) taskSessions.delete(key);
  },
  check_timed_task: ({ sessionId }) => {
    const s = [...taskSessions.values()].find((x) => x.id === sessionId);
    if (!s) throw "Sessão não encontrada.";
    if (s.status === "running" && sessionSeconds(s) >= s.durationSeconds) {
      Object.assign(s, { status: "completed", elapsedSeconds: s.durationSeconds, startedAt: null, completedAt: nowIso() });
      const task = tasks.find((t) => t.id === s.taskId);
      if (task) setCompletion(task, s.cycleDate, true);
    }
    return s;
  },

  // events
  list_event_occurrences: ({ rangeStart, rangeEnd }) => occurrences(rangeStart, rangeEnd),
  create_event: ({ input }) => {
    const event: Event = { id: uid(), description: "", color: "#2b8af7", recurrenceRule: "none", recurrenceUntil: null, ...input, createdAt: nowIso(), updatedAt: nowIso() };
    events.push(event);
    return event;
  },
  update_event: ({ input }) => Object.assign(pick(events, input.id), input, { updatedAt: nowIso() }),
  delete_event: ({ id }) => {
    const i = events.findIndex((e) => e.id === id);
    if (i >= 0) events.splice(i, 1);
  },

  // weekly schedule
  list_schedule_blocks: () => blocks,
  create_schedule_block: ({ input }) => {
    const block: WeeklyScheduleBlock = { id: uid(), description: "", color: "#2b8af7", ...input, createdAt: nowIso(), updatedAt: nowIso() };
    blocks.push(block);
    return block;
  },
  update_schedule_block: ({ input }) => Object.assign(pick(blocks, input.id), input, { updatedAt: nowIso() }),
  delete_schedule_block: ({ id }) => {
    const i = blocks.findIndex((b) => b.id === id);
    if (i >= 0) blocks.splice(i, 1);
  },

  // alarms
  list_alarms: () => alarms,
  create_alarm: ({ input }) => {
    const alarm: Alarm = { id: uid(), label: "", sound: "classic", enabled: true, notify: true, lastTriggeredAt: null, ...input, createdAt: nowIso(), updatedAt: nowIso() };
    alarms.push(alarm);
    return alarm;
  },
  update_alarm: ({ input }) => Object.assign(pick(alarms, input.id), input, { updatedAt: nowIso() }),
  set_alarm_enabled: ({ id, enabled }) => Object.assign(pick(alarms, id), { enabled, updatedAt: nowIso() }),
  delete_alarm: ({ id }) => {
    const i = alarms.findIndex((a) => a.id === id);
    if (i >= 0) alarms.splice(i, 1);
  },

  // world clocks
  list_world_clocks: () => [...clocks].sort((a, b) => a.position - b.position),
  create_world_clock: ({ input }) => {
    const clock: WorldClock = { id: uid(), ...input, position: clocks.length, createdAt: nowIso() };
    clocks.push(clock);
    return clock;
  },
  delete_world_clock: ({ id }) => {
    const i = clocks.findIndex((c) => c.id === id);
    if (i >= 0) clocks.splice(i, 1);
  },
  reorder_world_clocks: ({ input }) => reorder(clocks, input.orderedIds, "position"),

  // timer and stopwatch
  get_active_timer: ({ kind }) => (timers[kind] && timers[kind]!.status !== "completed" && timers[kind]!.status !== "cancelled" ? snapshot(timers[kind]!) : null),
  start_timer: ({ kind, label, durationSeconds }) => {
    const t: TimerSnapshot = {
      id: uid(),
      kind,
      label: label ?? "",
      durationSeconds: durationSeconds ?? null,
      elapsedSeconds: 0,
      status: "running",
      startedAt: new Date().toISOString(),
      pausedAt: null,
      laps: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
      elapsedSecondsNow: 0,
    };
    timers[kind] = t;
    return snapshot(t);
  },
  pause_timer: ({ id }) => {
    const t = Object.values(timers).find((x) => x?.id === id);
    if (!t) throw "Timer não encontrado.";
    t.elapsedSeconds = sessionSeconds(t);
    Object.assign(t, { status: "paused", startedAt: null, pausedAt: new Date().toISOString() });
    return snapshot(t);
  },
  resume_timer: ({ id }) => {
    const t = Object.values(timers).find((x) => x?.id === id);
    if (!t) throw "Timer não encontrado.";
    Object.assign(t, { status: "running", startedAt: new Date().toISOString(), pausedAt: null });
    return snapshot(t);
  },
  restart_timer: ({ id }) => {
    const t = Object.values(timers).find((x) => x?.id === id);
    if (!t) throw "Timer não encontrado.";
    Object.assign(t, { status: "running", elapsedSeconds: 0, laps: [], startedAt: new Date().toISOString(), pausedAt: null });
    return snapshot(t);
  },
  cancel_timer: ({ id }) => {
    for (const k of Object.keys(timers)) if (timers[k]?.id === id) timers[k] = undefined;
  },
  check_timer: ({ id }) => {
    const t = Object.values(timers).find((x) => x?.id === id);
    if (!t) throw "Timer não encontrado.";
    if (t.status === "running" && t.durationSeconds && sessionSeconds(t) >= t.durationSeconds) {
      Object.assign(t, { status: "completed", elapsedSeconds: t.durationSeconds, startedAt: null });
    }
    return snapshot(t);
  },
  add_timer_lap: ({ id }) => {
    const t = Object.values(timers).find((x) => x?.id === id);
    if (!t) throw "Timer não encontrado.";
    t.laps = [...t.laps, sessionSeconds(t)];
    return snapshot(t);
  },

  // dashboard tabs
  list_dashboard_tabs: () => [...tabs].sort((a, b) => a.position - b.position),
  create_dashboard_tab: ({ name, layout }) => {
    const tab: DashboardTabRecord = { id: uid(), name, position: tabs.length, layout, createdAt: nowIso(), updatedAt: nowIso() };
    tabs.push(tab);
    return tab;
  },
  update_dashboard_tab: ({ id, name, layout }) => Object.assign(pick(tabs, id), { name, layout, updatedAt: nowIso() }),
  delete_dashboard_tab: ({ id }) => {
    if (tabs.length <= 1) throw "Não dá para apagar a última guia.";
    tabs.splice(
      tabs.findIndex((t) => t.id === id),
      1,
    );
  },
  reorder_dashboard_tabs: ({ orderedIds }) => reorder(tabs, orderedIds, "position"),
  restore_home_tab: () => {
    const home = tabs.find((t) => t.id === "home");
    if (home) return home;
    const created: DashboardTabRecord = { id: "home", name: "Início", position: -1, layout: "[]", createdAt: nowIso(), updatedAt: nowIso() };
    tabs.unshift(created);
    return created;
  },
};

export async function demoInvoke<T>(command: string, args?: Args): Promise<T> {
  const handler = commands[command];
  if (!handler) throw `Comando "${command}" não existe na demonstração.`;
  return JSON.parse(JSON.stringify(handler(args ?? {}) ?? null)) as T;
}
