import { useState } from "react";
import { DateTime } from "luxon";
import { CalendarDays, ChevronLeft, ChevronRight } from "../ui/icons";
import { monthGridDays } from "../../utils/calendarGrid";
import { WEEKDAY_LABELS_SHORT, classNames } from "../../utils/format";
import { useUiStore } from "../../stores/uiStore";
import { useCalendarStore } from "../../stores/calendarStore";
import { WidgetCard } from "../ui/WidgetCard";
import { useDayDroppable } from "../calendar/eventDnd";
import type { EventOccurrence } from "../../types/event";

interface MiniCalendarWidgetProps {
  occurrences: EventOccurrence[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

/** Click a day to see its events beside it; double-click to open it in the
 * full calendar; drop an event on a day to move it there. */
export function MiniCalendarWidget({ occurrences, selectedDate, onSelectDate }: MiniCalendarWidgetProps) {
  const [cursor, setCursor] = useState(DateTime.now());
  const { setPage } = useUiStore();
  const { setFocusedDate, setView } = useCalendarStore();

  const eventColorsByDay = new Map<string, string[]>();
  for (const occ of occurrences) {
    const key = DateTime.fromISO(occ.occurrenceStart).toISODate()!;
    eventColorsByDay.set(key, [...(eventColorsByDay.get(key) ?? []), occ.color]);
  }

  const openInCalendar = (dateIso: string) => {
    setFocusedDate(dateIso);
    setView("day");
    setPage("calendar");
  };

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
            className="rounded-md px-1.5 text-xs font-medium capitalize text-text-secondary hover:text-text-primary"
            onClick={() => setCursor(DateTime.now())}
            title="Voltar para hoje"
          >
            {cursor.setLocale("pt-BR").toFormat("MMM yyyy")}
          </button>
          <button className="ff-btn-ghost rounded-md p-1" onClick={() => setCursor(cursor.plus({ month: 1 }))} aria-label="Próximo mês">
            <ChevronRight size={15} />
          </button>
        </>
      }
    >
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] text-center">
        {WEEKDAY_LABELS_SHORT.map((label) => (
          <span key={label} className="pb-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">
            {label}
          </span>
        ))}
        {monthGridDays(cursor.toISODate()!).map((day) => (
          <DayCell
            key={day.toISO()}
            day={day}
            inMonth={day.hasSame(cursor, "month")}
            selected={day.toISODate() === selectedDate}
            colors={eventColorsByDay.get(day.toISODate()!) ?? []}
            onSelect={() => onSelectDate(day.toISODate()!)}
            onOpen={() => openInCalendar(day.toISODate()!)}
          />
        ))}
      </div>
    </WidgetCard>
  );
}

function DayCell({
  day,
  inMonth,
  selected,
  colors,
  onSelect,
  onOpen,
}: {
  day: DateTime;
  inMonth: boolean;
  selected: boolean;
  colors: string[];
  onSelect: () => void;
  onOpen: () => void;
}) {
  const { setNodeRef, isOver } = useDayDroppable(day.toISODate()!, "mini");
  const isToday = day.hasSame(DateTime.now(), "day");
  const isPast = day < DateTime.now().startOf("day");
  const isWeekend = day.weekday >= 6;
  const count = colors.length;

  return (
    <button
      ref={setNodeRef}
      onClick={onSelect}
      onDoubleClick={onOpen}
      title={`${count ? `${count} ${count === 1 ? "evento" : "eventos"} · ` : ""}clique para ver o dia · duplo clique abre no calendário`}
      className={classNames(
        "flex min-h-0 flex-col items-center justify-center gap-0.5 rounded-lg transition-colors",
        isOver && "bg-accent-500/20",
      )}
    >
      <span
        className={classNames(
          "flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums transition-colors",
          !inMonth && "text-text-muted/40",
          inMonth && !isToday && !selected && "hover:bg-surface-2",
          inMonth && !isToday && !selected && (isPast ? "text-text-muted/70" : isWeekend ? "text-text-muted" : "text-text-primary"),
          count > 0 && !isToday && !isPast && "font-semibold",
          isToday && "bg-accent-500 font-semibold text-white",
          selected && !isToday && "ring-1 ring-accent-400 text-text-primary",
        )}
      >
        {day.day}
      </span>
      <span className="flex h-1 gap-0.5">
        {colors.slice(0, 3).map((color, i) => (
          <span key={i} className="h-1 w-1 rounded-full" style={{ backgroundColor: color }} />
        ))}
      </span>
    </button>
  );
}
