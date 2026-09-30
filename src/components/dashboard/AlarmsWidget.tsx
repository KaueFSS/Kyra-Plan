import { useState, type ReactNode } from "react";
import { DateTime } from "luxon";
import { useLiveTick } from "../../hooks/useLiveTick";
import { AlarmDays } from "../alarms/AlarmDays";
import { minutesUntilAlarm, relativeLabel } from "../../utils/timeHints";
import { AlarmClock, Plus } from "../ui/icons";
import { useAlarmStore } from "../../stores/alarmStore";
import { useUiStore } from "../../stores/uiStore";
import { WidgetCard, IconAction } from "../ui/WidgetCard";
import { anchorBelow } from "../ui/Popover";
import { AlarmEditorPopover, type AlarmEditTarget } from "../alarms/AlarmEditorPopover";
import { InlineAdd } from "../ui/InlineAdd";
import { Switch } from "../ui/Switch";
import { createAlarm } from "../../stores/smartActions";
import { alarmDaysLabel, classNames } from "../../utils/format";
import type { Alarm } from "../../types/alarm";

export function AlarmsWidget({ alarms, tabs }: { alarms: Alarm[]; tabs?: ReactNode }) {
  const { setEnabled } = useAlarmStore();
  const { setPage } = useUiStore();
  const [editing, setEditing] = useState<AlarmEditTarget | null>(null);
  const now = DateTime.fromMillis(useLiveTick(30_000));
  const until = new Map(alarms.map((a) => [a.id, a.enabled ? minutesUntilAlarm(a.time, a.days, now) : null]));
  const nextId = [...until.entries()].filter(([, m]) => m !== null).sort((a, b) => a[1]! - b[1]!)[0]?.[0];
  const nextAlarm = alarms.find((a) => a.id === nextId);

  return (
    <WidgetCard
      icon={AlarmClock}
      title="Alarmes"
      subtitle={
        nextAlarm ? (
          <span>
            Próximo às <span className="font-medium text-text-secondary">{nextAlarm.time}</span> · {relativeLabel(until.get(nextAlarm.id)!)}
          </span>
        ) : alarms.length > 0 ? (
          "Nenhum alarme ativo"
        ) : undefined
      }
      onTitleClick={() => setPage("alarms")}
      actions={
        <>
          {tabs}
          <IconAction icon={Plus} label="Novo alarme" onClick={(e) => setEditing({ alarm: null, anchor: anchorBelow(e.currentTarget) })} />
        </>
      }
    >
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden">
        {alarms.length === 0 && <p className="px-1 text-[0.75rem] text-text-muted">Nenhum alarme ainda. Escreva abaixo, ex.: “06:30 seg a sex Acordar”.</p>}
        {alarms.map((alarm) => (
          <div
            key={alarm.id}
            className={classNames(
              "flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-surface-2",
              alarm.id === nextId && "bg-accent-500/[0.07] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-accent-500)_35%,transparent)]",
            )}
          >
            <button
              className={classNames("min-w-0 flex-1 text-left", !alarm.enabled && "opacity-45")}
              onClick={(e) => setEditing({ alarm, anchor: { x: e.clientX + 8, y: e.clientY + 8 } })}
            >
              <p className="flex items-baseline gap-2">
                <span className={classNames("text-lg font-semibold leading-none tabular-nums", alarm.id === nextId ? "text-accent-400" : "text-text-primary")}>
                  {alarm.time}
                </span>
                {until.get(alarm.id) != null && (
                  <span className="truncate text-[0.6875rem] font-medium tabular-nums text-text-secondary">toca {relativeLabel(until.get(alarm.id)!)}</span>
                )}
              </p>
              <span className="mt-1 flex min-w-0 items-center gap-1.5">
                <AlarmDays days={alarm.days} enabled={alarm.enabled} today={now.weekday - 1} />
                {alarm.label && <span className="truncate text-[0.75rem] text-text-muted">{alarm.label}</span>}
              </span>
            </button>
            <Switch size="sm" checked={alarm.enabled} onChange={(on) => setEnabled(alarm.id, on)} label={alarm.enabled ? "Desativar alarme" : "Ativar alarme"} />
          </div>
        ))}
      </div>
      <div className="mt-2 shrink-0">
        <InlineAdd
          label="Novo alarme"
          placeholder="Ex.: 06:30 seg a sex Acordar"
          requireTitle={false}
          describe={(p) => [p.startTime ?? "sem horário", alarmDaysLabel(p.days)]}
          onSubmit={createAlarm}
        />
      </div>
      <AlarmEditorPopover target={editing} onClose={() => setEditing(null)} />
    </WidgetCard>
  );
}
