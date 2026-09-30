import { AlarmClock, CalendarClock, CalendarRange, CheckSquare, type IconType } from "../ui/icons";
import type { AgendaKind } from "../../utils/todayAgenda";

export const AGENDA_KIND: Record<AgendaKind, { label: string; icon: IconType }> = {
  aula: { label: "Programação", icon: CalendarRange },
  evento: { label: "Evento", icon: CalendarClock },
  tarefa: { label: "Tarefa", icon: CheckSquare },
  alarme: { label: "Alarme", icon: AlarmClock },
};

export function clockLabel(minutes: number): string {
  const m = Math.min(minutes, 24 * 60 - 1);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
