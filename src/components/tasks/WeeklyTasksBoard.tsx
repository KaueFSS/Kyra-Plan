import { useEffect, useRef, useState, type ReactNode } from "react";
import { DateTime } from "luxon";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Check, GripVertical, ListChecks, Plus, Sparkles, Timer, X } from "../ui/icons";
import { useElementSize } from "../../hooks/useElementSize";
import { Popover, anchorBelow, type PopoverAnchor } from "../ui/Popover";
import { useTaskStore } from "../../stores/taskStore";
import { useClickGuard } from "../../hooks/useClickGuard";
import { useLiveTick } from "../../hooks/useLiveTick";
import { InlineAdd } from "../ui/InlineAdd";
import { TaskEditorPopover, type TaskEditTarget } from "./TaskEditorPopover";
import { createWeeklyTask } from "../../stores/smartActions";
import { describeDays, describeTask, formatMinutes } from "../../utils/naturalLanguage";
import { TaskTimerControl } from "./TaskTimerControl";
import { TimeChip } from "./TimeChip";
import { PriorityDot } from "./PriorityDot";
import { AlarmDays } from "../alarms/AlarmDays";
import { WEEKDAY_LABELS_LONG, WEEKDAY_LABELS_SHORT, classNames } from "../../utils/format";
import { buildWeek, statusOn, weekTotals, type DayTaskStatus, type WeekDayInfo } from "./weekProgress";
import type { DragPayload, DropTarget } from "../dnd/types";
import type { TaskWithProgress } from "../../types/task";

/**
 * Weekly tasks as a week strip + day focus: seven day pills with progress
 * rings (click to open a day, drop a task on one to move it there) and a
 * roomy list for the chosen day. Must be rendered inside an `AppDndContext`.
 */
export function WeeklyTasksBoard({ tasks }: { tasks: TaskWithProgress[] }) {
  const now = DateTime.fromMillis(useLiveTick(60_000));
  const today = now.weekday - 1;
  const [selected, setSelected] = useState(today);
  const [editing, setEditing] = useState<TaskEditTarget | null>(null);

  const week = buildWeek(tasks, now);
  const totals = weekTotals(week);
  const info = week[selected];
  // Short widgets (like on the home tab) get a denser layout so the list keeps its room.
  const { ref, height } = useElementSize<HTMLDivElement>();
  const compact = height > 0 && height < 400;

  const addTask = (
    <InlineAdd
      alwaysOpen={compact}
      label={info.isToday ? "Nova tarefa para hoje" : `Nova tarefa na ${WEEKDAY_LABELS_SHORT[selected].toLowerCase()}`}
      placeholder="Ex.: Academia seg qua sex 18h · Revisão por 30 min"
      describe={(p) => describeTask(p, p.days.length ? describeDays(p.days) : WEEKDAY_LABELS_LONG[selected])}
      onSubmit={(p) => createWeeklyTask({ ...p, days: p.days.length ? p.days : [selected] }, [selected])}
    />
  );

  return (
    <div ref={ref} className={classNames("flex h-full min-h-0 flex-col", compact ? "gap-1.5" : "gap-2.5")}>
      <div className="grid shrink-0 grid-cols-7 gap-1.5">
        {week.map((d) => (
          <DayPill key={d.day} info={d} compact={compact} selected={d.day === selected} onSelect={() => setSelected(d.day)} />
        ))}
      </div>

      {!compact && <WeekBar week={week} totals={totals} />}

      <div
        className={classNames(
          "@container flex min-h-0 flex-1 flex-col",
          !compact && "rounded-xl border border-border-subtle bg-surface-0/40 p-2",
        )}
      >
        <DayHeader info={info} compact={compact} totals={totals} addTask={compact ? addTask : null} />
        <DayList info={info} today={today} compact={compact} onEdit={setEditing} />
        {!compact && <div className="mt-1.5 shrink-0">{addTask}</div>}
      </div>

      <TaskEditorPopover target={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

// ── Week strip ────────────────────────────────────────────────────────────

function DayPill({ info, selected, compact, onSelect }: { info: WeekDayInfo; selected: boolean; compact: boolean; onSelect: () => void }) {
  const target: DropTarget = { accepts: "weekly-task", day: info.day };
  const { setNodeRef, isOver } = useDroppable({ id: `weekly-day-${info.day}`, data: target });
  const total = info.tasks.length;
  const complete = total > 0 && info.done === total;
  const fraction = total > 0 ? info.done / total : 0;

  const ringColor = complete
    ? "var(--color-success)"
    : info.isPast && info.missed > 0
      ? "var(--color-danger)"
      : "var(--color-accent-500)";

  const r = 15;
  const c = 2 * Math.PI * r;

  return (
    <button
      ref={setNodeRef}
      onClick={onSelect}
      title={
        total === 0
          ? `${WEEKDAY_LABELS_LONG[info.day]}: livre`
          : `${WEEKDAY_LABELS_LONG[info.day]}: ${info.done} de ${total} feitas${info.missed ? ` · ${info.missed} não feita(s)` : ""}`
      }
      className={classNames(
        "group relative flex min-w-0 flex-col items-center rounded-xl border px-1 transition-all",
        compact ? "gap-0.5 py-1" : "gap-1 pb-1.5 pt-2",
        isOver
          ? "scale-105 border-accent-500 bg-accent-500/15"
          : selected
            ? "border-accent-500/60 bg-surface-2 shadow-[0_4px_16px_-6px_var(--color-accent-glow)]"
            : "border-transparent hover:bg-surface-2",
        info.isPast && !selected && !isOver && "opacity-60 hover:opacity-100",
      )}
    >
      <span className={classNames("text-[0.6875rem] font-bold uppercase tracking-wider", info.isToday ? "text-accent-400" : "text-text-muted")}>
        {info.isToday ? "Hoje" : WEEKDAY_LABELS_SHORT[info.day]}
      </span>

      <span className={classNames("relative flex items-center justify-center", compact ? "h-8 w-8" : "h-10 w-10")}>
        <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="18" cy="18" r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth="3" />
          {total > 0 && (
            <circle
              cx="18"
              cy="18"
              r={r}
              fill="none"
              stroke={ringColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - fraction)}
              className="transition-[stroke-dashoffset,stroke] duration-700 ease-out"
            />
          )}
        </svg>
        {complete ? (
          <span key="done" className={classNames("ff-pop flex items-center justify-center rounded-full bg-success text-white", compact ? "h-5 w-5" : "h-6 w-6")}>
            <Check size={13} strokeWidth={3.2} />
          </span>
        ) : (
          <span
            className={classNames(
              "text-sm font-semibold tabular-nums",
              info.isToday ? "text-text-primary" : total > 0 ? "text-text-secondary" : "text-text-muted",
            )}
          >
            {info.date.day}
          </span>
        )}
      </span>

      <span
        className={classNames(
          "h-3.5 text-[0.6875rem] font-medium tabular-nums leading-none",
          compact && "hidden",
          complete ? "text-success" : info.isPast && info.missed ? "text-danger" : "text-text-muted",
        )}
      >
        {total === 0 ? "livre" : `${info.done}/${total}`}
      </span>
    </button>
  );
}

/** One segment per day, filled by how much of that day got done. */
function WeekBar({ week, totals }: { week: WeekDayInfo[]; totals: ReturnType<typeof weekTotals> }) {
  if (totals.total === 0) return null;
  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <div className="flex h-1.5 flex-1 gap-1">
        {week.map((d) => (
          <span key={d.day} className="relative flex-1 overflow-hidden rounded-full bg-surface-3">
            {d.tasks.length > 0 && (
              <span
                className={classNames(
                  "absolute inset-y-0 left-0 rounded-full transition-[width] duration-700",
                  d.done === d.tasks.length ? "bg-success" : d.isPast ? "bg-danger/70" : "bg-accent-500",
                )}
                style={{ width: `${(d.done / d.tasks.length) * 100}%` }}
              />
            )}
          </span>
        ))}
      </div>
      <span className={classNames("shrink-0 text-[0.75rem] font-semibold tabular-nums", totals.perfect ? "text-success" : "text-text-secondary")}>
        {totals.perfect ? "Semana perfeita!" : `${totals.done} de ${totals.total} na semana`}
      </span>
    </div>
  );
}

// ── Chosen day ────────────────────────────────────────────────────────────

function DayHeader({
  info,
  compact,
  totals,
  addTask,
}: {
  info: WeekDayInfo;
  compact: boolean;
  totals: ReturnType<typeof weekTotals>;
  addTask: ReactNode;
}) {
  const [addAnchor, setAddAnchor] = useState<PopoverAnchor | null>(null);
  const total = info.tasks.length;
  const pending = total - info.done - info.missed;
  const complete = total > 0 && info.done === total;

  return (
    <div className={classNames("flex shrink-0 items-center gap-2 px-1", compact ? "mb-1" : "mb-1.5")}>
      <p className="truncate text-sm font-semibold text-text-primary">
        {info.isToday ? "Hoje" : WEEKDAY_LABELS_LONG[info.day]}
        <span className="ml-1.5 font-normal text-text-muted">{info.date.setLocale("pt-BR").toFormat("d 'de' MMM")}</span>
      </p>
      <span className="ml-auto flex shrink-0 items-center gap-1.5">
        {complete ? (
          <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[0.75rem] font-semibold text-success">
            <Sparkles size={12} /> Dia completo!
          </span>
        ) : (
          <>
            {info.missed > 0 && (
              <span className="rounded-full bg-danger/15 px-2 py-0.5 text-[0.75rem] font-semibold text-danger">
                {info.missed} não {info.missed === 1 ? "feita" : "feitas"}
              </span>
            )}
            {pending > 0 && (
              <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[0.75rem] font-medium text-text-secondary">
                {pending} {info.isToday ? (pending === 1 ? "pendente" : "pendentes") : pending === 1 ? "agendada" : "agendadas"}
              </span>
            )}
          </>
        )}
        {compact && totals.total > 0 && (
          <span
            className={classNames("text-[0.75rem] font-semibold tabular-nums", totals.perfect ? "text-success" : "text-text-muted")}
            title="Feitas na semana"
          >
            {totals.perfect ? "Semana perfeita!" : `${totals.done}/${totals.total} semana`}
          </span>
        )}
        {addTask && (
          <button
            onClick={(e) => setAddAnchor(anchorBelow(e.currentTarget))}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-border-subtle bg-surface-2 text-text-secondary hover:border-accent-500 hover:text-accent-400"
            title={info.isToday ? "Nova tarefa para hoje" : `Nova tarefa na ${WEEKDAY_LABELS_LONG[info.day].toLowerCase()}`}
            aria-label="Nova tarefa"
          >
            <Plus size={13} />
          </button>
        )}
      </span>
      {addTask && (
        <Popover
          anchor={addAnchor}
          onClose={() => setAddAnchor(null)}
          title={info.isToday ? "Nova tarefa para hoje" : `Nova tarefa · ${WEEKDAY_LABELS_LONG[info.day]}`}
          width={340}
        >
          {addTask}
        </Popover>
      )}
    </div>
  );
}

const ORDER: Record<DayTaskStatus, number> = { pending: 0, upcoming: 0, missed: 1, done: 2 };

function DayList({ info, today, compact, onEdit }: { info: WeekDayInfo; today: number; compact: boolean; onEdit: (t: TaskEditTarget) => void }) {
  if (info.tasks.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1.5 text-center">
        {!compact && <ListChecks size={30} strokeWidth={1.6} className="ff-glyph opacity-70" />}
        <p className="text-sm font-medium text-text-secondary">{info.isToday ? "Nada para hoje" : `${WEEKDAY_LABELS_LONG[info.day]} livre`}</p>
        <p className="text-[0.75rem] text-text-muted">{compact ? "Use o + ou arraste uma tarefa até este dia." : "Adicione abaixo ou arraste uma tarefa até este dia."}</p>
      </div>
    );
  }

  const rows = info.tasks
    .map((task) => ({ task, status: statusOn(task, info.day, today, info.date) }))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || (a.task.scheduledTime ?? "99").localeCompare(b.task.scheduledTime ?? "99"));

  return (
    <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
      {rows.map(({ task, status }) => (
        <WeeklyTaskRow key={task.id} task={task} day={info.day} today={today} status={status} compact={compact} onEdit={onEdit} />
      ))}
    </div>
  );
}

function WeeklyTaskRow({
  task,
  day,
  today,
  status,
  compact,
  onEdit,
}: {
  task: TaskWithProgress;
  day: number;
  today: number;
  status: DayTaskStatus;
  compact: boolean;
  onEdit: (target: TaskEditTarget) => void;
}) {
  const toggleCompletion = useTaskStore((s) => s.toggleCompletion);
  const payload: DragPayload = { type: "weekly-task", taskId: task.id, fromDay: day, title: task.title, color: "var(--color-accent-500)" };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `weekly-${task.id}-${day}`, data: payload });
  const swallowClick = useClickGuard(isDragging);
  const timed = (task.durationSeconds ?? 0) > 0;
  const done = status === "done";

  // Celebrate only the moment it flips to done, not on every render.
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
      className={classNames(
        "group flex items-center gap-2.5 rounded-lg border px-2 transition-colors",
        compact ? "py-1.5" : "py-2",
        status === "missed" ? "border-danger/25 bg-danger/[0.05]" : "border-transparent bg-surface-1 hover:border-border-subtle",
        done && !celebrate && "opacity-60",
        celebrate && "ff-flash",
        isDragging && "opacity-30",
      )}
    >
      <span
        {...listeners}
        {...attributes}
        className="-ml-1 flex h-5 w-3.5 shrink-0 cursor-grab items-center justify-center text-text-muted opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        title="Arraste até um dia da semana"
      >
        <GripVertical size={13} />
      </span>

      <StatusControl task={task} status={status} timed={timed} celebrate={celebrate} isToday={day === today} onToggle={() => toggleCompletion(task.id)} />

      <button
        onClick={(e) => {
          if (swallowClick()) return;
          onEdit({ task, anchor: { x: e.clientX + 8, y: e.clientY + 8 } });
        }}
        className={classNames("min-w-0 flex-1 text-left", compact && "flex items-center gap-2")}
      >
        <p className={classNames("truncate text-sm font-medium text-text-primary", compact && "min-w-0 flex-1", done && "text-text-muted line-through")}>
          {task.title}
        </p>
        <p
          className={classNames(
            "flex items-center gap-x-2 text-[0.75rem] text-text-muted",
            compact ? "shrink-0" : "mt-0.5 flex-wrap gap-y-0.5",
          )}
        >
          {day === today ? (
            <TimeChip time={task.scheduledTime} done={done} className={compact ? undefined : "-ml-1.5"} />
          ) : (
            task.scheduledTime && <span className="tabular-nums">{task.scheduledTime}</span>
          )}
          {timed && (
            <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
              <Timer size={12} />
              {formatMinutes(Math.round((task.durationSeconds ?? 0) / 60))}
            </span>
          )}
          {status === "missed" && <span className="font-medium text-danger">não feita</span>}
          {status === "upcoming" && !task.scheduledTime && !timed && <span>agendada</span>}
        </p>
      </button>

      <span className="hidden shrink-0 @md:flex" title="Dias em que repete">
        <AlarmDays days={task.recurrenceDays ?? []} enabled today={today} />
      </span>
      <PriorityDot priority={task.priority} />
    </div>
  );
}

function StatusControl({
  task,
  status,
  timed,
  celebrate,
  isToday,
  onToggle,
}: {
  task: TaskWithProgress;
  status: DayTaskStatus;
  timed: boolean;
  celebrate: boolean;
  isToday: boolean;
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
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
          done ? "border-success bg-success text-white" : "border-border-strong hover:border-success hover:bg-success/10",
          celebrate && "ff-pop",
        )}
      >
        {done && <Check size={12} strokeWidth={3.5} />}
      </button>
    );
  }

  // Other days are read-only: history for the past, a hint for the future.
  if (status === "done")
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/20 text-success" title="Feita neste dia">
        <Check size={12} strokeWidth={3} />
      </span>
    );
  if (status === "missed")
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger" title="Não foi feita neste dia">
        <X size={11} strokeWidth={3} />
      </span>
    );
  return <span className="h-5 w-5 shrink-0 rounded-full border-2 border-dashed border-border-strong" title="Ainda vai chegar" />;
}
