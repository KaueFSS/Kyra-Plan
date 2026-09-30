import { useEffect } from "react";
import { PageBar } from "./components/layout/PageBar";
import { GlobalSearch } from "./components/layout/GlobalSearch";
import { useUiStore } from "./stores/uiStore";
import { useSettingsStore } from "./stores/settingsStore";
import { useUiScale } from "./hooks/useUiScale";
import { appearanceFromSettings, applyAppearance } from "./utils/appearance";
import { useDailyRollover, useRunningTaskWatcher } from "./hooks/useTaskWatchers";
import { RingOverlay } from "./components/ring/RingOverlay";
import { UpdateToast, useAutoUpdateCheck } from "./components/update/UpdateToast";
import { DashboardPage } from "./pages/DashboardPage";
import { CalendarPage } from "./pages/CalendarPage";
import { DailyTasksPage } from "./pages/DailyTasksPage";
import { WeeklyTasksPage } from "./pages/WeeklyTasksPage";
import { WeeklySchedulePage } from "./pages/WeeklySchedulePage";
import { TimerPage } from "./pages/TimerPage";
import { AlarmsPage } from "./pages/AlarmsPage";
import { WorldClockPage } from "./pages/WorldClockPage";
import { SettingsPage } from "./pages/SettingsPage";

const PAGES: Record<string, React.ComponentType> = {
  dashboard: DashboardPage,
  calendar: CalendarPage,
  "daily-tasks": DailyTasksPage,
  "weekly-tasks": WeeklyTasksPage,
  "weekly-schedule": WeeklySchedulePage,
  timer: TimerPage,
  alarms: AlarmsPage,
  "world-clock": WorldClockPage,
  settings: SettingsPage,
};

function App() {
  const { activePage, openSearch } = useUiStore();
  const { settings, load: loadSettings } = useSettingsStore();
  const PageComponent = PAGES[activePage] ?? DashboardPage;
  const isDashboard = activePage === "dashboard";
  useUiScale();
  useRunningTaskWatcher();
  useDailyRollover();
  useAutoUpdateCheck();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (settings) applyAppearance(appearanceFromSettings(settings));
  }, [settings?.theme, settings?.accentColor]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === "Space") {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openSearch]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-surface-0">
      {!isDashboard && <PageBar />}
      <main className="flex-1 overflow-y-auto">
        <PageComponent />
      </main>
      <GlobalSearch />
      <RingOverlay />
      <UpdateToast />
    </div>
  );
}

export default App;
