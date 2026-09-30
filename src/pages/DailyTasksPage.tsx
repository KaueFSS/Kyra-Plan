import { useEffect } from "react";
import { useTaskStore } from "../stores/taskStore";
import { useSettingsStore } from "../stores/settingsStore";
import { createDailyTask } from "../stores/smartActions";
import { AppDndContext } from "../components/dnd/AppDndContext";
import { SortableDailyList } from "../components/tasks/SortableDailyList";
import { InlineAdd } from "../components/ui/InlineAdd";
import { ResetTimeButton } from "../components/tasks/ResetTimeButton";
import { describeTask } from "../utils/naturalLanguage";

export function DailyTasksPage() {
  const { daily, loading, loadAll } = useTaskStore();
  const { settings } = useSettingsStore();

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const done = daily.filter((t) => t.completion?.completed).length;
  const pct = daily.length > 0 ? Math.round((done / daily.length) * 100) : 0;

  return (
    <AppDndContext>
      <div className="mx-auto max-w-3xl p-6">
        <div className="ff-card p-5">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-2xl font-semibold tabular-nums text-text-primary">
                {done}
                <span className="text-text-muted">/{daily.length}</span>
              </p>
              <p className="flex items-center gap-1 text-xs text-text-muted">
                concluídas hoje {settings && <>· <ResetTimeButton /></>}
              </p>
            </div>
            <p className="text-right text-xs text-text-muted">
              Arraste pela alça para reordenar · clique no título para editar
              <br />
              Tarefas com duração só concluem quando o cronômetro termina
            </p>
          </div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-accent-500 transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>

          {!loading && daily.length === 0 && (
            <p className="py-4 text-sm text-text-muted">Nenhuma tarefa diária ainda. Crie a primeira abaixo — o histórico de cada dia fica salvo.</p>
          )}
          <SortableDailyList tasks={daily} showHistory />

          <div className="mt-3">
            <InlineAdd
              label="Adicionar tarefa diária"
              placeholder="Ex.: Estudar Python por 1h · Ler 20 páginas 22h"
              describe={(p) => describeTask(p)}
              onSubmit={createDailyTask}
            />
          </div>
        </div>
      </div>
    </AppDndContext>
  );
}
