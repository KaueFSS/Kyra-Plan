import { useTaskStore } from "../../stores/taskStore";
import { useCalendarStore } from "../../stores/calendarStore";
import { useAlarmStore } from "../../stores/alarmStore";
import { useWorldClockStore } from "../../stores/worldClockStore";
import { useScheduleStore } from "../../stores/scheduleStore";
import { useUiStore } from "../../stores/uiStore";
import { MiniCalendarWidget } from "../dashboard/MiniCalendarWidget";
import { EventsWidget } from "../dashboard/EventsWidget";
import { DailyTasksWidget } from "../dashboard/DailyTasksWidget";
import { WeeklyTasksWidget } from "../dashboard/WeeklyTasksWidget";
import { WeeklyScheduleWidget } from "../dashboard/WeeklyScheduleWidget";
import { FocusWidget } from "../dashboard/FocusWidget";
import { TimeWidget } from "../dashboard/TimeWidget";
import { ClockWidget } from "../dashboard/ClockWidget";
import { AlarmsWidget } from "../dashboard/AlarmsWidget";
import { TodayTimelineWidget } from "../agenda/TodayTimelineWidget";
import type { WidgetType } from "../../types/dashboard";

/**
 * Draws one widget by type, pulling its data from the shared stores — so
 * the same widget shows the same live data on every tab it's placed on.
 */
export function WidgetRenderer({ type, range }: { type: WidgetType; range: { start: string; end: string } }) {
  const daily = useTaskStore((s) => s.daily);
  const weekly = useTaskStore((s) => s.weekly);
  const occurrences = useCalendarStore((s) => s.occurrences);
  const alarms = useAlarmStore((s) => s.alarms);
  const clocks = useWorldClockStore((s) => s.clocks);
  const blocks = useScheduleStore((s) => s.blocks);
  const { selectedDate, setSelectedDate } = useUiStore();

  switch (type) {
    case "calendar":
      return <MiniCalendarWidget occurrences={occurrences} selectedDate={selectedDate} onSelectDate={setSelectedDate} />;
    case "events":
      return <EventsWidget occurrences={occurrences} selectedDate={selectedDate} range={range} />;
    case "schedule":
      return <WeeklyScheduleWidget blocks={blocks} />;
    case "daily-tasks":
      return <DailyTasksWidget tasks={daily} />;
    case "weekly-tasks":
      return <WeeklyTasksWidget tasks={weekly} />;
    case "focus":
      return <FocusWidget />;
    case "time":
      return <TimeWidget clocks={clocks} alarms={alarms} />;
    case "world-clock":
      return <ClockWidget clocks={clocks} />;
    case "alarms":
      return <AlarmsWidget alarms={alarms} />;
    case "today":
      return <TodayTimelineWidget />;
    default:
      return null;
  }
}
