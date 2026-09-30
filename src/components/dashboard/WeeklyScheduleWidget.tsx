import { DateTime } from "luxon";
import { CalendarRange } from "../ui/icons";
import { useUiStore } from "../../stores/uiStore";
import { useLiveTick } from "../../hooks/useLiveTick";
import { WidgetCard } from "../ui/WidgetCard";
import { WeeklyTimetable } from "../schedule/WeeklyTimetable";
import { clockToMinutes, minutesOfDay, relativeLabel, remainingLabel } from "../../utils/timeHints";
import type { WeeklyScheduleBlock } from "../../types/schedule";

/** One line that answers "what now?" for today's timetable. */
function scheduleStatus(blocks: WeeklyScheduleBlock[], now: DateTime): { text: string; live: boolean } {
  const today = blocks
    .filter((b) => b.dayOfWeek === now.weekday - 1)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const clock = minutesOfDay(now);
  const current = today.find((b) => clockToMinutes(b.startTime) <= clock && clock < clockToMinutes(b.endTime));
  if (current) return { text: `Agora: ${current.title} · ${remainingLabel(clockToMinutes(current.endTime) - clock)}`, live: true };
  const next = today.find((b) => clockToMinutes(b.startTime) > clock);
  if (next) return { text: `Próximo: ${next.title} às ${next.startTime} · ${relativeLabel(clockToMinutes(next.startTime) - clock)}`, live: false };
  if (today.length > 0) return { text: `Hoje concluído · ${today.length} ${today.length === 1 ? "horário" : "horários"}`, live: false };
  return { text: "Nada hoje · clique numa célula para preencher", live: false };
}

export function WeeklyScheduleWidget({ blocks }: { blocks: WeeklyScheduleBlock[] }) {
  const { setPage } = useUiStore();
  const now = DateTime.fromMillis(useLiveTick(30_000));
  const status = scheduleStatus(blocks, now);

  return (
    <WidgetCard
      icon={CalendarRange}
      title="Programação Semanal"
      subtitle={<span className={status.live ? "font-medium text-accent-400" : undefined}>{status.text}</span>}
      onTitleClick={() => setPage("weekly-schedule")}
    >
      <WeeklyTimetable blocks={blocks} />
    </WidgetCard>
  );
}
