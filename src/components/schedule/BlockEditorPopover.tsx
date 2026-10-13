import { useEffect, useMemo, useState } from "react";
import { Popover, type PopoverAnchor } from "../ui/Popover";
import { ColorSwatches, DayToggles, FieldLabel, PALETTE, PopoverActions } from "../ui/FormControls";
import { useScheduleStore } from "../../stores/scheduleStore";
import { colorForTitle } from "../../stores/smartActions";
import { addMinutesToClock } from "../../utils/naturalLanguage";
import { clockToMinutes, durationLabel } from "../../utils/timeHints";
import { ApiError } from "../../services/tauri";
import { classNames } from "../../utils/format";
import type { WeeklyScheduleBlock } from "../../types/schedule";

export interface BlockDraft {
  anchor: PopoverAnchor;
  block: WeeklyScheduleBlock | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  /** New blocks only: create the same block on several days at once. */
  days?: number[];
}

const DURATIONS = [30, 45, 60, 90, 120];

/**
 * The one editor for timetable blocks — "Novo horário" (header +), a click on
 * an empty cell, or a click on a block to edit it. New blocks can go on
 * several days at once; duration chips set the end time; the colour follows
 * the subject automatically until you pick one.
 */
export function BlockEditorPopover({ draft, onClose }: { draft: BlockDraft | null; onClose: () => void }) {
  const { blocks, create, update, remove } = useScheduleStore();
  const [title, setTitle] = useState("");
  const [days, setDays] = useState<number[]>([0]);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [color, setColor] = useState(PALETTE[0]);
  const [colorPicked, setColorPicked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = !!draft?.block;

  useEffect(() => {
    if (!draft) return;
    setTitle(draft.block?.title ?? "");
    setDays(draft.days?.length ? draft.days : [draft.dayOfWeek]);
    setStartTime(draft.startTime);
    setEndTime(draft.endTime);
    setColor(draft.block?.color ?? PALETTE[0]);
    setColorPicked(!!draft.block);
    setError(null);
  }, [draft]);

  // Subjects already in the timetable, most used first — one click to reuse.
  const suggestions = useMemo(() => {
    const count = new Map<string, number>();
    for (const b of blocks) count.set(b.title, (count.get(b.title) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 6);
  }, [blocks]);

  const pickTitle = (value: string) => {
    setTitle(value);
    if (!colorPicked) setColor(colorForTitle(value, blocks));
  };

  const minutes = clockToMinutes(endTime) - clockToMinutes(startTime);

  const save = async () => {
    if (!title.trim()) return setError("Dê um nome, ex.: Aula de cálculo.");
    if (days.length === 0) return setError("Escolha pelo menos um dia.");
    if (endTime <= startTime) return setError("O fim deve ser depois do início.");
    setSaving(true);
    try {
      if (draft?.block) {
        await update({
          id: draft.block.id,
          description: draft.block.description,
          dayOfWeek: days[0],
          startTime,
          endTime,
          title: title.trim(),
          color,
        });
      } else {
        for (const dayOfWeek of days) {
          await create({ dayOfWeek, startTime, endTime, title: title.trim(), description: "", color });
        }
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover anchor={draft?.anchor ?? null} onClose={onClose} title={editing ? "Editar horário" : "Novo horário"} width={320}>
      <div className="space-y-3" onKeyDown={(e) => e.key === "Enter" && save()}>
        <div>
          <input
            autoFocus
            className="ff-input w-full"
            placeholder="O quê? Ex.: Aula de cálculo"
            value={title}
            onChange={(e) => pickTitle(e.target.value)}
          />
          {!editing && suggestions.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => pickTitle(s)}
                  className={classNames(
                    "rounded-full border px-2 py-0.5 text-[0.75rem] transition-colors",
                    title === s ? "border-accent-500 bg-accent-500/15 text-accent-400" : "border-border-subtle text-text-secondary hover:border-border-strong",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <FieldLabel>{editing ? "Dia" : "Dias (pode marcar vários)"}</FieldLabel>
          <DayToggles single={editing} value={days} onChange={setDays} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label>
            <FieldLabel>Início</FieldLabel>
            <input
              type="time"
              className="ff-input w-full"
              value={startTime}
              onChange={(e) => {
                // Moving the start keeps the same duration.
                const keep = Math.max(15, minutes);
                setStartTime(e.target.value);
                if (e.target.value) setEndTime(addMinutesToClock(e.target.value, keep));
              }}
            />
          </label>
          <label>
            <FieldLabel>Fim</FieldLabel>
            <input type="time" className="ff-input w-full" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </label>
        </div>

        <div className="flex flex-wrap gap-1">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setEndTime(addMinutesToClock(startTime, d))}
              className={classNames(
                "rounded-md px-2 py-1 text-[0.75rem] font-medium transition-colors",
                minutes === d ? "bg-accent-500 text-white" : "bg-surface-2 text-text-secondary hover:text-text-primary",
              )}
            >
              {durationLabel(d)}
            </button>
          ))}
        </div>

        <div>
          <FieldLabel>Cor</FieldLabel>
          <ColorSwatches
            value={color}
            onChange={(c) => {
              setColor(c);
              setColorPicked(true);
            }}
          />
        </div>

        {!editing && days.length > 1 && (
          <p className="text-[0.75rem] text-text-muted">
            Cria {days.length} horários de {startTime} às {endTime}.
          </p>
        )}
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
      <PopoverActions
        onSave={save}
        saving={saving}
        onDelete={
          draft?.block
            ? async () => {
                await remove(draft.block!.id);
                onClose();
              }
            : undefined
        }
      />
    </Popover>
  );
}
