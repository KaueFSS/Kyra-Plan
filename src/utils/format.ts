export const WEEKDAY_LABELS_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const WEEKDAY_LABELS_LONG = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];

export function formatDuration(totalSeconds: number, alwaysShowHours = false): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  if (hours > 0 || alwaysShowHours) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function formatStopwatch(totalMs: number): string {
  const safe = Math.max(0, Math.floor(totalMs));
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  const centis = Math.floor((safe % 1000) / 10);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(minutes)}:${pad(seconds)}.${pad(centis)}`;
}

export function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}


export function alarmDaysLabel(days: number[]): string {
  if (days.length === 0 || days.length === 7) return "Todos os dias";
  if (days.length === 5 && [0, 1, 2, 3, 4].every((d) => days.includes(d))) return "Seg a sex";
  if (days.length === 2 && [5, 6].every((d) => days.includes(d))) return "Fim de semana";
  return days.map((d) => WEEKDAY_LABELS_SHORT[d]).join(", ");
}
