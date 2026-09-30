/**
 * Client-side mirror of the Rust `elapsed_seconds_now` logic
 * (`src-tauri/src/services/time_util.rs`). The backend remains the source
 * of truth — this only exists so the UI can tick smoothly between polls
 * instead of jumping every time a fresh snapshot arrives. Completion is
 * still decided by the backend (`check_timer` / `check_timed_task`),
 * comparing real timestamps, never by this function reaching zero.
 */
export function parseBackendDateTime(value: string): Date {
  // SQLite's `datetime('now')` produces "YYYY-MM-DD HH:MM:SS" in UTC with
  // no offset marker, which `Date` would otherwise parse as local time.
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return new Date(`${value.replace(" ", "T")}Z`);
  }
  return new Date(value);
}

export function liveElapsedSeconds(
  status: string,
  startedAt: string | null,
  baseElapsedSeconds: number,
  nowMs: number = Date.now(),
): number {
  if (status === "running" && startedAt) {
    const startedMs = parseBackendDateTime(startedAt).getTime();
    const liveSeconds = Math.max(0, (nowMs - startedMs) / 1000);
    return baseElapsedSeconds + liveSeconds;
  }
  return baseElapsedSeconds;
}
