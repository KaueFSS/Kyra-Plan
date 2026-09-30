import { Check, Pause, Play, RotateCcw, Timer, X } from "../ui/icons";
import { useTaskStore } from "../../stores/taskStore";
import { useLiveTick } from "../../hooks/useLiveTick";
import { liveElapsedSeconds } from "../../utils/liveTime";
import { classNames, formatDuration } from "../../utils/format";
import type { TaskWithProgress } from "../../types/task";

/** Remaining seconds of a task's countdown right now (full duration if not started). */
export function taskRemaining(task: TaskWithProgress, nowMs: number): { remaining: number; progress: number } {
  const duration = task.durationSeconds ?? 0;
  const s = task.activeSession;
  const elapsed = s ? liveElapsedSeconds(s.status, s.startedAt, s.elapsedSeconds, nowMs) : 0;
  return { remaining: Math.max(0, duration - elapsed), progress: duration > 0 ? Math.min(1, elapsed / duration) : 0 };
}

/**
 * Replaces the checkbox on tasks that have a duration: ▶ starts the
 * countdown, ⏸ pauses, and the task only turns done when the backend
 * confirms the time really ran out (see task_service::check_and_complete).
 */
export function TaskTimerControl({ task, compact = false }: { task: TaskWithProgress; compact?: boolean }) {
  const { startTimedTask, pauseTimedTask, resumeTimedTask, toggleCompletion } = useTaskStore();
  const session = task.activeSession;
  const running = session?.status === "running";
  const now = useLiveTick(running ? 1000 : 60_000);
  const done = task.completion?.completed ?? false;
  const { progress } = taskRemaining(task, now);

  if (done) {
    return (
      <button
        onClick={() => toggleCompletion(task.id)}
        title="Concluída (tempo cumprido) — clique para desfazer"
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-success bg-success text-white"
      >
        <Check size={10} strokeWidth={3.5} />
      </button>
    );
  }

  const main = () => {
    if (!session) return startTimedTask(task.id);
    return running ? pauseTimedTask(session.id) : resumeTimedTask(session.id);
  };

  // Ring whose fill shows how much of the time has passed.
  const size = 18;
  const r = 7;
  const c = 2 * Math.PI * r;

  return (
    <div className="group/timer flex shrink-0 items-center gap-1">
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={main}
        title={!session ? "Iniciar cronômetro" : running ? "Pausar" : "Continuar"}
        className={classNames(
          "relative flex items-center justify-center rounded-full transition-colors",
          running ? "text-accent-400" : "text-text-secondary hover:text-accent-400",
        )}
        style={{ width: `${size / 16}rem`, height: `${size / 16}rem` }}
      >
        <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={2} className="stroke-border-strong" />
          {session && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={2}
              stroke="var(--color-accent-500)"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - progress)}
              strokeLinecap="round"
            />
          )}
        </svg>
        {running ? <Pause size={8} strokeWidth={3} /> : <Play size={8} strokeWidth={3} className="ml-px" />}
      </button>

      {!compact && <TaskTimerReadout task={task} />}
    </div>
  );
}

/** Remaining time plus restart/cancel (on hover) for a task with a duration. */
export function TaskTimerReadout({ task }: { task: TaskWithProgress }) {
  const { restartTimedTask, cancelTimedTask } = useTaskStore();
  const session = task.activeSession;
  const running = session?.status === "running";
  const now = useLiveTick(running ? 1000 : 60_000);
  if (task.completion?.completed) return null;
  const { remaining } = taskRemaining(task, now);

  return (
    <span className="group/readout flex shrink-0 items-center gap-0.5">
      {session && (
        <span className="hidden items-center gap-0.5 group-hover/readout:flex">
          <button onClick={() => restartTimedTask(session.id)} title="Recomeçar do zero" className="rounded p-0.5 text-text-muted hover:text-text-primary">
            <RotateCcw size={11} />
          </button>
          <button onClick={() => cancelTimedTask(session.id)} title="Cancelar" className="rounded p-0.5 text-text-muted hover:text-danger">
            <X size={11} />
          </button>
        </span>
      )}
      <span
        className={classNames(
          "rounded px-1 text-[0.75rem] tabular-nums",
          running ? "bg-accent-500/15 font-semibold text-accent-400" : session ? "bg-warning/15 text-warning" : "text-text-muted",
        )}
        title={session ? (running ? "Em andamento" : "Pausada") : "Duração"}
      >
        <Timer size={11} className="mr-0.5 -mt-0.5 inline" />
        {formatDuration(remaining, remaining >= 3600)}
      </span>
    </span>
  );
}
