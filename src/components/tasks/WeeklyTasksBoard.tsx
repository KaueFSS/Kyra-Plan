import { useEffect, useMemo, useRef, useState } from "react";
import { DateTime } from "luxon";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Check, Plus, Timer, X } from "../ui/icons";
import { useTaskStore } from "../../stores/taskStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useClickGuard } from "../../hooks/useClickGuard";
import { useLiveTick } from "../../hooks/useLiveTick";
import { InlineAdd } from "../ui/InlineAdd";
import { FieldLabel } from "../ui/FormControls";
import { Popover, anchorBelow, type PopoverAnchor } from "../ui/Popover";
import { TaskEditorPopover, type TaskEditTarget } from "./TaskEditorPopover";
import { TaskTimerControl } from "./TaskTimerControl";
import { TimeChip } from "./TimeChip";
import { createWeeklyTask } from "../../stores/smartActions";
import { describeDays, describeTask, formatMinutes } from "../../utils/naturalLanguage";
import { cycleNow } from "../../utils/cycleDate";
import { WEEKDAY_LABELS_LONG, WEEKDAY_LABELS_SHORT, classNames } from "../../utils/format";
import { buildWeek, statusOn, type DayTaskStatus, type WeekDayInfo } from "./weekProgress";
import type { DragPayload, DropTarget } from "../dnd/types";
import type { TaskWithProgress } from "../../types/task";

const ORDER: Record<DayTaskStatus, number> = { pending: 0, upcoming: 0, missed: 1, done: 2 };

/**
 * Weekly tasks as a week planner — same family as the weekly schedule: one
 * column per day, tasks as clean cards in time order, a thin progress bar
 * under each day. Today's cards can be ticked; past days show what got done
 * (✓) or not (✗); future days show what's coming. Each day has its own
 * "+ Adicionar" (type it, or repeat a weekly task you already have).
 * Drag a card to another day to move it. Must be inside `AppDndContext`.
 */
export function WeeklyTasksBoard({ tasks }: { tasks: TaskWithProgress[] }) {
  const settings = useSettingsStore((s) => s.settings);
  // Same "today" as the backend (reset time + timezone), so ticking never gets refused.
  const now = cycleNow(settings, DateTime.fromMillis(useLiveTick(60_000)));
  const today = now.weekday - 1;
  const [editing, setEditing] = useState<TaskEditTarget | null>(null);
  const [quick, setQuick] = useState<{ anchor: PopoverAnchor; day: number } | null>(null);
  const week = buildWeek(tasks, now);

  return (
    <div className="grid h-full min-h-0 grid-cols-7 overflow-hidden rounded-lg border border-border-subtle bg-surface-0">
      {week.map((info) => (
        <DayColumn
          key={info.day}
          info={info}
          today={today}
          onAdd={(anchor) => setQuick({ anchor, day: info.day })}
          onEdit={setEditing}
        />
      ))}
      <QuickAddPopover target={quick} tasks={tasks} onClose={() => setQuick(null)} />
      <TaskEditorPopover target={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function DayColumn({
  info,
  today,
  onAdd,
  onEdit,
}: {
  info: WeekDayInfo;
  today: number;
  onAdd: (anchor: PopoverAnchor) => void;
  onEdit: (target: TaskEditTarget) => void;
}) {
  const target: DropTarget = { accepts: "weekly-task", day: info.day };
  const { setNodeRef, isOver } = useDroppable({ id: `weekly-day-${info.day}`, data: target });
  const total = info.tasks.length;
  const complete = total > 0 && info.done === total;

  const rows = info.tasks
    .map((task) => ({ task, status: statusOn(task, info.day, today, info.date) }))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || (a.task.scheduledTime ?? "99").localeCompare(b.task.scheduledTime ?? "99"));

  return (
    <div
      ref={setNodeRef}
      className={classNames(
        "group/day flex min-h-0 min-w-0 flex-col transition-colors",
        info.day < 6 && "border-r border-border-subtle",
        isOver ? "bg-accent-500/10" : info.isToday && "bg-accent-500/[0.05]",
      )}
    >
      {/* Day header with a thin progress bar */}
      <div className={classNames("shrink-0 border-b border-border-subtle px-1.5 pb-1 pt-1.5", info.isPast && !info.isToday && "opacity-70")}>
        <div className="flex items-center justify-center gap-1.5">
          <span className={classNames("text-[0.6875rem] font-semibold uppercase tracking-wider", info.isToday ? "text-accent-400" : "text-text-muted")}>
            {info.isToday ? "Hoje" : WEEKDAY_LABELS_SHORT[info.day]}
          </span>
          <span
            className={classNames(
              "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[0.75rem] font-semibold tabular-nums",
              info.isToday ? "bg-accent-500 text-white" : "text-text-secondary",
            )}
          >
            {info.date.day}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5" title={total ? `${info.done} de ${total} feitas` : "Nada neste dia"}>
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
            {total > 0 && (
              <span
                className={classNames(
                  "block h-full rounded-full transition-[width] duration-500",
                  complete ? "bg-success" : info.isPast && info.missed > 0 ? "bg-danger/80" : "bg-accent-500",
                )}
                style={{ width: `${Math.max(info.done / total, info.isPast && !complete ? 1 : 0) * 100}%` }}
              />
            )}
          </span>
          <span
            className={classNames(
              "shrink-0 text-[0.625rem] font-semibold tabular-nums",
              complete ? "text-success" : info.isPast && info.missed ? "text-danger" : "text-text-muted",
            )}
          >
            {total ? `${info.done}/${total}` : "–"}
          </span>
        </div>
      </div>

      <div className="ff-scroll-quiet min-h-0 flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden p-1.5">
        {rows.map(({ task, status }) => (
          <TaskCard key={task.id} task={task} day={info.day} today={today} status={status} onEdit={onEdit} />
        ))}

        <button
          onClick={(e) => onAdd(anchorBelow(e.currentTarget))}
          className={classNames(
            "flex w-full items-center justify-center gap-1 rounded-lg text-[0.75rem] font-medium transition-all hover:bg-surface-1 hover:text-accent-400",
            total === 0 ? "flex-col py-5 text-text-muted/70" : "py-1.5 text-text-muted opacity-60 hover:opacity-100 group-hover/day:opacity-100",
          )}
        >
          <Plus size={total === 0 ? 16 : 13} className={total === 0 ? "opacity-0 transition-opacity group-hover/day:opacity-100" : undefined} />
          {total === 0 ? "Livre" : "Adicionar"}
        </button>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  day,
  today,
  status,
  onEdit,
}: {
  task: TaskWithProgress;
  day: number;
  today: number;
  status: DayTaskStatus;
  onEdit: (target: TaskEditTarget) => void;
}) {
  const toggleCompletion = useTaskStore((s) => s.toggleCompletion);
  const payload: DragPayload = { type: "weekly-task", taskId: task.id, fromDay: day, title: task.title, color: "var(--color-accent-500)" };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `weekly-${task.id}-${day}`, data: payload });
  const swallowClick = useClickGuard(isDragging);
  const isToday = day === today;
  const timed = (task.durationSeconds ?? 0) > 0;
  const done = status === "done";

  // Pop + green flash only at the moment it gets ticked.
  const wasDone = useRef(done);
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    const flipped = done && !wasDone.current;
    wasDone.current = done;
    if (!flipped) return;
    setCelebrate(true);
    const id = setTimeout(() => setCelebrate(false), 900);
    return () => clearTimeout(id);
  }, [done]);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (swallowClick()) return;
        onEdit({ task, anchor: { x: e.clientX + 8, y: e.clientY + 8 } });
      }}
      className={classNames(
        "min-w-0 cursor-grab overflow-hidden rounded-lg border bg-surface-1 px-2 pb-1.5 pt-1.5 shadow-[0_1px_2px_rgb(0_0_0/0.2)] transition-[transform,box-shadow,border-color,opacity] duration-150",
        "hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_6px_16px_-6px_rgb(0_0_0/0.5)] active:cursor-grabbing",
        status === "missed" ? "border-danger/30" : "border-border-subtle",
        done && !celebrate && "opacity-55",
        celebrate && "ff-flash",
        isDragging && "opacity-30",
      )}
    >
      {/* Top row: tick (or timer / history mark) and when; the title gets the full width below. */}
      <div className="flex min-w-0 items-center justify-between gap-1.5">
        <span className="shrink-0" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <StatusControl task={task} status={status} timed={timed} isToday={isToday} celebrate={celebrate} onToggle={() => toggleCompletion(task.id)} />
        </span>
        <span className="flex min-w-0 items-center gap-1 overflow-hidden text-[0.6875rem] text-text-muted">
          {status === "missed" ? (
            <span className="truncate font-medium text-danger">não feita</span>
          ) : isToday ? (
            <TimeChip time={task.scheduledTime} done={done} compact />
          ) : (
            task.scheduledTime && <span className="tabular-nums">{task.scheduledTime}</span>
          )}
          {timed && !task.scheduledTime && (
            <span className="inline-flex items-center gap-0.5 whitespace-nowrap tabular-nums">
              <Timer size={11} />
              {formatMinutes(Math.round((task.durationSeconds ?? 0) / 60))}
            </span>
          )}
        </span>
      </div>
      <p
        className={classNames(
          "mt-1 line-clamp-2 hyphens-auto break-words text-[0.8125rem] font-medium leading-snug text-text-primary",
          done && "text-text-muted line-through",
        )}
      >
        {task.title}
      </p>
      {timed && task.scheduledTime && (
        <p className="mt-0.5 inline-flex items-center gap-0.5 text-[0.6875rem] tabular-nums text-text-muted">
          <Timer size={11} />
          {formatMinutes(Math.round((task.durationSeconds ?? 0) / 60))}
        </p>
      )}
    </div>
  );
}

function StatusControl({
  task,
  status,
  timed,
  isToday,
  celebrate,
  onToggle,
}: {
  task: TaskWithProgress;
  status: DayTaskStatus;
  timed: boolean;
  isToday: boolean;
  celebrate: boolean;
  onToggle: () => void;
}) {
  if (isToday && timed) return <TaskTimerControl task={task} compact />;

  if (isToday) {
    const done = status === "done";
    return (
      <button
        onClick={onToggle}
        aria-label={done ? "Desmarcar" : "Concluir"}
        className={classNames(
          "flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-md border-2 transition-colors",
          done ? "border-success bg-success text-white" : "border-border-strong hover:border-success hover:bg-success/10",
          celebrate && "ff-pop",
        )}
      >
        {done && <Check size={11} strokeWidth={3.5} />}
      </button>
    );
  }

  // Other days are read-only: history for the past, a hint for the future.
  if (status === "done")
    return (
      <span className="flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full bg-success/20 text-success" title="Feita neste dia">
        <Check size={11} strokeWidth={3} />
      </span>
    );
  if (status === "missed")
    return (
      <span className="flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full bg-danger/15 text-danger" title="Não foi feita neste dia">
        <X size={10} strokeWidth={3} />
      </span>
    );
  return <span className="block h-[1.125rem] w-[1.125rem] rounded-full border-2 border-dashed border-border-strong" title="Ainda vai chegar" />;
}

/** Add to one day: type a new weekly task, or repeat one you already have on other days. */
function QuickAddPopover({
  target,
  tasks,
  onClose,
}: {
  target: { anchor: PopoverAnchor; day: number } | null;
  tasks: TaskWithProgress[];
  onClose: () => void;
}) {
  const addWeeklyTaskDay = useTaskStore((s) => s.addWeeklyTaskDay);
  const day = target?.day ?? 0;
  const reuse = useMemo(() => tasks.filter((t) => !(t.recurrenceDays ?? []).includes(day)).slice(0, 6), [tasks, day]);

  if (!target) return null;

  return (
    <Popover anchor={target.anchor} onClose={onClose} title={`Adicionar na ${WEEKDAY_LABELS_LONG[day].toLowerCase()}`} width={300}>
      <div className="space-y-3">
        <InlineAdd
          alwaysOpen
          placeholder="Ex.: Academia 18h · Revisão por 30 min"
          describe={(p) => describeTask(p, p.days.length ? describeDays(p.days) : WEEKDAY_LABELS_LONG[day])}
          onSubmit={async (p) => {
            await createWeeklyTask({ ...p, days: p.days.length ? p.days : [day] }, [day]);
            onClose();
          }}
        />
        {reuse.length > 0 && (
          <div>
            <FieldLabel>Repetir aqui</FieldLabel>
            <div className="space-y-1">
              {reuse.map((t) => (
                <button
                  key={t.id}
                  onClick={async () => {
                    await addWeeklyTaskDay(t.id, day);
                    onClose();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{t.title}</span>
                  <span className="shrink-0 text-xs text-text-muted">{describeDays(t.recurrenceDays ?? [])}</span>
                  <Plus size={13} className="shrink-0 text-text-muted" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Popover>
  );
}
