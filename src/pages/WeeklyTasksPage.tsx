import { useEffect } from "react";
import { useTaskStore } from "../stores/taskStore";
import { AppDndContext } from "../components/dnd/AppDndContext";
import { WeeklyTasksBoard } from "../components/tasks/WeeklyTasksBoard";

export function WeeklyTasksPage() {
  const { weekly, loadAll } = useTaskStore();

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <AppDndContext>
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col p-4">
        <p className="mb-3 shrink-0 text-xs text-text-muted">
          Escolha um dia na faixa para ver as tarefas dele · arraste uma tarefa até outro dia para remarcar · clique no nome para editar.
        </p>
        <div className="min-h-0 flex-1">
          <WeeklyTasksBoard tasks={weekly} />
        </div>
      </div>
    </AppDndContext>
  );
}
