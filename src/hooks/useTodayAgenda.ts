import { useMemo } from "react";
import { DateTime } from "luxon";
import { useTaskStore } from "../stores/taskStore";
import { useCalendarStore } from "../stores/calendarStore";
import { useScheduleStore } from "../stores/scheduleStore";
import { useAlarmStore } from "../stores/alarmStore";
import { useLiveTick } from "./useLiveTick";
import { buildTodayAgenda, type AgendaItem } from "../utils/todayAgenda";

/** Today's merged agenda from every store, refreshed every 20s. */
export function useTodayAgenda(): { agenda: AgendaItem[]; now: DateTime } {
  const blocks = useScheduleStore((s) => s.blocks);
  const occurrences = useCalendarStore((s) => s.occurrences);
  const daily = useTaskStore((s) => s.daily);
  const weekly = useTaskStore((s) => s.weekly);
  const alarms = useAlarmStore((s) => s.alarms);
  const tick = useLiveTick(20_000);
  const minute = Math.floor(tick / 60_000);

  return useMemo(() => {
    const now = DateTime.now();
    return { agenda: buildTodayAgenda({ blocks, occurrences, daily, weekly, alarms }, now), now };
    // `minute` re-evaluates the statuses as the clock moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, occurrences, daily, weekly, alarms, minute]);
}
