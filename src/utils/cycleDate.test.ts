import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { cycleNow } from "./cycleDate";

describe("cycleNow", () => {
  // 22:30 in São Paulo = 01:30 UTC of the next day.
  const lateNight = DateTime.fromISO("2026-10-14T01:30:00Z");

  it("uses the reset timezone, not UTC", () => {
    const sp = cycleNow({ dailyResetTime: "00:00", dailyResetTimezone: "America/Sao_Paulo" }, lateNight);
    expect(sp.toISODate()).toBe("2026-10-13");
    const utc = cycleNow({ dailyResetTime: "00:00", dailyResetTimezone: "UTC" }, lateNight);
    expect(utc.toISODate()).toBe("2026-10-14");
  });

  it("before the reset time it's still the previous day", () => {
    const early = DateTime.fromISO("2026-10-13T06:00:00Z"); // 03:00 in São Paulo
    const day = cycleNow({ dailyResetTime: "04:00", dailyResetTimezone: "America/Sao_Paulo" }, early);
    expect(day.toISODate()).toBe("2026-10-12");
  });
});
