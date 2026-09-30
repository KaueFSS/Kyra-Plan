import { useEffect } from "react";
import { useScheduleStore } from "../stores/scheduleStore";
import { AppDndContext } from "../components/dnd/AppDndContext";
import { WeeklyTimetable } from "../components/schedule/WeeklyTimetable";

export function WeeklySchedulePage() {
  const { blocks, load } = useScheduleStore();

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppDndContext>
      <div className="flex h-full flex-col p-4">
        <p className="mb-3 shrink-0 text-xs text-text-muted">
          Clique num horário vazio para criar um bloco · arraste para mudar de dia ou horário · puxe a borda de baixo para ajustar a duração.
        </p>
        <div className="ff-card min-h-0 flex-1 p-4">
          <WeeklyTimetable blocks={blocks} />
        </div>
      </div>
    </AppDndContext>
  );
}
