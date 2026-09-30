import { useEffect, useState } from "react";
import { Popover, type PopoverAnchor } from "../ui/Popover";
import { ColorSwatches, DayToggles, FieldLabel, PALETTE, PopoverActions } from "../ui/FormControls";
import { useScheduleStore } from "../../stores/scheduleStore";
import { ApiError } from "../../services/tauri";
import type { WeeklyScheduleBlock } from "../../types/schedule";

export interface BlockDraft {
  anchor: PopoverAnchor;
  block: WeeklyScheduleBlock | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

/** The one editor for schedule blocks, used for both "click an empty slot
 * to create" and "click a block to edit". */
export function BlockEditorPopover({ draft, onClose }: { draft: BlockDraft | null; onClose: () => void }) {
  const { create, update, remove } = useScheduleStore();
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(0);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [color, setColor] = useState(PALETTE[0]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!draft) return;
    setTitle(draft.block?.title ?? "");
    setDay(draft.dayOfWeek);
    setStartTime(draft.startTime);
    setEndTime(draft.endTime);
    setColor(draft.block?.color ?? PALETTE[0]);
    setError(null);
  }, [draft]);

  const save = async () => {
    if (!title.trim()) return setError("Dê um título ao bloco.");
    if (endTime <= startTime) return setError("O fim deve ser depois do início.");
    setSaving(true);
    try {
      const payload = { dayOfWeek: day, startTime, endTime, title: title.trim(), color };
      if (draft?.block) {
        await update({ id: draft.block.id, description: draft.block.description, ...payload });
      } else {
        await create({ description: "", ...payload });
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover anchor={draft?.anchor ?? null} onClose={onClose} title={draft?.block ? "Editar bloco" : "Novo bloco"}>
      <div className="space-y-3" onKeyDown={(e) => e.key === "Enter" && save()}>
        <input
          autoFocus
          className="ff-input w-full"
          placeholder="Ex.: Aula de cálculo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div>
          <FieldLabel>Dia</FieldLabel>
          <DayToggles single value={[day]} onChange={(days) => setDay(days[0])} />
        </div>
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
