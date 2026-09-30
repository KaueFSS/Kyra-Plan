import type { IconType } from "../ui/icons";
import { AlarmClock, CalendarClock, CalendarDays, CalendarRange, CheckSquare, Clock, Globe2, ListChecks, Timeline, Timer } from "../ui/icons";
import type { WidgetType } from "../../types/dashboard";

export interface WidgetMeta {
  type: WidgetType;
  label: string;
  description: string;
  icon: IconType;
}

/** Everything that can be placed on a tab, in the order the catalog shows it. */
export const WIDGET_CATALOG: WidgetMeta[] = [
  { type: "today", label: "Linha do Dia", description: "Tudo de hoje em ordem, com o que é agora", icon: Timeline },
  { type: "calendar", label: "Calendário", description: "Mês com os dias que têm eventos", icon: CalendarDays },
  { type: "events", label: "Eventos", description: "Eventos do dia escolhido e próximos", icon: CalendarClock },
  { type: "schedule", label: "Programação Semanal", description: "Grade de horários da semana", icon: CalendarRange },
  { type: "daily-tasks", label: "Tarefas Diárias", description: "Hábitos que reiniciam todo dia", icon: CheckSquare },
  { type: "weekly-tasks", label: "Tarefas Semanais", description: "Quadro com um dia por coluna", icon: ListChecks },
  { type: "focus", label: "Foco", description: "Tarefa em andamento, timer e cronômetro", icon: Timer },
  { type: "time", label: "Relógios e Alarmes", description: "Relógio mundial e alarmes com abas", icon: Clock },
  { type: "world-clock", label: "Relógio Mundial", description: "Sua hora e outras cidades", icon: Globe2 },
  { type: "alarms", label: "Alarmes", description: "Alarmes com dias da semana", icon: AlarmClock },
];

export const WIDGET_META: Record<WidgetType, WidgetMeta> = Object.fromEntries(
  WIDGET_CATALOG.map((meta) => [meta.type, meta]),
) as Record<WidgetType, WidgetMeta>;
