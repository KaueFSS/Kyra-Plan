import { useEffect, useState } from "react";
import { Popover, type PopoverAnchor } from "../ui/Popover";
import { DayToggles, FieldLabel, PopoverActions } from "../ui/FormControls";
import { useAlarmStore } from "../../stores/alarmStore";
import { ApiError } from "../../services/tauri";
import type { Alarm } from "../../types/alarm";

export interface AlarmEditTarget {
  anchor: PopoverAnchor;
  alarm: Alarm | null;
}

export function AlarmEditorPopover({ target, onClose }: { target: AlarmEditTarget | null; onClose: () => void }) {
  const { create, update, remove } = useAlarmStore();
  const [time, setTime] = useState("07:00");
  const [label, setLabel] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setTime(target.alarm?.time ?? "07:00");
    setLabel(target.alarm?.label ?? "");
    setDays(target.alarm?.days ?? [0, 1, 2, 3, 4]);
    setNotify(target.alarm?.notify ?? true);
    setError(null);
  }, [target]);

  const save = async () => {
    if (!time) return setError("Escolha um horário.");
    setSaving(true);
    try {
      if (target?.alarm) {
        const a = target.alarm;
        await update({ id: a.id, label, time, days, sound: a.sound, enabled: a.enabled, notify });
      } else {
        await create({ label, time, days, notify });
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover anchor={target?.anchor ?? null} onClose={onClose} title={target?.alarm ? "Editar alarme" : "Novo alarme"} width={280}>
      <div className="space-y-3" onKeyDown={(e) => e.key === "Enter" && save()}>
        <input
          type="time"
          autoFocus
          className="ff-input w-full py-2 text-center text-2xl font-semibold tabular-nums"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
        <input className="ff-input w-full" placeholder="Rótulo (ex.: Acordar)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <div>
          <FieldLabel>Repetir (nenhum = todo dia)</FieldLabel>
          <DayToggles value={days} onChange={setDays} />
        </div>
        <label className="flex items-center gap-2 text-xs text-text-secondary">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="accent-[var(--color-accent-500)]" />
          Notificação do Windows
        </label>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
      <PopoverActions
        onSave={save}
        saving={saving}
        onDelete={
          target?.alarm
            ? async () => {
                await remove(target.alarm!.id);
                onClose();
              }
            : undefined
        }
      />
    </Popover>
  );
}
