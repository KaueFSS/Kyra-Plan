import { useEffect, useState } from "react";

/** Forces a re-render every `intervalMs`, so components can recompute
 * elapsed time from stored timestamps (see `utils/liveTime.ts`) and appear
 * to tick smoothly without each one owning its own interval/state. */
export function useLiveTick(intervalMs = 250): number {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return Date.now();
}
