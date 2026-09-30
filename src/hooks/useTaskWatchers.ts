import { useEffect, useRef } from "react";
import { DateTime } from "luxon";
import { useShallow } from "zustand/react/shallow";
import { useTaskStore } from "../stores/taskStore";
import { useSettingsStore } from "../stores/settingsStore";
import { tasksService } from "../services/tasksService";

/**
 * While any task countdown is running, ask the backend once a second
 * whether it has finished. The backend decides from real timestamps (and
 * rings); this just keeps the UI in step. Idle when nothing is running.
 */
export function useRunningTaskWatcher(): void {
  const runningIds = useTaskStore(
    useShallow((s) =>
      [...s.daily, ...s.weekly, ...s.single, ...s.timed]
        .map((t) => t.activeSession)
        .filter((session) => session?.status === "running")
        .map((session) => session!.id),
    ),
  );
  const key = Array.from(new Set(runningIds)).join(",");

  useEffect(() => {
    if (!key) return;
    const ids = key.split(",");
    const id = setInterval(async () => {
      const results = await Promise.all(ids.map((sessionId) => tasksService.checkTimedTask(sessionId).catch(() => null)));
      if (results.some((r) => r?.status === "completed")) void useTaskStore.getState().loadAll();
    }, 1000);
    return () => clearInterval(id);
  }, [key]);
}

/** The daily-task "day" in the configured reset time and timezone. */
function currentCycle(resetTime: string, zone: string): string {
  const now = DateTime.now().setZone(zone);
  const [h, m] = resetTime.split(":").map(Number);
  const beforeReset = now.hour * 60 + now.minute < h * 60 + m;
  return (beforeReset ? now.minus({ days: 1 }) : now).toISODate() ?? "";
}

/**
 * Rolls the daily tasks over at the configured reset time even if the app
 * stays open all night: when the cycle date changes, reload so yesterday's
 * checkmarks clear. Pure date math every 30s — no database access.
 */
export function useDailyRollover(): void {
  const settings = useSettingsStore((s) => s.settings);
  const lastCycle = useRef<string | null>(null);

  useEffect(() => {
    if (!settings) return;
    const check = () => {
      const cycle = currentCycle(settings.dailyResetTime, settings.dailyResetTimezone);
      if (lastCycle.current !== null && lastCycle.current !== cycle) void useTaskStore.getState().loadAll();
      lastCycle.current = cycle;
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [settings]);
}
