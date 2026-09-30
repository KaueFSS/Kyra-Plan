import type { TaskCompletion } from "../../types/task";
import { classNames } from "../../utils/format";

/** Small trail of the last few cycle dates' completion dots — the visible
 * proof that history is tracked per day instead of a single boolean. */
export function TaskHistoryTrail({ history, limit = 7 }: { history: TaskCompletion[]; limit?: number }) {
  const recent = [...history].sort((a, b) => a.cycleDate.localeCompare(b.cycleDate)).slice(-limit);

  if (recent.length === 0) return null;

  return (
    <div className="flex items-center gap-1" title="Histórico recente">
      {recent.map((entry) => (
        <span
          key={entry.id}
          title={`${entry.cycleDate}: ${entry.completed ? "concluída" : "não concluída"}`}
          className={classNames(
            "h-1.5 w-1.5 rounded-full",
            entry.completed ? "bg-success" : "bg-border-strong",
          )}
        />
      ))}
    </div>
  );
}
