import { useMemo, useState, type CSSProperties } from "react";
import { DateTime } from "luxon";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CalendarRange, Plus } from "../ui/icons";
import { useScheduleStore } from "../../stores/scheduleStore";
import { colorForTitle, createScheduleBlocks, suggestNextSlot } from "../../stores/smartActions";
import { useLiveTick } from "../../hooks/useLiveTick";
import { useClickGuard } from "../../hooks/useClickGuard";
import { weekDays } from "../../utils/calendarGrid";
import { WEEKDAY_LABELS_SHORT, classNames } from "../../utils/format";
import { clockToMinutes, durationLabel, minutesOfDay, relativeLabel } from "../../utils/timeHints";
import { describeDays } from "../../utils/naturalLanguage";
import { InlineAdd } from "../ui/InlineAdd";
import { Popover, type PopoverAnchor } from "../ui/Popover";
import { FieldLabel, PopoverActions } from "../ui/FormControls";
import { BlockEditorPopover, type BlockDraft } from "./BlockEditorPopover";
import type { DragPayload, DropTarget } from "../dnd/types";
import type { WeeklyScheduleBlock } from "../../types/schedule";

interface Slot {
  startTime: string;
  endTime: string;
  blocks: WeeklyScheduleBlock[];
}

/** One row per distinct time slot actually in use, earliest first. */
export function buildSlots(blocks: WeeklyScheduleBlock[]): Slot[] {
  const bySlot = new Map<string, Slot>();
  for (const block of blocks) {
    const key = `${block.startTime}|${block.endTime}`;
    const slot = bySlot.get(key) ?? { startTime: block.startTime, endTime: block.endTime, blocks: [] };
    slot.blocks.push(block);
    bySlot.set(key, slot);
  }
  return [...bySlot.values()].sort((a, b) => a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime));
}

interface CellDraft {
  anchor: PopoverAnchor;
  day: number;
  slot: Slot;
}

const GRID_COLUMNS = "4.25rem repeat(7, minmax(0, 1fr))";

/**
 * The weekly schedule as a school-style timetable that builds itself: every
 * time slot you create (e.g. 08:00–09:00) becomes a row, and you fill that
 * row for any day of the week. Empty hours never take space. Blocks can be
 * dragged to any other cell (day and/or slot). Must be inside `AppDndContext`.
 */
export function WeeklyTimetable({ blocks }: { blocks: WeeklyScheduleBlock[] }) {
  const [editing, setEditing] = useState<BlockDraft | null>(null);
  const [cellDraft, setCellDraft] = useState<CellDraft | null>(null);
  const [slotDraft, setSlotDraft] = useState<{ anchor: PopoverAnchor; slot: Slot } | null>(null);

  const now = DateTime.fromMillis(useLiveTick(30_000));
  const today = now.weekday - 1;
  const nowClock = now.toFormat("HH:mm");
  const days = weekDays(now.toISODate()!);
  const slots = useMemo(() => buildSlots(blocks), [blocks]);

  const todaySlots = slots.filter((s) => s.blocks.some((b) => b.dayOfWeek === today));
  const currentSlot = todaySlots.find((s) => s.startTime <= nowClock && nowClock < s.endTime);
  const nextSlot = currentSlot ? undefined : todaySlots.find((s) => s.startTime > nowClock);

  if (slots.length === 0) {
    return (
      <div key="empty" className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <CalendarRange size={40} strokeWidth={1.6} className="ff-glyph" />
        <div>
          <p className="text-sm font-semibold text-text-primary">Monte sua grade da semana</p>
          <p className="mt-1 max-w-sm text-xs text-text-muted">
            Escreva um horário e os dias. Cada horário vira uma linha da tabela, e você preenche os outros dias clicando nas células.
          </p>
        </div>
        <div className="w-full max-w-md text-left">
          <InlineAdd
            alwaysOpen
            placeholder="Ex.: Aula de cálculo seg qua sex 08:00-10:00"
            onSubmit={(p) => createScheduleBlocks(p, [today], suggestNextSlot())}
          />
        </div>
      </div>
    );
  }

  return (
    <div key="table" className="flex h-full min-h-0 flex-col">
      <div className="grid shrink-0 gap-1 pb-1.5" style={{ gridTemplateColumns: GRID_COLUMNS }}>
        <span />
        {days.map((date, day) => (
          <div key={day} className="flex items-center justify-center gap-1.5">
            <span className={classNames("text-[0.6875rem] font-semibold uppercase tracking-wider", day === today ? "text-accent-400" : "text-text-muted")}>
              {WEEKDAY_LABELS_SHORT[day]}
            </span>
            <span
              className={classNames(
                "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[0.75rem] font-semibold tabular-nums",
                day === today ? "bg-accent-500 text-white" : "text-text-secondary",
              )}
            >
              {date.day}
            </span>
          </div>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
        {slots.map((slot) => {
          const isCurrent = slot === currentSlot;
          const isNext = slot === nextSlot;
          return (
            <div
              key={`${slot.startTime}-${slot.endTime}`}
              className={classNames("grid gap-1 rounded-lg transition-colors", isCurrent && "bg-accent-500/[0.07] ring-1 ring-accent-500/40")}
              style={{ gridTemplateColumns: GRID_COLUMNS }}
            >
              <button
                onClick={(e) => setSlotDraft({ slot, anchor: { x: e.clientX + 8, y: e.clientY + 8 } })}
                title="Editar este horário"
                className="flex flex-col items-start justify-center rounded-md px-1.5 py-1 text-left hover:bg-surface-2"
              >
                <span className={classNames("text-xs font-semibold tabular-nums", isCurrent ? "text-accent-400" : "text-text-primary")}>
                  {slot.startTime}
                </span>
                <span className="text-[0.6875rem] tabular-nums text-text-muted">
                  {slot.endTime} · {durationLabel(clockToMinutes(slot.endTime) - clockToMinutes(slot.startTime))}
                </span>
                {(isCurrent || isNext) && (
                  <span
                    className={classNames(
                      "mt-0.5 rounded px-1 text-[0.6875rem] font-bold uppercase tracking-wide",
                      isCurrent ? "bg-accent-500 text-white" : "bg-surface-3 text-text-secondary",
                    )}
                  >
                    {isCurrent ? "Agora" : "A seguir"}
                  </span>
                )}
              </button>

              {days.map((_, day) => (
                <TimetableCell
                  key={day}
                  day={day}
                  slot={slot}
                  isToday={day === today}
                  clock={minutesOfDay(now) + now.second / 60}
                  onCreate={(anchor) => setCellDraft({ anchor, day, slot })}
                  onEdit={(block, anchor) =>
                    setEditing({ anchor, block, dayOfWeek: block.dayOfWeek, startTime: block.startTime, endTime: block.endTime })
                  }
                />
              ))}
            </div>
          );
        })}
      </div>

      <div className="mt-2 shrink-0">
        <InlineAdd
          label="Novo horário"
          placeholder="Ex.: Academia seg qua sex 18h-19h"
          onSubmit={(p) => createScheduleBlocks(p, [today], suggestNextSlot())}
        />
      </div>

      <BlockEditorPopover draft={editing} onClose={() => setEditing(null)} />
      <CellCreatePopover draft={cellDraft} onClose={() => setCellDraft(null)} allBlocks={blocks} />
      <SlotEditorPopover target={slotDraft} onClose={() => setSlotDraft(null)} />
    </div>
  );
}

function TimetableCell({
  day,
  slot,
  isToday,
  clock,
  onCreate,
  onEdit,
}: {
  day: number;
  slot: Slot;
  isToday: boolean;
  clock: number;
  onCreate: (anchor: PopoverAnchor) => void;
  onEdit: (block: WeeklyScheduleBlock, anchor: PopoverAnchor) => void;
}) {
  const target: DropTarget = { accepts: "schedule-cell", day, startTime: slot.startTime, endTime: slot.endTime };
  const { setNodeRef, isOver } = useDroppable({ id: `cell-${day}-${slot.startTime}-${slot.endTime}`, data: target });
  const cellBlocks = slot.blocks.filter((b) => b.dayOfWeek === day);

  return (
    <div
      ref={setNodeRef}
      className={classNames(
        "group flex min-h-[2.75rem] min-w-0 flex-col gap-0.5 rounded-md border transition-colors",
        isOver ? "border-accent-500 bg-accent-500/15" : cellBlocks.length ? "border-transparent" : "border-dashed border-border-subtle/70",
        isToday && !isOver && !cellBlocks.length && "bg-accent-500/[0.04]",
      )}
    >
      {cellBlocks.map((block) => (
        <TimetableBlock key={block.id} block={block} onEdit={onEdit} live={isToday ? liveState(block, clock) : null} />
      ))}
      {cellBlocks.length === 0 && (
        <button
          onClick={(e) => onCreate({ x: e.clientX + 8, y: e.clientY + 8 })}
          className="flex flex-1 items-center justify-center text-text-muted opacity-0 transition-opacity hover:text-accent-400 group-hover:opacity-100"
          aria-label="Adicionar neste horário"
        >
          <Plus size={14} />
        </button>
      )}
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

function TimetableBlock({
  block,
  onEdit,
  live,
}: {
  block: WeeklyScheduleBlock;
  onEdit: (block: WeeklyScheduleBlock, anchor: PopoverAnchor) => void;
  live: LiveState | null;
}) {
  const payload: DragPayload = { type: "schedule-block", block };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `tt-${block.id}`, data: payload });
  const swallowClick = useClickGuard(isDragging);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (swallowClick()) return;
        onEdit(block, { x: e.clientX + 8, y: e.clientY + 8 });
      }}
      title={`${block.title} · ${block.startTime}–${block.endTime}`}
      className={classNames(
        "relative flex min-h-[2.75rem] flex-1 cursor-grab items-center gap-1.5 overflow-hidden rounded-lg px-2 py-1 transition-colors active:cursor-grabbing",
        live?.phase === "past" && "opacity-45",
        live?.phase === "now" && "ring-2 ring-[var(--block)]",
        "bg-[color-mix(in_srgb,var(--block)_15%,var(--color-surface-2))] hover:bg-[color-mix(in_srgb,var(--block)_24%,var(--color-surface-2))]",
        "shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--block)_32%,transparent)]",
        isDragging && "opacity-30",
      )}
      style={{ "--block": block.color } as CSSProperties}
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: block.color }} />
      <span className="min-w-0 flex-1">
        <span className={classNames("block text-[0.75rem] font-semibold leading-tight text-text-primary", live && live.phase !== "past" ? "truncate" : "line-clamp-2")}>
          {block.title}
        </span>
        {live && live.phase !== "past" && (
          <span
            className={classNames(
              "block truncate text-[0.625rem] font-bold leading-tight",
              live.phase === "now" ? "uppercase tracking-wide text-[color-mix(in_srgb,var(--block)_70%,white)]" : "text-text-secondary",
            )}
          >
            {live.label}
          </span>
        )}
      </span>
      {live?.phase === "now" && (
        <span className="absolute inset-x-0 bottom-0 h-1 bg-[color-mix(in_srgb,var(--block)_25%,transparent)]">
          <span className="block h-full bg-[var(--block)]" style={{ width: `${live.progress * 100}%` }} />
        </span>
      )}
    </div>
  );
}

/** Quick create for an empty cell: suggests what's already in that row. */
function CellCreatePopover({ draft, onClose, allBlocks }: { draft: CellDraft | null; onClose: () => void; allBlocks: WeeklyScheduleBlock[] }) {
  const create = useScheduleStore((s) => s.create);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const suggestions = useMemo(() => {
    if (!draft) return [];
    const inRow = draft.slot.blocks.map((b) => b.title);
    const recent = [...allBlocks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((b) => b.title);
    return Array.from(new Set([...inRow, ...recent])).slice(0, 6);
  }, [draft, allBlocks]);

  const save = async (value: string) => {
    if (!draft || !value.trim()) return;
    setSaving(true);
    try {
      await create({
        dayOfWeek: draft.day,
        startTime: draft.slot.startTime,
        endTime: draft.slot.endTime,
        title: value.trim(),
        description: "",
        color: colorForTitle(value, allBlocks),
      });
      setTitle("");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover
      anchor={draft?.anchor ?? null}
      onClose={onClose}
      title={draft ? `${WEEKDAY_LABELS_SHORT[draft.day]} · ${draft.slot.startTime}–${draft.slot.endTime}` : ""}
      width={260}
    >
      <input
        autoFocus
        className="ff-input w-full"
        placeholder="O que acontece aqui?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save(title)}
      />
      {suggestions.length > 0 && (
        <div className="mt-2.5">
          <FieldLabel>Sugestões</FieldLabel>
          <div className="flex flex-wrap gap-1">
            {suggestions.map((s) => (
              <button
                key={s}
                disabled={saving}
                onClick={() => save(s)}
                className="max-w-full truncate rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-[0.75rem] text-text-secondary hover:border-accent-500 hover:text-text-primary"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
      <PopoverActions onSave={() => save(title)} saving={saving} saveLabel="Criar" />
    </Popover>
  );
}

/** Edits a whole row: moving the slot's times moves every block in it. */
function SlotEditorPopover({ target, onClose }: { target: { anchor: PopoverAnchor; slot: Slot } | null; onClose: () => void }) {
  const { reschedule, remove } = useScheduleStore();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastSlot, setLastSlot] = useState<Slot | null>(null);

  if (target && target.slot !== lastSlot) {
    setLastSlot(target.slot);
    setStartTime(target.slot.startTime);
    setEndTime(target.slot.endTime);
    setError(null);
  }

  const save = async () => {
    if (!target) return;
    if (endTime <= startTime) return setError("O fim deve ser depois do início.");
    await Promise.all(target.slot.blocks.map((b) => reschedule(b.id, b.dayOfWeek, startTime, endTime)));
    onClose();
  };

  const days = target ? Array.from(new Set(target.slot.blocks.map((b) => b.dayOfWeek))).sort() : [];

  return (
    <Popover anchor={target?.anchor ?? null} onClose={onClose} title="Horário da linha" width={250}>
      <div className="space-y-3" onKeyDown={(e) => e.key === "Enter" && save()}>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <FieldLabel>Início</FieldLabel>
            <input type="time" className="ff-input w-full" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label>
            <FieldLabel>Fim</FieldLabel>
            <input type="time" className="ff-input w-full" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </label>
        </div>
        <p className="text-[0.75rem] text-text-muted">
          Vale para os {target?.slot.blocks.length ?? 0} blocos da linha ({describeDays(days)}).
        </p>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
      <PopoverActions
        onSave={save}
        onDelete={async () => {
          if (!target) return;
          await Promise.all(target.slot.blocks.map((b) => remove(b.id)));
          onClose();
        }}
      />
    </Popover>
  );
}
