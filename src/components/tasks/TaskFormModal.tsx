import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import type { CreateTaskInput, Priority, TaskType, TaskWithProgress } from "../../types/task";
import { WEEKDAY_LABELS_SHORT, todayIsoDate } from "../../utils/format";
import { classNames } from "../../utils/format";

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateTaskInput) => Promise<void>;
  taskType: TaskType;
  initialTask?: TaskWithProgress | null;
}

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
];

export function TaskFormModal({ open, onClose, onSubmit, taskType, initialTask }: TaskFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [scheduledTime, setScheduledTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
  const [startDate, setStartDate] = useState(todayIsoDate());
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description);
      setPriority(initialTask.priority);
      setScheduledTime(initialTask.scheduledTime ?? "");
      setDurationMinutes(initialTask.durationSeconds ? Math.round(initialTask.durationSeconds / 60) : 30);
      setRecurrenceDays(initialTask.recurrenceDays ?? []);
      setStartDate(initialTask.startDate);
      setEndDate(initialTask.endDate ?? "");
    } else {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setScheduledTime("");
      setDurationMinutes(30);
      setRecurrenceDays([]);
      setStartDate(todayIsoDate());
      setEndDate("");
    }
    setError(null);
  }, [open, initialTask]);

  const toggleDay = (day: number) => {
    setRecurrenceDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim()) {
      setError("O título é obrigatório.");
      return;
    }
    if (taskType === "weekly" && recurrenceDays.length === 0) {
      setError("Selecione pelo menos um dia da semana.");
      return;
    }
    if (taskType === "timed" && durationMinutes <= 0) {
      setError("Defina uma duração maior que zero.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description,
        taskType,
        priority,
        scheduledTime: scheduledTime || null,
        durationSeconds: taskType === "timed" ? durationMinutes * 60 : null,
        recurrenceDays: taskType === "weekly" ? recurrenceDays : null,
        startDate,
        endDate: endDate || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar tarefa.");
    } finally {
      setSubmitting(false);
    }
  };

  const titleLabel = initialTask ? "Editar tarefa" : "Nova tarefa";

  return (
    <Modal open={open} onClose={onClose} title={titleLabel}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">Título</label>
          <input
            className="ff-input w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Estudar Python"
            autoFocus
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">Descrição</label>
          <textarea
            className="ff-input w-full resize-none"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Prioridade</label>
            <select
              className="ff-input w-full"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Horário (opcional)</label>
            <input
              type="time"
              className="ff-input w-full"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
          </div>
        </div>

        {taskType === "timed" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Duração (minutos)</label>
            <input
              type="number"
              min={1}
              className="ff-input w-full"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
            />
          </div>
        )}

        {taskType === "weekly" && (
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">Dias da semana</label>
            <div className="flex gap-1.5">
              {WEEKDAY_LABELS_SHORT.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleDay(index)}
                  className={classNames(
                    "flex-1 rounded-lg border py-2 text-xs font-medium transition-colors",
                    recurrenceDays.includes(index)
                      ? "border-accent-500 bg-accent-500/15 text-accent-400"
                      : "border-border-subtle text-text-muted hover:border-border-strong",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {(taskType === "single" || taskType === "timed") && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Data inicial</label>
              <input
                type="date"
                className="ff-input w-full"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>
        )}

        {(taskType === "daily" || taskType === "weekly") && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Início</label>
              <input
                type="date"
                className="ff-input w-full"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">Fim (opcional)</label>
              <input
                type="date"
                className="ff-input w-full"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button className="ff-btn-secondary" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="ff-btn-primary" onClick={handleSubmit} disabled={submitting} type="button">
            {submitting ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
