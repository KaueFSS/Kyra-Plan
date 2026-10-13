import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { DateTime } from "luxon";
import { ChevronLeft, ChevronRight, Plus } from "../components/ui/icons";
import { useCalendarStore } from "../stores/calendarStore";
import { useTaskStore } from "../stores/taskStore";
import { AppDndContext } from "../components/dnd/AppDndContext";
import { EventEditorPopover, type EventEditTarget } from "../components/calendar/EventEditorPopover";
import { TaskEditorPopover, type TaskEditTarget } from "../components/tasks/TaskEditorPopover";
import { useDayDroppable } from "../components/calendar/eventDnd";
import { ItemChip, MonthGrid, useDayItems, type DayItem, type OpenEditor, type OpenTask } from "../components/calendar/MonthGrid";
import { anchorBelow } from "../components/ui/Popover";
import { monthGridDays, weekDays } from "../utils/calendarGrid";
import { classNames } from "../utils/format";

export function CalendarPage() {
  const { view, focusedDate, setView, setFocusedDate, loadRange } = useCalendarStore();
  const loadAll = useTaskStore((s) => s.loadAll);
  const itemsForDay = useDayItems();
  const [editing, setEditing] = useState<EventEditTarget | null>(null);
  const [editingTask, setEditingTask] = useState<TaskEditTarget | null>(null);
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

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const navigate = (direction: 1 | -1) => {
    const unit = view === "month" ? "months" : view === "week" ? "weeks" : "days";
    setFocusedDate(focused.plus({ [unit]: direction }).toISODate()!);
  };

  const openDay = (day: DateTime) => {
    setFocusedDate(day.toISODate()!);
    setView("day");
  };

  const local = focused.setLocale("pt-BR");
  const title =
    view === "day" ? (
      <>
        {local.toFormat("d 'de' MMMM")} <span className="font-normal text-text-muted">{local.toFormat("cccc")}</span>
      </>
    ) : (
      <>
        <span className="capitalize">{local.toFormat("MMMM")}</span> <span className="font-normal text-text-muted">{local.toFormat("yyyy")}</span>
      </>
    );

  return (
    <AppDndContext eventRange={range}>
      <div className="flex h-full flex-col p-4">
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">{title}</h2>

          <div className="flex items-center gap-2">
            <p className="hidden text-xs text-text-muted 2xl:block">Arraste eventos e tarefas entre os dias · clique num dia vazio para criar</p>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-surface-1 text-text-secondary hover:border-border-strong hover:text-text-primary"
              onClick={(e) => setEditing({ occurrence: null, date: focusedDate, anchor: anchorBelow(e.currentTarget) })}
              title="Novo evento"
              aria-label="Novo evento"
            >
              <Plus size={16} />
            </button>
            <select
              value={view}
              onChange={(e) => setView(e.target.value as typeof view)}
              className="h-8 rounded-lg border border-border-subtle bg-surface-1 px-2.5 text-sm text-text-primary outline-none hover:border-border-strong"
              aria-label="Visualização"
            >
              <option value="month">Mês</option>
              <option value="week">Semana</option>
              <option value="day">Dia</option>
            </select>
            <div className="flex h-8 overflow-hidden rounded-lg border border-border-subtle bg-surface-1">
              <button className="px-2 text-text-secondary hover:bg-surface-2 hover:text-text-primary" onClick={() => navigate(-1)} aria-label="Anterior">
                <ChevronLeft size={16} />
              </button>
              <button
                className="border-x border-border-subtle px-3 text-sm font-medium text-text-primary hover:bg-surface-2"
                onClick={() => setFocusedDate(DateTime.now().toISODate()!)}
              >
                Hoje
              </button>
              <button className="px-2 text-text-secondary hover:bg-surface-2 hover:text-text-primary" onClick={() => navigate(1)} aria-label="Próximo">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {view === "month" && (
          <MonthGrid
            scope="month"
            month={focused}
            itemsForDay={itemsForDay}
            onOpen={setEditing}
            onOpenTask={setEditingTask}
            onDayClick={(day, e) => createAt(e, day, setEditing)}
            onDayDoubleClick={openDay}
            onOverflow={openDay}
          />
        )}

        {view === "week" && (
          <div className="grid min-h-0 flex-1 grid-cols-7 overflow-hidden rounded-xl border border-border-subtle">
            {weekDays(focusedDate).map((day, i) => (
              <WeekColumn
                key={day.toISO()}
                day={day}
                first={i === 0}
                items={itemsForDay(day)}
                onOpen={setEditing}
                onOpenTask={setEditingTask}
              />
            ))}
          </div>
        )}

        {view === "day" && (
          <div className="mx-auto w-full max-w-xl min-h-0 flex-1 space-y-1.5 overflow-y-auto">
            {itemsForDay(focused).length === 0 && <p className="py-10 text-center text-sm text-text-muted">Nada neste dia.</p>}
            {itemsForDay(focused).map((item) => (
              <ItemChip key={item.key} item={item} onOpen={setEditing} onOpenTask={setEditingTask} large />
            ))}
          </div>
        )}

        <EventEditorPopover target={editing} onClose={() => setEditing(null)} range={range} />
        <TaskEditorPopover target={editingTask} onClose={() => setEditingTask(null)} />
      </div>
    </AppDndContext>
  );
}

function createAt(e: MouseEvent, day: DateTime, onOpen: OpenEditor) {
  onOpen({ occurrence: null, date: day.toISODate()!, anchor: { x: e.clientX + 8, y: e.clientY + 8 } });
}

function WeekColumn({
  day,
  first,
  items,
  onOpen,
  onOpenTask,
}: {
  day: DateTime;
  first: boolean;
  items: DayItem[];
  onOpen: OpenEditor;
  onOpenTask: OpenTask;
}) {
  const { setNodeRef, isOver } = useDayDroppable(day.toISODate()!, "week");
  const isToday = day.hasSame(DateTime.now(), "day");

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => e.target === e.currentTarget && createAt(e, day, onOpen)}
      className={classNames(
        "flex min-h-0 cursor-cell flex-col gap-1 p-2 transition-colors",
        !first && "border-l border-border-subtle",
        isOver ? "bg-accent-500/12" : isToday ? "bg-accent-500/[0.04]" : "hover:bg-surface-1",
      )}
    >
      <div className="pointer-events-none mb-1 flex items-center gap-2">
        <span className={classNames("text-[0.75rem] font-medium uppercase", isToday ? "text-accent-400" : "text-text-muted")}>
          {day.setLocale("pt-BR").toFormat("ccc").replace(".", "")}
        </span>
        <span
          className={classNames(
            "flex h-6 min-w-6 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
            isToday ? "bg-accent-500 text-white" : "text-text-primary",
          )}
        >
          {day.day}
        </span>
      </div>
      <div className="min-h-0 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <ItemChip key={item.key} item={item} onOpen={onOpen} onOpenTask={onOpenTask} large />
        ))}
      </div>
    </div>
  );
}
