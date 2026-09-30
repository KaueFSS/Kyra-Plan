import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { DateTime } from "luxon";
import { ChevronLeft, ChevronRight, Plus } from "../components/ui/icons";
import { useCalendarStore } from "../stores/calendarStore";
import { AppDndContext } from "../components/dnd/AppDndContext";
import { EventEditorPopover, type EventEditTarget } from "../components/calendar/EventEditorPopover";
import { useDayDroppable, useEventDraggable } from "../components/calendar/eventDnd";
import { useClickGuard } from "../hooks/useClickGuard";
import { anchorBelow } from "../components/ui/Popover";
import { monthGridDays, weekDays } from "../utils/calendarGrid";
import { WEEKDAY_LABELS_SHORT, classNames } from "../utils/format";
import type { EventOccurrence } from "../types/event";

type OpenEditor = (target: EventEditTarget) => void;

export function CalendarPage() {
  const { view, focusedDate, occurrences, setView, setFocusedDate, loadRange } = useCalendarStore();
  const [editing, setEditing] = useState<EventEditTarget | null>(null);
  const focused = DateTime.fromISO(focusedDate);

  const range = useMemo(() => {
    const [start, end] =
      view === "month"
        ? [monthGridDays(focusedDate)[0], monthGridDays(focusedDate)[41].endOf("day")]
        : view === "week"
          ? [weekDays(focusedDate)[0], weekDays(focusedDate)[6].endOf("day")]
          : [focused.startOf("day"), focused.endOf("day")];
    return { start: start.toUTC().toISO()!, end: end.toUTC().toISO()! };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, focusedDate]);

  useEffect(() => {
    loadRange(range.start, range.end);
  }, [range, loadRange]);

  const eventsForDay = (day: DateTime) =>
    occurrences
      .filter((occ) => DateTime.fromISO(occ.occurrenceStart).hasSame(day, "day"))
      .sort((a, b) => a.occurrenceStart.localeCompare(b.occurrenceStart));

  const navigate = (direction: 1 | -1) => {
    const unit = view === "month" ? "months" : view === "week" ? "weeks" : "days";
    setFocusedDate(focused.plus({ [unit]: direction }).toISODate()!);
  };

  const title =
    view === "day"
      ? focused.setLocale("pt-BR").toFormat("cccc, d 'de' MMMM")
      : focused.setLocale("pt-BR").toFormat("MMMM 'de' yyyy");

  return (
    <AppDndContext eventRange={range}>
      <div className="flex h-full flex-col p-4">
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button className="ff-btn-ghost rounded-md p-1.5" onClick={() => navigate(-1)} aria-label="Anterior">
              <ChevronLeft size={18} />
            </button>
            <button className="ff-btn-ghost rounded-md p-1.5" onClick={() => navigate(1)} aria-label="Próximo">
              <ChevronRight size={18} />
            </button>
            <h2 className="ml-2 text-lg font-semibold text-text-primary first-letter:uppercase">{title}</h2>
            <button className="ff-btn-secondary ml-3 px-2.5 py-1 text-xs" onClick={() => setFocusedDate(DateTime.now().toISODate()!)}>
              Hoje
            </button>
          </div>

          <div className="flex items-center gap-2">
            <p className="hidden text-xs text-text-muted xl:block">Arraste eventos entre os dias · clique num dia para criar</p>
            <div className="flex rounded-lg border border-border-subtle bg-surface-1 p-1">
              {(["month", "week", "day"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={classNames(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    view === v ? "bg-accent-500 text-white" : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  {v === "month" ? "Mês" : v === "week" ? "Semana" : "Dia"}
                </button>
              ))}
            </div>
            <button
              className="ff-btn-primary px-3 py-1.5 text-xs"
              onClick={(e) => setEditing({ occurrence: null, date: focusedDate, anchor: anchorBelow(e.currentTarget) })}
            >
              <Plus size={14} /> Evento
            </button>
          </div>
        </div>

        {view === "month" && (
          <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] overflow-hidden rounded-xl border border-border-subtle bg-border-subtle gap-px">
            {WEEKDAY_LABELS_SHORT.map((label) => (
              <div key={label} className="bg-surface-1 py-1.5 text-center text-[0.75rem] font-semibold uppercase tracking-wide text-text-muted">
                {label}
              </div>
            ))}
            {monthGridDays(focusedDate).map((day) => (
              <MonthCell
                key={day.toISO()}
                day={day}
                inMonth={day.hasSame(focused, "month")}
                events={eventsForDay(day)}
                onOpen={setEditing}
              />
            ))}
          </div>
        )}

        {view === "week" && (
          <div className="grid min-h-0 flex-1 grid-cols-7 gap-2">
            {weekDays(focusedDate).map((day) => (
              <WeekColumn key={day.toISO()} day={day} events={eventsForDay(day)} onOpen={setEditing} />
            ))}
          </div>
        )}

        {view === "day" && (
          <div className="mx-auto w-full max-w-xl space-y-2 overflow-y-auto">
            {eventsForDay(focused).length === 0 && <p className="py-10 text-center text-sm text-text-muted">Nenhum evento neste dia.</p>}
            {eventsForDay(focused).map((occ) => (
              <EventChip key={`${occ.id}-${occ.occurrenceStart}`} occurrence={occ} onOpen={setEditing} large />
            ))}
          </div>
        )}

        <EventEditorPopover target={editing} onClose={() => setEditing(null)} range={range} />
      </div>
    </AppDndContext>
  );
}

function createAt(e: MouseEvent, day: DateTime, onOpen: OpenEditor) {
  if (e.target !== e.currentTarget) return;
  onOpen({ occurrence: null, date: day.toISODate()!, anchor: { x: e.clientX + 8, y: e.clientY + 8 } });
}

function MonthCell({ day, inMonth, events, onOpen }: { day: DateTime; inMonth: boolean; events: EventOccurrence[]; onOpen: OpenEditor }) {
  const { setNodeRef, isOver } = useDayDroppable(day.toISODate()!, "month");
  const isToday = day.hasSame(DateTime.now(), "day");

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => createAt(e, day, onOpen)}
      className={classNames(
        "flex min-h-0 cursor-cell flex-col gap-1 overflow-hidden p-1.5 transition-colors",
        isOver ? "bg-accent-500/15" : "bg-surface-0 hover:bg-surface-1",
        !inMonth && "opacity-45",
      )}
    >
      <span
        className={classNames(
          "pointer-events-none flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs tabular-nums",
          isToday ? "bg-accent-500 font-semibold text-white" : "text-text-secondary",
        )}
      >
        {day.day}
      </span>
      <div className="min-h-0 space-y-0.5 overflow-y-auto">
        {events.map((occ) => (
          <EventChip key={`${occ.id}-${occ.occurrenceStart}`} occurrence={occ} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

function WeekColumn({ day, events, onOpen }: { day: DateTime; events: EventOccurrence[]; onOpen: OpenEditor }) {
  const { setNodeRef, isOver } = useDayDroppable(day.toISODate()!, "week");
  const isToday = day.hasSame(DateTime.now(), "day");

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => createAt(e, day, onOpen)}
      className={classNames(
        "flex min-h-0 cursor-cell flex-col rounded-xl border p-2 transition-colors",
        isOver ? "border-accent-500 bg-accent-500/10" : isToday ? "border-accent-500/40 bg-surface-1" : "border-border-subtle bg-surface-1",
      )}
    >
      <div className="pointer-events-none mb-2 flex items-center gap-2">
        <span className="text-[0.75rem] font-semibold uppercase text-text-muted">{day.setLocale("pt-BR").toFormat("ccc")}</span>
        <span
          className={classNames(
            "flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
            isToday ? "bg-accent-500 text-white" : "text-text-secondary",
          )}
        >
          {day.day}
        </span>
      </div>
      <div className="min-h-0 space-y-1 overflow-y-auto">
        {events.map((occ) => (
          <EventChip key={`${occ.id}-${occ.occurrenceStart}`} occurrence={occ} onOpen={onOpen} large />
        ))}
      </div>
    </div>
  );
}

function EventChip({ occurrence, onOpen, large = false }: { occurrence: EventOccurrence; onOpen: OpenEditor; large?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useEventDraggable(occurrence, large ? "card" : "chip");
  const swallowClick = useClickGuard(isDragging);
  const start = DateTime.fromISO(occurrence.occurrenceStart);
  const end = DateTime.fromISO(occurrence.occurrenceEnd);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        if (swallowClick()) return;
        onOpen({ occurrence, date: start.toISODate()!, anchor: { x: e.clientX + 8, y: e.clientY + 8 } });
      }}
      className={classNames(
        "cursor-grab rounded-md text-text-primary transition hover:brightness-110 active:cursor-grabbing",
        large ? "px-2 py-1.5" : "px-1.5 py-0.5",
        isDragging && "opacity-30",
      )}
      style={{ background: `${occurrence.color}33`, borderLeft: `3px solid ${occurrence.color}` }}
    >
      <p className={classNames("truncate font-medium", large ? "text-sm" : "text-[0.75rem]")}>
        {!large && <span className="mr-1 tabular-nums text-text-secondary">{start.toFormat("HH:mm")}</span>}
        {occurrence.title}
      </p>
      {large && (
        <p className="text-[0.75rem] tabular-nums text-text-secondary">
          {start.toFormat("HH:mm")} – {end.toFormat("HH:mm")}
        </p>
      )}
    </div>
  );
}
