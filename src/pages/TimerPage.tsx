import { useState } from "react";
import { TimerPanel } from "../components/timer/TimerPanel";
import { StopwatchPanel } from "../components/timer/StopwatchPanel";
import { TimedTasksPanel } from "../components/timer/TimedTasksPanel";
import { classNames } from "../utils/format";

type Tab = "timer" | "stopwatch" | "timed-tasks";

const TABS: { key: Tab; label: string }[] = [
  { key: "timer", label: "Timer" },
  { key: "stopwatch", label: "Cronômetro" },
  { key: "timed-tasks", label: "Tarefas com Duração" },
];

export function TimerPage() {
  const [tab, setTab] = useState<Tab>("timer");

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6 flex gap-1 rounded-lg bg-surface-1 p-1 w-fit border border-border-subtle">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={classNames(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t.key ? "bg-accent-500 text-white" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "timer" && <TimerPanel />}
      {tab === "stopwatch" && <StopwatchPanel />}
      {tab === "timed-tasks" && <TimedTasksPanel />}
    </div>
  );
}
