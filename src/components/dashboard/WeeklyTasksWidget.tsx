import { DateTime } from "luxon";
import { ListChecks } from "../ui/icons";
import { useUiStore } from "../../stores/uiStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useLiveTick } from "../../hooks/useLiveTick";
import { cycleNow } from "../../utils/cycleDate";
import { WidgetCard } from "../ui/WidgetCard";
import { WeeklyTasksBoard } from "../tasks/WeeklyTasksBoard";
import { buildWeek, weekTotals } from "../tasks/weekProgress";
import type { TaskWithProgress } from "../../types/task";

export function WeeklyTasksWidget({ tasks }: { tasks: TaskWithProgress[] }) {
  const { setPage } = useUiStore();
  const settings = useSettingsStore((s) => s.settings);
  const week = buildWeek(tasks, cycleNow(settings, DateTime.fromMillis(useLiveTick(60_000))));
  const totals = weekTotals(week);
  const today = week.find((d) => d.isToday)!;

  const subtitle =
    totals.total === 0 ? (
      "Tarefas que se repetem em dias da semana"
    ) : totals.perfect ? (
      <span className="font-medium text-success">Semana perfeita! {totals.done} de {totals.total}</span>
    ) : (
      <span>
        Semana: <span className="font-medium text-text-secondary">{totals.done} de {totals.total}</span>
        {today.tasks.length > 0 && (
          <>
            {" "}· hoje{" "}
            <span className={today.done === today.tasks.length ? "font-medium text-success" : "font-medium text-text-secondary"}>
              {today.done} de {today.tasks.length}
            </span>
          </>
        )}
      </span>
    );

  return (
    <WidgetCard icon={ListChecks} title="Tarefas Semanais" subtitle={subtitle} onTitleClick={() => setPage("weekly-tasks")}>
      <WeeklyTasksBoard tasks={tasks} />
    </WidgetCard>
  );
}
