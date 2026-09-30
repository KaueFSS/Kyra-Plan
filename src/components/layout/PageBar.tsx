import { useEffect } from "react";
import { ArrowLeft } from "../ui/icons";
import { useUiStore } from "../../stores/uiStore";

const PAGE_TITLES: Record<string, string> = {
  calendar: "Calendário",
  "daily-tasks": "Tarefas Diárias",
  "weekly-tasks": "Tarefas Semanais",
  "weekly-schedule": "Programação Semanal",
  timer: "Timer / Cronômetro",
  alarms: "Alarmes",
  "world-clock": "Relógio Mundial",
  settings: "Configurações",
};

/**
 * Slim strip shown on every full page opened from the dashboard: just a
 * way back (button or Esc) and the page name — no brand, search or clock.
 */
export function PageBar() {
  const { activePage, setPage } = useUiStore();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Esc belongs to open popovers, dialogs and text fields first.
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (useUiStore.getState().searchOpen || document.querySelector("[data-overlay]")) return;
      setPage("dashboard");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setPage]);

  return (
    <div className="flex shrink-0 items-center gap-3 px-3 pt-3">
      <button
        onClick={() => setPage("dashboard")}
        className="ff-btn-secondary gap-1.5 px-3 py-1.5 text-sm"
        title="Voltar ao início (Esc)"
      >
        <ArrowLeft size={15} /> Voltar
      </button>
      <h1 className="text-base font-semibold text-text-primary">{PAGE_TITLES[activePage]}</h1>
    </div>
  );
}
