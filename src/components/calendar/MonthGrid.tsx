import { useEffect, useMemo, type MouseEvent } from "react";
import { DateTime } from "luxon";
import { useDraggable } from "@dnd-kit/core";
import { Check } from "../ui/icons";
import { useCalendarStore } from "../../stores/calendarStore";
import { useTaskStore } from "../../stores/taskStore";
import { useTaskListStore } from "../../stores/taskListStore";
import { useDayDroppable, useEventDraggable } from "./eventDnd";
import { useClickGuard } from "../../hooks/useClickGuard";
import { useElementSize } from "../../hooks/useElementSize";
import { monthGridDays } from "../../utils/calendarGrid";
import { WEEKDAY_LABELS_SHORT, classNames } from "../../utils/format";
import type { EventEditTarget } from "./EventEditorPopover";
import type { TaskEditTarget } from "../tasks/TaskEditorPopover";
import type { DragPayload } from "../dnd/types";
import type { EventOccurrence } from "../../types/event";
import type { TaskWithProgress } from "../../types/task";

export type OpenEditor = (target: EventEditTarget) => void;
export type OpenTask = (target: TaskEditTarget) => void;

/** Everything shown on a day: events and one-off tasks due that day, in time order. */
export type DayItem =
  | { kind: "event"; key: string; time: string; occurrence: EventOccurrence }
  | { kind: "task"; key: string; time: string; task: TaskWithProgress; color: string };

/** Events (from the calendar store) and dated list tasks, grouped per day. */
export function useDayItems(): (day: DateTime) => DayItem[] {
  const occurrences = useCalendarStore((s) => s.occurrences);
  const single = useTaskStore((s) => s.single);
  const { lists, loaded, load } = useTaskListStore();

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const listColor = useMemo(() => new Map(lists.map((l) => [l.id, l.color])), [lists]);

  return (day: DateTime) => {
    const iso = day.toISODate()!;
    const events: DayItem[] = occurrences
      .filter((occ) => DateTime.fromISO(occ.occurrenceStart).hasSame(day, "day"))
      .map((occ) => ({
        kind: "event",
        key: `e-${occ.id}-${occ.occurrenceStart}`,
        time: DateTime.fromISO(occ.occurrenceStart).toFormat("HH:mm"),
        occurrence: occ,
      }));
    const tasks: DayItem[] = single
      .filter((t) => t.endDate === iso)
      .map((t) => ({ kind: "task", key: `t-${t.id}`, time: t.scheduledTime ?? "", task: t, color: listColor.get(t.listId ?? "") ?? "#2b8af7" }));
    // Untimed items first (like all-day), then by time.
    return [...events, ...tasks].sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00"));
  };
}

interface MonthGridProps {
  /** Any day of the month to show. */
  month: DateTime;
  itemsForDay: (day: DateTime) => DayItem[];
  onOpen: OpenEditor;
  onOpenTask: OpenTask;
  /** Plain click on a day's empty space. */
  onDayClick: (day: DateTime, e: MouseEvent) => void;
  onDayDoubleClick: (day: DateTime) => void;
  /** "+N mais" was clicked. */
  onOverflow: (day: DateTime) => void;
  /** Highlights a chosen day (the widget's selected date). */
  selectedDate?: string;
  /** Denser sizes for the dashboard widget. */
  compact?: boolean;
  /** Keeps drop-zone ids unique when two grids could be mounted. */
  scope: string;
}

/**
 * The month as a grid of days with colour-tinted chips — used full-size on
 * the calendar page and compact in the dashboard widget. How many chips fit
 * per cell follows the real height; the rest collapse into "+N mais".
 */
export function MonthGrid(props: MonthGridProps) {
  const { month, compact = false } = props;
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  // Too narrow for readable titles (the default dashboard widget): show each
  // item as a slim colour bar instead, like a phone's month view.
  const bars = compact && width > 0 && width / 7 < 76;
  const chipPx = bars ? 6 : compact ? 18 : 22;
  const headerPx = compact ? 22 : 30;
  const cellHeight = height > 0 ? height / 6 : 100;
  const fit = Math.max(1, Math.floor((cellHeight - headerPx) / chipPx));

  return (
    <div className={classNames("flex min-h-0 flex-1 flex-col overflow-hidden border border-border-subtle bg-surface-0", compact ? "rounded-lg" : "rounded-xl")}>
      <div className="grid shrink-0 grid-cols-7 border-b border-border-subtle">
        {WEEKDAY_LABELS_SHORT.map((label) => (
          <div key={label} className={classNames("text-center font-medium text-text-muted", compact ? "py-1 text-[0.6875rem]" : "py-2 text-[0.75rem]")}>
            {label}
          </div>
        ))}
      </div>
      <div ref={ref} className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
        {monthGridDays(month.toISODate()!).map((day, i) => (
          <MonthCell
            key={day.toISO()}
            {...props}
            day={day}
            inMonth={day.hasSame(month, "month")}
            lastCol={i % 7 === 6}
            lastRow={i >= 35}
            items={props.itemsForDay(day)}
            fit={fit}
            compact={compact}
            bars={bars}
          />
        ))}
      </div>
    </div>
  );
}

function MonthCell({
  day,
  inMonth,
  lastCol,
  lastRow,
  items,
  fit,
  compact,
  bars,
  selectedDate,
  scope,
  onOpen,
  onOpenTask,
  onDayClick,
  onDayDoubleClick,
  onOverflow,
}: MonthGridProps & { day: DateTime; inMonth: boolean; lastCol: boolean; lastRow: boolean; items: DayItem[]; fit: number; compact: boolean; bars: boolean }) {
  const iso = day.toISODate()!;
  const { setNodeRef, isOver } = useDayDroppable(iso, scope);
  const isToday = day.hasSame(DateTime.now(), "day");
  const selected = selectedDate === iso && !isToday;
  const overflow = items.length > fit;
  const visible = overflow ? items.slice(0, fit - 1) : items;

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => e.target === e.currentTarget && onDayClick(day, e)}
      onDoubleClick={(e) => e.target === e.currentTarget && onDayDoubleClick(day)}
      className={classNames(
        "@container flex min-h-0 min-w-0 cursor-pointer flex-col overflow-hidden transition-colors",
        compact ? "gap-px px-0.5 pb-0.5 pt-0.5" : "gap-0.5 px-1 pb-1 pt-1",
        !lastCol && "border-r border-border-subtle",
        !lastRow && "border-b border-border-subtle",
        isOver ? "bg-accent-500/12" : selected ? "bg-accent-500/[0.07]" : inMonth ? "hover:bg-surface-1" : "bg-surface-1/40",
        selected && "shadow-[inset_0_0_0_1px_var(--color-accent-500)]",
      )}
    >
      <div className={classNames("pointer-events-none flex shrink-0 items-center px-0.5", compact ? "h-5" : "h-6 px-1")}>
        <span
          className={classNames(
            "flex items-center justify-center rounded-full font-semibold tabular-nums",
            compact ? "h-5 min-w-5 px-1 text-[0.75rem]" : "h-6 min-w-6 px-1 text-[0.8125rem]",
            isToday ? "bg-accent-500 text-white" : inMonth ? "text-text-primary" : "text-text-muted/60",
          )}
        >
          {day.day === 1 && !isToday && !compact ? day.setLocale("pt-BR").toFormat("d MMM").replace(".", "") : day.day}
        </span>
      </div>
      {bars ? (
        <DayBars items={items} fit={fit} dim={!inMonth} onOpen={onOpen} onOpenTask={onOpenTask} onOverflow={() => onOverflow(day)} />
      ) : (
        visible.map((item) => <ItemChip key={item.key} item={item} onOpen={onOpen} onOpenTask={onOpenTask} dim={!inMonth} compact={compact} />)
      )}
      {overflow && !bars && (
        <button
          onClick={() => onOverflow(day)}
          className={classNames(
            "shrink-0 rounded-md text-left font-medium text-text-muted hover:bg-surface-2 hover:text-text-primary",
            compact ? "px-1 text-[0.6875rem] leading-tight" : "px-1.5 text-[0.75rem]",
          )}
        >
          +{items.length - visible.length} mais
        </button>
      )}
    </div>
  );
}

/** Narrow cells: one slim colour bar per item; hover shows what it is, click opens it. */
function DayBars({
  items,
  fit,
  dim,
  onOpen,
  onOpenTask,
  onOverflow,
}: {
  items: DayItem[];
  fit: number;
  dim: boolean;
  onOpen: OpenEditor;
  onOpenTask: OpenTask;
  onOverflow: () => void;
}) {
  const overflow = items.length > fit;
  const visible = overflow ? items.slice(0, Math.max(1, fit - 1)) : items;
  return (
    <div className={classNames("flex min-h-0 flex-col gap-0.5 px-0.5", dim && "opacity-60")}>
      {visible.map((item) => {
        const color = item.kind === "event" ? item.occurrence.color : item.color;
        const done = item.kind === "task" && item.task.status === "completed";
        const label = item.kind === "event" ? item.occurrence.title : item.task.title;
        return (
          <button
            key={item.key}
            title={`${item.time ? item.time + " · " : ""}${label}`}
            onClick={(e) => {
              e.stopPropagation();
              const anchor = { x: e.clientX + 8, y: e.clientY + 8 };
              if (item.kind === "event") onOpen({ occurrence: item.occurrence, date: item.occurrence.occurrenceStart.slice(0, 10), anchor });
              else onOpenTask({ task: item.task, anchor });
            }}
            className={classNames("h-1 w-full shrink-0 rounded-full transition-[height] hover:h-1.5", done && "opacity-40")}
            style={{ background: color }}
          />
        );
      })}
      {overflow && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOverflow();
          }}
          className="text-right text-[0.625rem] font-semibold leading-none text-text-muted hover:text-text-primary"
        >
          +{items.length - visible.length}
        </button>
      )}
    </div>
  );
}

export function ItemChip(props: { item: DayItem; onOpen: OpenEditor; onOpenTask: OpenTask; large?: boolean; dim?: boolean; compact?: boolean }) {
  return props.item.kind === "event" ? (
    <EventChip occurrence={props.item.occurrence} onOpen={props.onOpen} large={props.large} dim={props.dim} compact={props.compact} />
  ) : (
    <TaskChip task={props.item.task} color={props.item.color} onOpen={props.onOpenTask} large={props.large} dim={props.dim} compact={props.compact} />
  );
}

/** Shared look: a soft tint of the item's colour, marker on the left, time on the right. */
function chipClasses(large: boolean, compact: boolean, dim: boolean, dragging: boolean) {
  return classNames(
    "flex min-w-0 shrink-0 cursor-grab items-center rounded-md text-text-primary transition-[filter] hover:brightness-110 active:cursor-grabbing",
    "bg-[color-mix(in_srgb,var(--chip)_20%,var(--color-surface-1))]",
    large ? "gap-1.5 px-2 py-1.5" : compact ? "h-4 gap-1 px-1" : "h-[1.25rem] gap-1.5 px-1.5",
    dim && "opacity-60",
    dragging && "opacity-30",
  );
}

const textSize = (large: boolean, compact: boolean) => (large ? "text-sm" : compact ? "text-[0.6875rem]" : "text-[0.75rem]");
const timeSize = (large: boolean, compact: boolean) => (large ? "text-xs" : compact ? "text-[0.625rem]" : "text-[0.6875rem]");

function EventChip({
  occurrence,
  onOpen,
  large = false,
  dim = false,
  compact = false,
}: {
  occurrence: EventOccurrence;
  onOpen: OpenEditor;
  large?: boolean;
  dim?: boolean;
  compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useEventDraggable(occurrence, large ? "card" : compact ? "mini" : "chip");
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
      title={`${occurrence.title} · ${start.toFormat("HH:mm")}–${end.toFormat("HH:mm")}`}
      className={chipClasses(large, compact, dim, isDragging)}
      style={{ ["--chip" as string]: occurrence.color }}
    >
      <span className={classNames("shrink-0 rounded-[3px]", compact ? "h-2 w-2" : "h-2.5 w-2.5")} style={{ background: occurrence.color }} />
      <span className={classNames("min-w-0 flex-1 truncate font-medium", textSize(large, compact))}>{occurrence.title}</span>
      <span className={classNames("shrink-0 tabular-nums text-text-muted", timeSize(large, compact), compact && "hidden @[7rem]:inline")}>
        {large ? `${start.toFormat("HH:mm")}–${end.toFormat("HH:mm")}` : start.toFormat("HH:mm")}
      </span>
    </div>
  );
}

function TaskChip({
  task,
  color,
  onOpen,
  large = false,
  dim = false,
  compact = false,
}: {
  task: TaskWithProgress;
  color: string;
  onOpen: OpenTask;
  large?: boolean;
  dim?: boolean;
  compact?: boolean;
}) {
  const toggleSingle = useTaskStore((s) => s.toggleSingle);
  const payload: DragPayload = { type: "list-task", taskId: task.id, listId: task.listId ?? "", title: task.title, color };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `cal-task-${task.id}-${large ? "l" : compact ? "c" : "s"}`,
    data: payload,
  });
  const swallowClick = useClickGuard(isDragging);
  const done = task.status === "completed";

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        if (swallowClick()) return;
        onOpen({ task, anchor: { x: e.clientX + 8, y: e.clientY + 8 } });
      }}
      title={task.title}
      className={chipClasses(large, compact, dim || done, isDragging)}
      style={{ ["--chip" as string]: color }}
    >
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          void toggleSingle(task.id);
        }}
        aria-label={done ? "Desmarcar" : "Concluir"}
        className={classNames(
          "flex shrink-0 items-center justify-center rounded-[3px] border-[1.5px]",
          compact ? "h-2.5 w-2.5" : "h-3 w-3",
          done && "border-success bg-success text-white",
        )}
        style={done ? undefined : { borderColor: color }}
      >
        {done && <Check size={compact ? 7 : 8} strokeWidth={4} />}
      </button>
      <span className={classNames("min-w-0 flex-1 truncate font-medium", textSize(large, compact), done && "line-through")}>{task.title}</span>
      {task.scheduledTime && (
        <span className={classNames("shrink-0 tabular-nums text-text-muted", timeSize(large, compact), compact && "hidden @[7rem]:inline")}>
          {task.scheduledTime}
        </span>
      )}
    </div>
  );
}
