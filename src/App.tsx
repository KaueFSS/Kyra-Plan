import { useEffect } from "react";
import { PageBar } from "./components/layout/PageBar";
import { GlobalSearch } from "./components/layout/GlobalSearch";
import { useUiStore } from "./stores/uiStore";
import { settingsToUpdateInput, useSettingsStore } from "./stores/settingsStore";
import { systemTimezone } from "./utils/cycleDate";
import { playSound } from "./utils/sounds";
import { useUiScale } from "./hooks/useUiScale";
import { DEFAULT_APPEARANCE, appearanceFromSettings, applyAppearance, sameAppearance, takeColoursMigration } from "./utils/appearance";
import { useDailyRollover, useRunningTaskWatcher } from "./hooks/useTaskWatchers";
import { RingOverlay } from "./components/ring/RingOverlay";
import { UpdateToast, useAutoUpdateCheck } from "./components/update/UpdateToast";
import { Toaster } from "./components/feedback/Toaster";
import { WhatsNew } from "./components/update/WhatsNew";
import { DemoBadge } from "./components/ui/DemoBadge";
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
  const { settings, load: loadSettings, update: updateSettings, setAppearance } = useSettingsStore();
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

  // The default colours changed: move everyone (including people who
  // installed before) to the new look once; later picks are kept.
  useEffect(() => {
    if (!settings || !takeColoursMigration()) return;
    if (!sameAppearance(appearanceFromSettings(settings), DEFAULT_APPEARANCE)) setAppearance(DEFAULT_APPEARANCE);
  }, [settings, setAppearance]);

  // Fresh installs start at UTC; adopt the computer's timezone once so
  // "today" (and the daily reset) match the user's own clock.
  useEffect(() => {
    if (!settings || settings.timezone !== "UTC") return;
    const zone = systemTimezone();
    if (zone === "UTC") return;
    void updateSettings({
      ...settingsToUpdateInput(settings),
      timezone: zone,
      dailyResetTimezone: settings.dailyResetTimezone === "UTC" ? zone : settings.dailyResetTimezone,
    });
  }, [settings, updateSettings]);

  // A soft tick on every button press — the "physical" feel (can be turned off in Settings).
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const el = (e.target as HTMLElement | null)?.closest("button, [role=button], [role=switch], a, select, summary");
      if (el && !(el as HTMLButtonElement).disabled) playSound("click");
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

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
      <Toaster />
      <WhatsNew />
      <DemoBadge />
    </div>
  );
}

export default App;
