import { useEffect, useState } from "react";
import { Play, Pause, RotateCcw, Square, Plus, Trash2, Timer as TimerIcon } from "../ui/icons";
import { useTaskStore } from "../../stores/taskStore";
import { TaskFormModal } from "../tasks/TaskFormModal";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { EmptyState } from "../ui/EmptyState";
import { useLiveTick } from "../../hooks/useLiveTick";
import { liveElapsedSeconds } from "../../utils/liveTime";
import { formatDuration, classNames } from "../../utils/format";
import type { TaskWithProgress } from "../../types/task";

function TimedTaskRow({ task }: { task: TaskWithProgress }) {
  const { startTimedTask, pauseTimedTask, resumeTimedTask, restartTimedTask, cancelTimedTask, deleteTask } = useTaskStore();
  const [deleting, setDeleting] = useState(false);
  const now = useLiveTick(500);

  const session = task.activeSession;
  const duration = task.durationSeconds ?? 0;
  const elapsed = session ? liveElapsedSeconds(session.status, session.startedAt, session.elapsedSeconds, now) : 0;
  const remaining = Math.max(0, duration - elapsed);
  const progressPct = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0;
  const isCompletedToday = task.completion?.completed ?? false;

  return (
    <div className="ff-card px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-text-primary truncate">{task.title}</p>
          <p className="text-xs text-text-muted">Duração: {formatDuration(duration, true)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isCompletedToday && !session && <span className="text-xs text-success">Concluída</span>}

          {!session && !isCompletedToday && (
            <button className="ff-btn-primary text-xs" onClick={() => startTimedTask(task.id)}>
              <Play size={14} /> Iniciar
            </button>
          )}
          {session?.status === "running" && (
            <button className="ff-btn-secondary text-xs" onClick={() => pauseTimedTask(session.id)}>
              <Pause size={14} /> Pausar
            </button>
          )}
          {session?.status === "paused" && (
            <button className="ff-btn-primary text-xs" onClick={() => resumeTimedTask(session.id)}>
              <Play size={14} /> Continuar
            </button>
          )}
          {session && (
            <>
              <button className="ff-btn-secondary text-xs" onClick={() => restartTimedTask(session.id)}>
                <RotateCcw size={14} />
              </button>
              <button className="ff-btn-danger text-xs" onClick={() => cancelTimedTask(session.id)}>
                <Square size={14} />
              </button>
            </>
          )}
          <button className="ff-btn-ghost p-1.5 rounded-md text-danger" onClick={() => setDeleting(true)}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {session && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className={classNames("h-full rounded-full bg-accent-500 transition-[width]", session.status === "completed" && "bg-success")}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-1.5 text-right text-xs tabular-nums text-text-muted">
            {session.status === "completed" ? "Concluída!" : formatDuration(remaining, true) + " restante"}
          </p>
        </div>
      )}

      <ConfirmDialog
        open={deleting}
        title="Excluir tarefa"
        message="Deseja excluir esta tarefa com duração?"
        confirmLabel="Excluir"
        onCancel={() => setDeleting(false)}
        onConfirm={async () => {
          await deleteTask(task.id);
          setDeleting(false);
        }}
      />
    </div>
  );
}

export function TimedTasksPanel() {
  const { daily, weekly, single, timed, loadAll, createTask } = useTaskStore();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Every task with a countdown that's relevant today, whatever its type:
  // daily ones, weekly ones scheduled for today, and one-off timed tasks.
  const today = (new Date().getDay() + 6) % 7;
  const withDuration = [
    ...daily,
    ...weekly.filter((t) => (t.recurrenceDays ?? []).includes(today)),
    ...single,
    ...timed,
  ].filter((t) => (t.durationSeconds ?? 0) > 0);

  return (
    <div className="py-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-text-secondary">
          Tarefas de hoje com cronômetro — só são concluídas quando o tempo termina de verdade. Dica: nas diárias e semanais, escreva “por 1h” ao criar.
        </p>
        <button className="ff-btn-primary shrink-0 text-sm" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Nova tarefa com duração
        </button>
      </div>

      {withDuration.length === 0 ? (
        <EmptyState icon={TimerIcon} title="Nenhuma tarefa com duração" description="Ex.: “Estudar Python por 1h” numa tarefa diária." />
      ) : (
        <div className="space-y-2">
          {withDuration.map((task) => (
            <TimedTaskRow key={task.id} task={task} />
          ))}
        </div>
      )}

      <TaskFormModal open={modalOpen} onClose={() => setModalOpen(false)} taskType="timed" onSubmit={createTask} />
    </div>
  );
}
