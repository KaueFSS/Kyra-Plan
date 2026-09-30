import { useEffect, useState } from "react";
import { Flag, Hourglass, Pause, Play, RotateCcw, Square, Timer as TimerIcon } from "../ui/icons";
import { useTimerStore } from "../../stores/timerStore";
import { useStopwatchStore } from "../../stores/stopwatchStore";
import { useUiStore } from "../../stores/uiStore";
import { useLiveTick } from "../../hooks/useLiveTick";
import { liveElapsedSeconds } from "../../utils/liveTime";
import { classNames, formatDuration, formatStopwatch } from "../../utils/format";
import { WidgetCard } from "../ui/WidgetCard";
import { CircularProgress } from "../timer/CircularProgress";
import { useTaskStore } from "../../stores/taskStore";
import { taskRemaining } from "../tasks/TaskTimerControl";
import type { TaskWithProgress } from "../../types/task";

type Tab = "task" | "timer" | "stopwatch";

const PRESETS = [5, 15, 25, 60];

const TAB_LABELS: Record<Tab, string> = { task: "Tarefa", timer: "Timer", stopwatch: "Cronôm." };

/** The task whose countdown is running (or paused) right now, if any. */
function useActiveTimedTask(): TaskWithProgress | null {
  return useTaskStore((s) => {
    const all = [...s.daily, ...s.weekly, ...s.single, ...s.timed];
    return all.find((t) => t.activeSession?.status === "running") ?? all.find((t) => t.activeSession?.status === "paused") ?? null;
  });
}

/**
 * The "what am I focusing on" card: the running task countdown (when a
 * task with a duration is started anywhere in the app it shows up here),
 * a free timer, and the stopwatch.
 */
export function FocusWidget() {
  const [tab, setTab] = useState<Tab>("timer");
  const { setPage } = useUiStore();
  const timerRunning = useTimerStore((s) => s.snapshot?.status === "running");
  const stopwatchRunning = useStopwatchStore((s) => s.snapshot?.status === "running");
  const activeTask = useActiveTimedTask();
  const activeTaskId = activeTask?.id ?? null;

  // Starting a task timer anywhere jumps this card to it; when it ends,
  // fall back to the free timer.
  useEffect(() => {
    if (activeTaskId) setTab("task");
    else setTab((current) => (current === "task" ? "timer" : current));
  }, [activeTaskId]);

  const tabs: Tab[] = activeTask ? ["task", "timer", "stopwatch"] : ["timer", "stopwatch"];
  const running: Record<Tab, boolean> = {
    task: activeTask?.activeSession?.status === "running",
    timer: timerRunning,
    stopwatch: stopwatchRunning,
  };

  return (
    <WidgetCard
      icon={tab === "stopwatch" ? Hourglass : TimerIcon}
      title="Foco"
      onTitleClick={() => setPage("timer")}
      actions={
        <div className="flex rounded-lg border border-border-subtle bg-surface-2 p-0.5">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={classNames(
                "relative rounded-md px-2 py-0.5 text-[0.75rem] font-medium transition-colors",
                tab === t ? "bg-accent-500 text-white" : "text-text-muted hover:text-text-primary",
              )}
            >
              {TAB_LABELS[t]}
              {tab !== t && running[t] && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-success" />}
            </button>
          ))}
        </div>
      }
    >
      {tab === "task" && activeTask ? <TaskView task={activeTask} /> : tab === "stopwatch" ? <StopwatchView /> : <TimerView />}
    </WidgetCard>
  );
}

function TaskView({ task }: { task: TaskWithProgress }) {
  const { pauseTimedTask, resumeTimedTask, restartTimedTask, cancelTimedTask } = useTaskStore();
  const session = task.activeSession!;
  const running = session.status === "running";
  const now = useLiveTick(running ? 250 : 60_000);
  const { remaining, progress } = taskRemaining(task, now);

  return (
    <div className="flex min-h-0 flex-1 flex-wrap content-center items-center justify-center gap-3 overflow-y-auto">
      <CircularProgress progress={progress} size={108} strokeWidth={6}>
        <div className="text-center">
          <p className={classNames("font-bold leading-none tabular-nums text-text-primary", remaining >= 3600 ? "text-lg" : "text-2xl")}>
            {formatDuration(remaining, remaining >= 3600)}
          </p>
          <p className="mt-1 text-[0.6875rem] uppercase tracking-wide text-text-muted">{running ? "Focando" : "Pausado"}</p>
        </div>
      </CircularProgress>

      <div className="flex min-w-[9.5rem] flex-1 flex-col gap-2">
        <div>
          <p className="line-clamp-2 text-sm font-semibold leading-tight text-text-primary">{task.title}</p>
          <p className="text-[0.75rem] text-text-muted">Conclui sozinha quando o tempo acabar</p>
        </div>
        <div className="flex items-center gap-2">
          {running ? (
            <RoundButton label="Pausar" onClick={() => pauseTimedTask(session.id)}>
              <Pause size={15} />
            </RoundButton>
          ) : (
            <RoundButton label="Continuar" onClick={() => resumeTimedTask(session.id)}>
              <Play size={15} />
            </RoundButton>
          )}
          <RoundButton label="Recomeçar do zero" tone="ghost" onClick={() => restartTimedTask(session.id)}>
            <RotateCcw size={14} />
          </RoundButton>
          <RoundButton label="Cancelar" tone="ghost" onClick={() => cancelTimedTask(session.id)}>
            <Square size={13} />
          </RoundButton>
        </div>
      </div>
    </div>
  );
}

function RoundButton({ onClick, children, tone = "accent", label }: { onClick: () => void; children: React.ReactNode; tone?: "accent" | "success" | "ghost"; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={classNames(
        "flex h-9 w-9 items-center justify-center rounded-full transition",
        tone === "accent" && "bg-accent-500 text-white hover:bg-accent-600",
        tone === "success" && "bg-success text-white hover:brightness-110",
        tone === "ghost" && "border border-border-subtle bg-surface-2 text-text-secondary hover:text-text-primary",
      )}
    >
      {children}
    </button>
  );
}

function TimerView() {
  const { snapshot, load, start, pause, resume, restart, cancel, check } = useTimerStore();
  const [minutes, setMinutes] = useState(25);
  const now = useLiveTick(250);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (snapshot?.status !== "running") return;
    const id = setInterval(() => check(), 1000);
    return () => clearInterval(id);
  }, [snapshot?.status, check]);

  const duration = snapshot?.durationSeconds ?? minutes * 60;
  const elapsed = snapshot ? liveElapsedSeconds(snapshot.status, snapshot.startedAt, snapshot.elapsedSeconds, now) : 0;
  const remaining = Math.max(0, duration - elapsed);
  const finished = snapshot?.status === "completed";

  return (
    <div className="flex min-h-0 flex-1 flex-wrap content-center items-center justify-center gap-3 overflow-y-auto">
      <CircularProgress progress={snapshot ? elapsed / duration : 0} size={108} strokeWidth={6}>
        <div className="text-center">
          <p
            className={classNames(
              "font-bold leading-none tabular-nums",
              duration >= 3600 ? "text-lg" : "text-2xl",
              finished ? "text-success" : "text-text-primary",
            )}
          >
            {formatDuration(remaining, duration >= 3600)}
          </p>
          <p className="mt-1 text-[0.6875rem] uppercase tracking-wide text-text-muted">
            {finished ? "Concluído" : snapshot?.status === "paused" ? "Pausado" : snapshot ? "Focando" : "Pronto"}
          </p>
        </div>
      </CircularProgress>

      <div className="flex min-w-[9.5rem] flex-1 flex-col gap-2">
        {!snapshot || finished ? (
          <>
            <div className="grid grid-cols-4 gap-1">
              {PRESETS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMinutes(m)}
                  className={classNames(
                    "rounded-md py-1 text-[0.75rem] font-medium transition-colors",
                    minutes === m ? "bg-accent-500/15 text-accent-400" : "bg-surface-2 text-text-muted hover:text-text-primary",
                  )}
                >
                  {m < 60 ? `${m}m` : "1h"}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={minutes}
                onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))}
                className="ff-input w-16 px-2 py-1 text-center text-xs"
                aria-label="Minutos"
              />
              <span className="text-xs text-text-muted">min</span>
              <div className="ml-auto">
                <RoundButton label="Iniciar" onClick={() => start(minutes * 60)}>
                  <Play size={15} />
                </RoundButton>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            {snapshot.status === "running" ? (
              <RoundButton label="Pausar" onClick={pause}>
                <Pause size={15} />
              </RoundButton>
            ) : (
              <RoundButton label="Continuar" onClick={resume}>
                <Play size={15} />
              </RoundButton>
            )}
            <RoundButton label="Reiniciar" tone="ghost" onClick={restart}>
              <RotateCcw size={14} />
            </RoundButton>
            <RoundButton label="Cancelar" tone="ghost" onClick={cancel}>
              <Square size={13} />
            </RoundButton>
          </div>
        )}
      </div>
    </div>
  );
}

function StopwatchView() {
  const { snapshot, load, start, pause, resume, cancel, lap } = useStopwatchStore();
  const now = useLiveTick(50);

  useEffect(() => {
    load();
  }, [load]);

  const elapsed = snapshot ? liveElapsedSeconds(snapshot.status, snapshot.startedAt, snapshot.elapsedSeconds, now) : 0;
  const laps = snapshot?.laps ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <p className="text-2xl font-semibold tabular-nums text-text-primary">{formatStopwatch(elapsed * 1000)}</p>
        <div className="flex items-center gap-1.5">
          {!snapshot && (
            <RoundButton label="Iniciar" tone="success" onClick={start}>
              <Play size={15} />
            </RoundButton>
          )}
          {snapshot?.status === "running" && (
            <>
              <RoundButton label="Volta" tone="ghost" onClick={lap}>
                <Flag size={14} />
              </RoundButton>
              <RoundButton label="Pausar" onClick={pause}>
                <Pause size={15} />
              </RoundButton>
            </>
          )}
          {snapshot?.status === "paused" && (
            <RoundButton label="Continuar" tone="success" onClick={resume}>
              <Play size={15} />
            </RoundButton>
          )}
          {/* Zerar stops and clears; the stopwatch only runs again on Iniciar. */}
          {snapshot && (
            <RoundButton label="Zerar" tone="ghost" onClick={cancel}>
              <RotateCcw size={14} />
            </RoundButton>
          )}
        </div>
      </div>

      <div className="mt-2 max-h-24 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
        {laps
          .map((ms, i) => ({ ms, n: i + 1 }))
          .reverse()
          .map(({ ms, n }) => (
            <div key={n} className="flex justify-between rounded-md bg-surface-2 px-2 py-1 text-[0.75rem]">
              <span className="text-text-muted">Volta {n}</span>
              <span className="tabular-nums text-text-primary">{formatStopwatch(ms)}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
