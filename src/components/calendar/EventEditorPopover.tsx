import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { Popover, type PopoverAnchor } from "../ui/Popover";
import { ColorSwatches, FieldLabel, PALETTE, PopoverActions } from "../ui/FormControls";
import { useCalendarStore } from "../../stores/calendarStore";
import { ApiError } from "../../services/tauri";
import type { EventOccurrence, RecurrenceRule } from "../../types/event";

export interface EventEditTarget {
  anchor: PopoverAnchor;
  occurrence: EventOccurrence | null;
  date: string;
}

const RECURRENCE_OPTIONS: { value: RecurrenceRule; label: string }[] = [
  { value: "none", label: "Não repete" },
  { value: "daily", label: "Todo dia" },
  { value: "weekly", label: "Toda semana" },
  { value: "monthly", label: "Todo mês" },
];

/** The one editor for events (create and edit), shared by the dashboard and the calendar page. */
export function EventEditorPopover({
  target,
  onClose,
  range,
}: {
  target: EventEditTarget | null;
  onClose: () => void;
  range: { start: string; end: string };
}) {
  const { createEvent, updateEvent, deleteEvent } = useCalendarStore();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [color, setColor] = useState(PALETTE[0]);
  const [recurrence, setRecurrence] = useState<RecurrenceRule>("none");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    const occ = target.occurrence;
    if (occ) {
      // Edits apply to the base event, so show the base event's own date.
      const start = DateTime.fromISO(occ.startAt);
      setTitle(occ.title);
      setDate(start.toISODate()!);
      setStartTime(start.toFormat("HH:mm"));
      setEndTime(DateTime.fromISO(occ.endAt).toFormat("HH:mm"));
      setColor(occ.color);
      setRecurrence(occ.recurrenceRule);
    } else {
      setTitle("");
      setDate(target.date);
      setStartTime("09:00");
      setEndTime("10:00");
      setColor(PALETTE[0]);
      setRecurrence("none");
    }
    setError(null);
  }, [target]);

  const save = async () => {
    if (!target) return;
    if (!title.trim()) return setError("Dê um título ao evento.");
    if (endTime <= startTime) return setError("O fim deve ser depois do início.");
    const startAt = DateTime.fromISO(`${date}T${startTime}`).toUTC().toISO()!;
    const endAt = DateTime.fromISO(`${date}T${endTime}`).toUTC().toISO()!;
    setSaving(true);
    try {
      if (target.occurrence) {
        await updateEvent(
          {
            id: target.occurrence.id,
            title: title.trim(),
            description: target.occurrence.description,
            startAt,
            endAt,
            color,
            recurrenceRule: recurrence,
            recurrenceUntil: target.occurrence.recurrenceUntil,
          },
          range.start,
          range.end,
        );
      } else {
        await createEvent({ title: title.trim(), startAt, endAt, color, recurrenceRule: recurrence }, range.start, range.end);
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover anchor={target?.anchor ?? null} onClose={onClose} title={target?.occurrence ? "Editar evento" : "Novo evento"}>
      <div className="space-y-3" onKeyDown={(e) => e.key === "Enter" && save()}>
        <input autoFocus className="ff-input w-full" placeholder="Ex.: Reunião do grupo" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className="block">
          <FieldLabel>Data</FieldLabel>
          <input type="date" className="ff-input w-full" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
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
        <label className="block">
          <FieldLabel>Repetição</FieldLabel>
          <select className="ff-input w-full" value={recurrence} onChange={(e) => setRecurrence(e.target.value as RecurrenceRule)}>
            {RECURRENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div>
          <FieldLabel>Cor</FieldLabel>
          <ColorSwatches value={color} onChange={setColor} />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
      <PopoverActions
        onSave={save}
        saving={saving}
        onDelete={
          target?.occurrence
            ? async () => {
                await deleteEvent(target.occurrence!.id, range.start, range.end);
                onClose();
              }
            : undefined
        }
      />
    </Popover>
  );
}
