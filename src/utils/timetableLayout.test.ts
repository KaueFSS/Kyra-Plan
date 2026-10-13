import { describe, expect, it } from "vitest";
import { minutesToClock, snap } from "./timetableLayout";

describe("timetable helpers", () => {
  it("formats and snaps minutes", () => {
    expect(minutesToClock(21 * 60 + 27)).toBe("21:27");
    expect(minutesToClock(24 * 60)).toBe("23:59");
    expect(snap(503, 15)).toBe(510);
  });
});
