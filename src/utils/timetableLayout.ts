/** Minutes → "HH:MM", clamped to the day. */
export function minutesToClock(minutes: number): string {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function snap(minutes: number, step: number): number {
  return Math.round(minutes / step) * step;
}
