import { useState } from "react";
import { DateTime } from "luxon";
import { CalendarDays, ChevronLeft, ChevronRight } from "../ui/icons";
import { useUiStore } from "../../stores/uiStore";
import { useCalendarStore } from "../../stores/calendarStore";
import { WidgetCard } from "../ui/WidgetCard";
import { MonthGrid, useDayItems } from "../calendar/MonthGrid";
import { EventEditorPopover, type EventEditTarget } from "../calendar/EventEditorPopover";
import { TaskEditorPopover, type TaskEditTarget } from "../tasks/TaskEditorPopover";

interface MiniCalendarWidgetProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  range: { start: string; end: string };
}

/**
 * The month on the dashboard, same look as the full calendar: tinted chips
 * for events and dated tasks. Click a day to pick it (the events widget
 * follows), double-click to open it in the full calendar, click a chip to
 * edit it, drag chips between days.
 */
export function MiniCalendarWidget({ selectedDate, onSelectDate, range }: MiniCalendarWidgetProps) {
  const [cursor, setCursor] = useState(DateTime.now());
  const [editing, setEditing] = useState<EventEditTarget | null>(null);
  const [editingTask, setEditingTask] = useState<TaskEditTarget | null>(null);
  const { setPage } = useUiStore();
  const { setFocusedDate, setView } = useCalendarStore();
  const itemsForDay = useDayItems();

  const openInCalendar = (day: DateTime) => {
    setFocusedDate(day.toISODate()!);
    setView("day");
    setPage("calendar");
  };

  const month = cursor.setLocale("pt-BR");

  return (
    <WidgetCard
      icon={CalendarDays}
      title="Calendário"
      onTitleClick={() => setPage("calendar")}
      actions={
        <>
          <button className="ff-btn-ghost rounded-md p-1" onClick={() => setCursor(cursor.minus({ month: 1 }))} aria-label="Mês anterior">
            <ChevronLeft size={15} />
          </button>
          <button
            className="rounded-md px-1.5 text-xs font-semibold text-text-primary hover:text-accent-400"
            onClick={() => setCursor(DateTime.now())}
            title="Voltar para hoje"
          >
            <span className="capitalize">{month.toFormat("LLL").replace(".", "")}</span> <span className="font-normal text-text-muted">{month.toFormat("yyyy")}</span>
          </button>
          <button className="ff-btn-ghost rounded-md p-1" onClick={() => setCursor(cursor.plus({ month: 1 }))} aria-label="Próximo mês">
            <ChevronRight size={15} />
          </button>
        </>
      }
    >
      <MonthGrid
        compact
        scope="mini"
        month={cursor}
        itemsForDay={itemsForDay}
        selectedDate={selectedDate}
        onOpen={setEditing}
        onOpenTask={setEditingTask}
        onDayClick={(day) => onSelectDate(day.toISODate()!)}
        onDayDoubleClick={openInCalendar}
        onOverflow={openInCalendar}
      />
      <EventEditorPopover target={editing} onClose={() => setEditing(null)} range={range} />
      <TaskEditorPopover target={editingTask} onClose={() => setEditingTask(null)} />
    </WidgetCard>
  );
}
