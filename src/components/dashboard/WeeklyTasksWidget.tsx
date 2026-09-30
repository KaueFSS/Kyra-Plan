import { ListChecks } from "../ui/icons";
import { useUiStore } from "../../stores/uiStore";
import { WidgetCard } from "../ui/WidgetCard";
import { WeeklyTasksBoard } from "../tasks/WeeklyTasksBoard";
import type { TaskWithProgress } from "../../types/task";

/** The day pills and day header already say how the week is going, so no subtitle. */
export function WeeklyTasksWidget({ tasks }: { tasks: TaskWithProgress[] }) {
  const { setPage } = useUiStore();

  return (
    <WidgetCard icon={ListChecks} title="Tarefas Semanais" onTitleClick={() => setPage("weekly-tasks")}>
      <WeeklyTasksBoard tasks={tasks} />
    </WidgetCard>
  );
}
