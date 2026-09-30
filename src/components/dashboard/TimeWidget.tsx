import { useState } from "react";
import { ClockWidget } from "./ClockWidget";
import { AlarmsWidget } from "./AlarmsWidget";
import { classNames } from "../../utils/format";
import type { WorldClock } from "../../types/worldClock";
import type { Alarm } from "../../types/alarm";

type Tab = "clocks" | "alarms";

/**
 * World clock and alarms in one card with tabs, like a phone's Clock app —
 * which also frees width on the dashboard for the weekly tasks board.
 */
export function TimeWidget({ clocks, alarms }: { clocks: WorldClock[]; alarms: Alarm[] }) {
  const [tab, setTab] = useState<Tab>("clocks");
  const activeAlarms = alarms.filter((a) => a.enabled).length;

  const tabs = (
    <div className="flex rounded-lg border border-border-subtle bg-surface-2 p-0.5">
      {(["clocks", "alarms"] as const).map((t) => (
        <button
          key={t}
          onClick={() => setTab(t)}
          className={classNames(
            "flex items-center gap-1 rounded-md px-2 py-0.5 text-[0.75rem] font-medium transition-colors",
            tab === t ? "bg-accent-500 text-white" : "text-text-muted hover:text-text-primary",
          )}
        >
          {t === "clocks" ? "Mundo" : "Alarmes"}
          {t === "alarms" && activeAlarms > 0 && (
            <span className={classNames("rounded px-1 text-[0.6875rem] tabular-nums", tab === t ? "bg-white/20" : "bg-surface-3")}>{activeAlarms}</span>
          )}
        </button>
      ))}
    </div>
  );

  return tab === "clocks" ? <ClockWidget clocks={clocks} tabs={tabs} /> : <AlarmsWidget alarms={alarms} tabs={tabs} />;
}
