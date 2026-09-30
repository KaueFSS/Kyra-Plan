import { useEffect, useState } from "react";
import { AlarmClock, Plus } from "../components/ui/icons";
import { useAlarmStore } from "../stores/alarmStore";
import { EmptyState } from "../components/ui/EmptyState";
import { Switch } from "../components/ui/Switch";
import { anchorBelow } from "../components/ui/Popover";
import { AlarmEditorPopover, type AlarmEditTarget } from "../components/alarms/AlarmEditorPopover";
import { alarmDaysLabel, classNames } from "../utils/format";
import { DateTime } from "luxon";
import { useLiveTick } from "../hooks/useLiveTick";
import { AlarmDays } from "../components/alarms/AlarmDays";
import { minutesUntilAlarm, relativeLabel } from "../utils/timeHints";

export function AlarmsPage() {
  const { alarms, load, setEnabled } = useAlarmStore();
  const [editing, setEditing] = useState<AlarmEditTarget | null>(null);
  const now = DateTime.fromMillis(useLiveTick(30_000));

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-text-muted">Clique num alarme para editar · use o interruptor para ativar/desativar.</p>
        <button className="ff-btn-primary px-3 py-1.5 text-xs" onClick={(e) => setEditing({ alarm: null, anchor: anchorBelow(e.currentTarget) })}>
          <Plus size={14} /> Novo alarme
        </button>
      </div>

      {alarms.length === 0 && <EmptyState icon={AlarmClock} title="Nenhum alarme configurado" />}

      <div className="space-y-2">
        {alarms.map((alarm) => (
          <div key={alarm.id} className="ff-card flex items-center gap-4 px-4 py-3">
            <button
              className={classNames("min-w-0 flex-1 text-left", !alarm.enabled && "opacity-45")}
              onClick={(e) => setEditing({ alarm, anchor: { x: e.clientX + 8, y: e.clientY + 8 } })}
            >
              <p className="flex items-baseline gap-3">
                <span className="text-3xl font-semibold tabular-nums text-text-primary">{alarm.time}</span>
                {alarm.enabled && (
                  <span className="text-sm font-medium text-accent-400">toca {relativeLabel(minutesUntilAlarm(alarm.time, alarm.days, now) ?? 0)}</span>
                )}
              </p>
              <span className="mt-1 flex items-center gap-2">
                <AlarmDays days={alarm.days} enabled={alarm.enabled} today={now.weekday - 1} />
                <span className="truncate text-xs text-text-muted">
                  {alarm.label ? `${alarm.label} · ` : ""}
                  {alarmDaysLabel(alarm.days)}
                </span>
              </span>
            </button>
            <Switch checked={alarm.enabled} onChange={(on) => setEnabled(alarm.id, on)} label={alarm.enabled ? "Desativar alarme" : "Ativar alarme"} />
          </div>
        ))}
      </div>

      <AlarmEditorPopover target={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
