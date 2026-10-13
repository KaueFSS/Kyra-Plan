import { useMemo, useState, type CSSProperties } from "react";
import { DateTime } from "luxon";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Plus } from "../ui/icons";
import { useScheduleStore } from "../../stores/scheduleStore";
import { createScheduleBlocks, suggestNextSlot } from "../../stores/smartActions";
import { useLiveTick } from "../../hooks/useLiveTick";
import { useClickGuard } from "../../hooks/useClickGuard";
import { weekDays } from "../../utils/calendarGrid";
import { WEEKDAY_LABELS_LONG, WEEKDAY_LABELS_SHORT, classNames } from "../../utils/format";
import { addMinutesToClock } from "../../utils/naturalLanguage";
import { clockToMinutes, durationLabel, minutesOfDay, relativeLabel } from "../../utils/timeHints";
import { InlineAdd } from "../ui/InlineAdd";
import { FieldLabel } from "../ui/FormControls";
import { Popover, anchorBelow, type PopoverAnchor } from "../ui/Popover";
import { BlockEditorPopover, type BlockDraft } from "./BlockEditorPopover";
import type { DragPayload, DropTarget } from "../dnd/types";
import type { WeeklyScheduleBlock } from "../../types/schedule";

interface QuickAdd {
  anchor: PopoverAnchor;
  day: number;
}

/**
 * The weekly schedule as a planner: one column per day with the day's
 * blocks as cards in time order. Each day has its own "+ Adicionar": type
 * "Inglês 14h" or reuse, in one click, something you already have on other
 * days. Drag a card to another day to move it; click it to edit.
 * Must be inside `AppDndContext`.
 */
export function WeeklyTimetable({ blocks }: { blocks: WeeklyScheduleBlock[] }) {
  const [editing, setEditing] = useState<BlockDraft | null>(null);
  const [quick, setQuick] = useState<QuickAdd | null>(null);

  const now = DateTime.fromMillis(useLiveTick(30_000));
  const today = now.weekday - 1;
  const clock = minutesOfDay(now) + now.second / 60;
  const days = weekDays(now.toISODate()!);

  const byDay = useMemo(
    () =>
      Array.from({ length: 7 }, (_, day) =>
        blocks.filter((b) => b.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime)),
      ),
    [blocks],
  );

  const openEditor = (anchor: PopoverAnchor, day: number) =>
    setEditing({ anchor, block: null, dayOfWeek: day, days: [day], ...slotAfter(byDay[day]) });

  return (
    <div className="grid h-full min-h-0 grid-cols-7 overflow-hidden rounded-lg border border-border-subtle bg-surface-0">
      {days.map((date, day) => (
        <DayColumn
          key={day}
          day={day}
          date={date}
          isToday={day === today}
          isPast={day < today}
          blocks={byDay[day]}
          clock={clock}
          last={day === 6}
          firstEver={blocks.length === 0 && day === today}
          onAdd={(anchor) => setQuick({ anchor, day })}
          onEdit={(block, anchor) => setEditing({ anchor, block, dayOfWeek: block.dayOfWeek, startTime: block.startTime, endTime: block.endTime })}
        />
      ))}

      <QuickAddPopover
        target={quick}
        blocks={blocks}
        dayBlocks={quick ? byDay[quick.day] : []}
        onClose={() => setQuick(null)}
        onMore={(anchor, day) => {
          setQuick(null);
          openEditor(anchor, day);
        }}
      />
      <BlockEditorPopover draft={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

/** A sensible slot for a new block on a day: right after its last one. */
function slotAfter(dayBlocks: WeeklyScheduleBlock[]): { startTime: string; endTime: string } {
  const last = dayBlocks[dayBlocks.length - 1];
  if (!last || last.endTime >= "23:00") return suggestNextSlot();
  return { startTime: last.endTime, endTime: addMinutesToClock(last.endTime, 60) };
}

function DayColumn({
  day,
  date,
  isToday,
  isPast,
  blocks,
  clock,
  last,
  firstEver,
  onAdd,
  onEdit,
}: {
  day: number;
  date: DateTime;
  isToday: boolean;
  isPast: boolean;
  blocks: WeeklyScheduleBlock[];
  clock: number;
  last: boolean;
  firstEver: boolean;
  onAdd: (anchor: PopoverAnchor) => void;
  onEdit: (block: WeeklyScheduleBlock, anchor: PopoverAnchor) => void;
}) {
  const target: DropTarget = { accepts: "schedule-day", day };
  const { setNodeRef, isOver } = useDroppable({ id: `planner-day-${day}`, data: target });

  return (
    <div
      ref={setNodeRef}
      className={classNames(
        "group/day flex min-h-0 min-w-0 flex-col transition-colors",
        !last && "border-r border-border-subtle",
        isOver ? "bg-accent-500/10" : isToday && "bg-accent-500/[0.05]",
      )}
    >
      <div className={classNames("flex shrink-0 items-center justify-center gap-1.5 border-b border-border-subtle py-1.5", isPast && "opacity-60")}>
        <span className={classNames("text-[0.6875rem] font-semibold uppercase tracking-wider", isToday ? "text-accent-400" : "text-text-muted")}>
          {isToday ? "Hoje" : WEEKDAY_LABELS_SHORT[day]}
        </span>
        <span
          className={classNames(
            "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[0.75rem] font-semibold tabular-nums",
            isToday ? "bg-accent-500 text-white" : "text-text-secondary",
          )}
        >
          {date.day}
        </span>
      </div>

      <div className="ff-scroll-quiet min-h-0 flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden p-1.5">
        {blocks.map((block) => (
          <ScheduleCard key={block.id} block={block} live={isToday ? liveState(block, clock) : null} onEdit={onEdit} />
        ))}

        {blocks.length === 0 ? (
          <button
            onClick={(e) => onAdd(anchorBelow(e.currentTarget))}
            className={classNames(
              "flex w-full flex-col items-center justify-center gap-1 rounded-lg py-5 text-center transition-colors",
              firstEver
                ? "border border-dashed border-accent-500/60 text-accent-400 hover:bg-accent-500/10"
                : "text-text-muted/70 hover:bg-surface-1 hover:text-accent-400",
            )}
          >
            <Plus size={16} className={firstEver ? undefined : "opacity-0 transition-opacity group-hover/day:opacity-100"} />
            <span className="text-[0.75rem] font-medium">{firstEver ? "Adicionar o primeiro" : "Livre"}</span>
          </button>
        ) : (
          <button
            onClick={(e) => onAdd(anchorBelow(e.currentTarget))}
            className="flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-[0.75rem] font-medium text-text-muted opacity-60 transition-all hover:bg-surface-1 hover:text-accent-400 hover:opacity-100 group-hover/day:opacity-100"
          >
            <Plus size={13} /> Adicionar
          </button>
        )}
      </div>
    </div>
  );
}

interface LiveState {
  phase: "past" | "now" | "soon";
  progress: number;
  label: string;
}

/** Where today's block stands: done, running (with progress) or starting within the hour. */
function liveState(block: WeeklyScheduleBlock, clock: number): LiveState | null {
  const start = clockToMinutes(block.startTime);
  const end = clockToMinutes(block.endTime);
  if (clock >= end) return { phase: "past", progress: 1, label: "" };
  if (clock >= start) return { phase: "now", progress: (clock - start) / (end - start), label: "agora" };
  if (start - clock <= 60) return { phase: "soon", progress: 0, label: relativeLabel(Math.ceil(start - clock)) };
  return null;
}

function ScheduleCard({
  block,
  live,
  onEdit,
}: {
  block: WeeklyScheduleBlock;
  live: LiveState | null;
  onEdit: (block: WeeklyScheduleBlock, anchor: PopoverAnchor) => void;
}) {
  const payload: DragPayload = { type: "schedule-block", block };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `planner-${block.id}`, data: payload });
  const swallowClick = useClickGuard(isDragging);
  const minutes = clockToMinutes(block.endTime) - clockToMinutes(block.startTime);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (swallowClick()) return;
        onEdit(block, { x: e.clientX + 8, y: e.clientY + 8 });
      }}
      title={`${block.title} · ${block.startTime}–${block.endTime} · ${durationLabel(minutes)}`}
      className={classNames(
        "@container relative cursor-grab overflow-hidden rounded-lg px-2.5 pb-2 pt-1.5 shadow-[0_1px_2px_rgb(0_0_0/0.25)] transition-[transform,box-shadow,filter,opacity] duration-150",
        "hover:-translate-y-0.5 hover:shadow-[0_6px_16px_-6px_rgb(0_0_0/0.5)] hover:brightness-110 active:cursor-grabbing",
        "bg-[color-mix(in_srgb,var(--block)_34%,var(--color-surface-1))]",
        live?.phase === "now" && "ring-2 ring-[var(--block)] ring-offset-1 ring-offset-surface-0",
        live?.phase === "past" && "opacity-45",
        isDragging && "opacity-30",
      )}
      style={{ "--block": block.color } as CSSProperties}
    >
      <p className="flex items-baseline gap-1.5 whitespace-nowrap text-[0.6875rem] font-medium tabular-nums text-text-primary/75">
        <span>
          {block.startTime}–{block.endTime}
        </span>
        <span className="hidden text-text-primary/50 @[10rem]:inline">· {durationLabel(minutes)}</span>
      </p>
      <p className="mt-0.5 line-clamp-2 text-[0.875rem] font-semibold leading-snug text-text-primary">{block.title}</p>
      {live && live.phase !== "past" && (
        <span
          className={classNames(
            "mt-1 inline-block rounded px-1.5 py-px text-[0.625rem] font-bold uppercase tracking-wide",
            live.phase === "now" ? "bg-[var(--block)] text-white" : "bg-black/20 text-text-primary/80",
          )}
        >
          {live.label}
        </span>
      )}
      {live?.phase === "now" && (
        <span className="absolute inset-x-0 bottom-0 h-1 bg-black/25">
          <span className="block h-full bg-[var(--block)]" style={{ width: `${live.progress * 100}%` }} />
        </span>
      )}
    </div>
  );
}

/**
 * The tiny "add to this day" box: write it ("Inglês 14h-15h") or click
 * something you already do on other days to repeat it here.
 */
function QuickAddPopover({
  target,
  blocks,
  dayBlocks,
  onClose,
  onMore,
}: {
  target: QuickAdd | null;
  blocks: WeeklyScheduleBlock[];
  dayBlocks: WeeklyScheduleBlock[];
  onClose: () => void;
  onMore: (anchor: PopoverAnchor, day: number) => void;
}) {
  const create = useScheduleStore((s) => s.create);
  const [busy, setBusy] = useState(false);

  // Each subject once, with the time it usually happens — not already on this day.
  const reuse = useMemo(() => {
    const onDay = new Set(dayBlocks.map((b) => b.title.trim().toLowerCase()));
    const seen = new Map<string, WeeklyScheduleBlock>();
    for (const b of blocks) {
      const key = b.title.trim().toLowerCase();
      if (!onDay.has(key) && !seen.has(key)) seen.set(key, b);
    }
    return [...seen.values()].slice(0, 6);
  }, [blocks, dayBlocks]);

  if (!target) return null;
  const { day } = target;

  const repeat = async (b: WeeklyScheduleBlock) => {
    setBusy(true);
    try {
      await create({ dayOfWeek: day, startTime: b.startTime, endTime: b.endTime, title: b.title, description: "", color: b.color });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover anchor={target.anchor} onClose={onClose} title={`Adicionar na ${WEEKDAY_LABELS_LONG[day].toLowerCase()}`} width={300}>
      <div className="space-y-3">
        <InlineAdd
          kind="schedule"
          alwaysOpen
          placeholder="Ex.: Inglês 14h-15h"
          onSubmit={async (p) => {
            await createScheduleBlocks(p, [day], slotAfter(dayBlocks));
            onClose();
          }}
        />

        {reuse.length > 0 && (
          <div>
            <FieldLabel>Repetir aqui</FieldLabel>
            <div className="space-y-1">
              {reuse.map((b) => (
                <button
                  key={b.id}
                  disabled={busy}
                  onClick={() => void repeat(b)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-2"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: b.color }} />
                  <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{b.title}</span>
                  <span className="shrink-0 text-xs tabular-nums text-text-muted">
                    {b.startTime}–{b.endTime}
                  </span>
                  <Plus size={13} className="shrink-0 text-text-muted" />
                </button>
              ))}
            </div>
          </div>
        )}

        <button className="w-full text-center text-xs font-medium text-accent-400 hover:underline" onClick={() => onMore(target.anchor, day)}>
          Mais opções (vários dias, horário exato, cor)…
        </button>
      </div>
    </Popover>
  );
}
