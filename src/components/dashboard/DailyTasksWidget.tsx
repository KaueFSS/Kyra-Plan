import { DateTime } from "luxon";
import { Check, CheckSquare } from "../ui/icons";
import { useLiveTick } from "../../hooks/useLiveTick";
import { countOverdue } from "../tasks/TimeChip";
import { ResetTimeButton } from "../tasks/ResetTimeButton";
import { useSettingsStore } from "../../stores/settingsStore";
import { createDailyTask } from "../../stores/smartActions";
import { describeTask } from "../../utils/naturalLanguage";
import { useUiStore } from "../../stores/uiStore";
import { WidgetCard } from "../ui/WidgetCard";
import { InlineAdd } from "../ui/InlineAdd";
import { SortableDailyList } from "../tasks/SortableDailyList";
import type { TaskWithProgress } from "../../types/task";

export function DailyTasksWidget({ tasks }: { tasks: TaskWithProgress[] }) {
  const { settings } = useSettingsStore();
  const { setPage } = useUiStore();

  const done = tasks.filter((t) => t.completion?.completed).length;
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
  const allDone = tasks.length > 0 && done === tasks.length;
  const overdue = countOverdue(tasks, DateTime.fromMillis(useLiveTick(30_000)));

  return (
    <WidgetCard
      icon={CheckSquare}
      title="Tarefas Diárias"
      onTitleClick={() => setPage("daily-tasks")}
      subtitle={settings && <ResetTimeButton />}
      actions={
        tasks.length > 0 && (
          <>
          {overdue > 0 && (
            <span className="rounded-md bg-danger/15 px-1.5 py-0.5 text-[0.75rem] font-semibold text-danger" title="Passaram do horário e ainda não foram feitas">
              {overdue} {overdue === 1 ? "atrasada" : "atrasadas"}
            </span>
          )}
          <span
            className={
              "rounded-md px-1.5 py-0.5 text-[0.75rem] font-semibold tabular-nums " +
              (done === tasks.length ? "bg-success/15 text-success" : "bg-surface-2 text-text-secondary")
            }
          >
            {done}/{tasks.length}
          </span>
          </>
        )
      }
    >
      <div className="mb-2 h-1 shrink-0 overflow-hidden rounded-full bg-surface-3">
        <div className={"h-full rounded-full transition-[width,background-color] duration-500 " + (allDone ? "bg-success" : "bg-accent-500")} style={{ width: `${pct}%` }} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="px-1 py-2 text-xs text-text-muted">Crie hábitos que se repetem todo dia — o histórico de cada dia fica salvo.</p>
        ) : (
          <>
            {allDone && (
              <div className="mb-1.5 flex items-center gap-2 rounded-lg bg-success/10 px-2 py-1.5 text-xs font-medium text-success">
                <Check size={14} strokeWidth={3} /> Tudo feito hoje — mandou bem!
              </div>
            )}
            <SortableDailyList tasks={tasks} />
          </>
        )}
      </div>

      <div className="mt-2 shrink-0">
        <InlineAdd
          label="Adicionar tarefa"
          placeholder="Ex.: Estudar por 1h · Beber água 10h"
          describe={(p) => describeTask(p)}
          onSubmit={createDailyTask}
        />
      </div>
    </WidgetCard>
  );
}
