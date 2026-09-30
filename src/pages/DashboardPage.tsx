import { useEffect, useMemo } from "react";
import { DateTime } from "luxon";
import { useTaskStore } from "../stores/taskStore";
import { useCalendarStore } from "../stores/calendarStore";
import { useAlarmStore } from "../stores/alarmStore";
import { useWorldClockStore } from "../stores/worldClockStore";
import { useScheduleStore } from "../stores/scheduleStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useDashboardStore } from "../stores/dashboardStore";
import { AppDndContext } from "../components/dnd/AppDndContext";
import { TabBar } from "../components/widgets/TabBar";
import { WidgetGrid } from "../components/widgets/WidgetGrid";

/**
 * One-screen HUD organised in tabs ("guias"), Obsidian-style: the "Início"
 * tab has everything together; other tabs hold only the widgets you pick.
 * Each tab is a 12x12 grid that always fits the window (no page scroll).
 *
 * Every widget reads the shared stores, so data is the same on every tab,
 * and all drag-and-drop between widgets still goes through `AppDndContext`.
 */
export function DashboardPage() {
  const loadAll = useTaskStore((s) => s.loadAll);
  const loadRange = useCalendarStore((s) => s.loadRange);
  const loadAlarms = useAlarmStore((s) => s.load);
  const loadClocks = useWorldClockStore((s) => s.load);
  const loadBlocks = useScheduleStore((s) => s.load);
  const { settings, load: loadSettings } = useSettingsStore();
  const { tabs, activeTabId, editing, loaded, load: loadTabs } = useDashboardStore();

  // Wide enough that browsing a month back/forward in the mini calendar
  // still shows event dots without refetching.
  const range = useMemo(() => {
    const today = DateTime.now();
    return {
      start: today.minus({ months: 1 }).startOf("month").toUTC().toISO()!,
      end: today.plus({ months: 2 }).endOf("month").toUTC().toISO()!,
    };
  }, []);

  useEffect(() => {
    loadAll();
    loadAlarms();
    loadClocks();
    loadBlocks();
    if (!settings) loadSettings();
    loadRange(range.start, range.end);
    if (!loaded) loadTabs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TabBar />
      <div className="min-h-0 flex-1 p-3">
        {activeTab && (
          <AppDndContext eventRange={range}>
            <WidgetGrid key={activeTab.id} tab={activeTab} editing={editing} range={range} />
          </AppDndContext>
        )}
      </div>
    </div>
  );
}
