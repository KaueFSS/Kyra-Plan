import { useEffect, useState } from "react";
import { RotateCcw } from "../ui/icons";
import { useSettingsStore, settingsToUpdateInput } from "../../stores/settingsStore";
import { useTaskStore } from "../../stores/taskStore";
import { Popover, anchorBelow, type PopoverAnchor } from "../ui/Popover";
import { FieldLabel, PopoverActions } from "../ui/FormControls";
import { ApiError } from "../../services/tauri";

const TIMEZONES: [string, string][] = [
  ["São Paulo", "America/Sao_Paulo"],
  ["Manaus", "America/Manaus"],
  ["Lisboa", "Europe/Lisbon"],
  ["Londres", "Europe/London"],
  ["Nova York", "America/New_York"],
  ["Los Angeles", "America/Los_Angeles"],
  ["Tóquio", "Asia/Tokyo"],
  ["UTC", "UTC"],
];

function cityOf(zone: string): string {
  return TIMEZONES.find(([, z]) => z === zone)?.[0] ?? zone.split("/").pop()?.replace(/_/g, " ") ?? zone;
}

/**
 * "Reinicia às 04:00 (São Paulo)" — click to change when the daily cycle
 * starts, right where the daily tasks are, instead of hunting in Settings.
 */
export function ResetTimeButton() {
  const { settings, update } = useSettingsStore();
  const loadAll = useTaskStore((s) => s.loadAll);
  const [anchor, setAnchor] = useState<PopoverAnchor | null>(null);
  const [time, setTime] = useState("00:00");
  const [zone, setZone] = useState("UTC");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!anchor || !settings) return;
    setTime(settings.dailyResetTime);
    setZone(settings.dailyResetTimezone);
    setError(null);
  }, [anchor, settings]);

  if (!settings) return null;

  const save = async () => {
    try {
      await update({ ...settingsToUpdateInput(settings), dailyResetTime: time, dailyResetTimezone: zone });
      await loadAll();
      setAnchor(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    }
  };

  return (
    <>
      <button
        onClick={(e) => setAnchor(anchorBelow(e.currentTarget))}
        className="inline-flex items-center gap-1 rounded hover:text-accent-400"
        title="Mudar quando as tarefas diárias reiniciam"
      >
        <RotateCcw size={10} /> Reinicia às {settings.dailyResetTime} ({cityOf(settings.dailyResetTimezone)})
      </button>

      <Popover anchor={anchor} onClose={() => setAnchor(null)} title="Reinício das diárias" width={260}>
        <div className="space-y-3" onKeyDown={(e) => e.key === "Enter" && save()}>
          <label className="block">
            <FieldLabel>Horário (00:00 = meia-noite)</FieldLabel>
            <input type="time" className="ff-input w-full" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <label className="block">
            <FieldLabel>Fuso horário</FieldLabel>
            <select className="ff-input w-full" value={zone} onChange={(e) => setZone(e.target.value)}>
              {!TIMEZONES.some(([, z]) => z === zone) && <option value={zone}>{zone}</option>}
              {TIMEZONES.map(([city, z]) => (
                <option key={z} value={z}>
                  {city}
                </option>
              ))}
            </select>
          </label>
          <p className="text-[0.75rem] text-text-muted">
            Antes desse horário, as tarefas ainda contam para o dia anterior — útil se você dorme tarde.
          </p>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
        <PopoverActions onSave={save} />
      </Popover>
    </>
  );
}
