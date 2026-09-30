import { useEffect, useState } from "react";
import { Popover, type PopoverAnchor } from "../ui/Popover";
import { DayToggles, FieldLabel, PopoverActions } from "../ui/FormControls";
import { taskToUpdateInput, useTaskStore } from "../../stores/taskStore";
import { ApiError } from "../../services/tauri";
import type { Priority, TaskWithProgress } from "../../types/task";
import { classNames } from "../../utils/format";

export interface TaskEditTarget {
  anchor: PopoverAnchor;
  task: TaskWithProgress;
}

const PRIORITIES: { value: Priority; label: string; dot: string }[] = [
  { value: "low", label: "Baixa", dot: "bg-info" },
  { value: "medium", label: "Média", dot: "bg-warning" },
  { value: "high", label: "Alta", dot: "bg-danger" },
];

/** Inline editor for daily and weekly tasks (title, time, priority, days). */
export function TaskEditorPopover({ target, onClose }: { target: TaskEditTarget | null; onClose: () => void }) {
  const { updateTask, deleteTask } = useTaskStore();
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [days, setDays] = useState<number[]>([]);
  const [durationMinutes, setDurationMinutes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const task = target?.task;
  const isWeekly = task?.taskType === "weekly";

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setTime(task.scheduledTime ?? "");
    setPriority(task.priority);
    setDays(task.recurrenceDays ?? []);
    setDurationMinutes(task.durationSeconds ? String(Math.round(task.durationSeconds / 60)) : "");
    setError(null);
  }, [task]);

  const save = async () => {
    if (!task) return;
    if (!title.trim()) return setError("O título é obrigatório.");
    if (isWeekly && days.length === 0) return setError("Escolha pelo menos um dia.");
    const minutes = durationMinutes.trim() ? Number(durationMinutes) : 0;
    if (!Number.isFinite(minutes) || minutes < 0 || minutes > 24 * 60) return setError("Duração inválida.");
    setSaving(true);
    try {
      await updateTask(
        taskToUpdateInput(task, {
          title: title.trim(),
          scheduledTime: time || null,
          priority,
          recurrenceDays: isWeekly ? days : task.recurrenceDays,
          durationSeconds: minutes > 0 ? Math.round(minutes) * 60 : null,
        }),
      );
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover anchor={target?.anchor ?? null} onClose={onClose} title={isWeekly ? "Tarefa semanal" : "Tarefa diária"}>
      <div className="space-y-3" onKeyDown={(e) => e.key === "Enter" && save()}>
        <input autoFocus className="ff-input w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <label>
            <FieldLabel>Horário</FieldLabel>
            <input type="time" className="ff-input w-full" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <div>
            <FieldLabel>Prioridade</FieldLabel>
            <div className="flex gap-1">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  title={p.label}
                  onClick={() => setPriority(p.value)}
                  className={classNames(
                    "flex h-[2.375rem] flex-1 items-center justify-center rounded-lg border transition-colors",
                    priority === p.value ? "border-accent-500 bg-accent-500/10" : "border-border-subtle bg-surface-2",
                  )}
                >
                  <span className={classNames("h-2.5 w-2.5 rounded-full", p.dot)} />
                </button>
              ))}
            </div>
          </div>
        </div>
        {isWeekly && (
          <div>
            <FieldLabel>Dias</FieldLabel>
            <DayToggles value={days} onChange={setDays} />
          </div>
        )}
        <label className="block">
          <FieldLabel>Duração com cronômetro (min)</FieldLabel>
          <input
            type="number"
            min={0}
            placeholder="Sem cronômetro"
            className="ff-input w-full"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
          />
          <span className="mt-1 block text-[0.75rem] text-text-muted">Com duração, a tarefa só conclui quando o tempo acabar.</span>
        </label>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
      <PopoverActions
        onSave={save}
        saving={saving}
        onDelete={
          task
            ? async () => {
                await deleteTask(task.id);
                onClose();
              }
            : undefined
        }
      />
    </Popover>
  );
}
