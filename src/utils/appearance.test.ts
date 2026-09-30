import { describe, expect, it } from "vitest";
import { DEFAULT_APPEARANCE, TONES, appearanceFromSettings, buildPalette, encodeAccentSetting } from "./appearance";

describe("appearance", () => {
  it("falls back to the default look for legacy or broken settings", () => {
    expect(appearanceFromSettings({ theme: "dark", accentColor: "indigo" })).toEqual(DEFAULT_APPEARANCE);
    expect(appearanceFromSettings({ theme: "light", accentColor: "nope:#zzz" })).toEqual({ ...DEFAULT_APPEARANCE, mode: "light" });
  });

  it("round-trips the tone and accent through the settings string", () => {
    const appearance = { mode: "light" as const, tone: "forest", accent: "#2FA36B" };
    const restored = appearanceFromSettings({ theme: "light", accentColor: encodeAccentSetting(appearance) });
    expect(restored).toEqual({ mode: "light", tone: "forest", accent: "#2fa36b" });
  });

  it("defines every colour token for each tone in both modes", () => {
    for (const tone of TONES) {
      for (const mode of ["dark", "light"] as const) {
        const palette = buildPalette({ mode, tone: tone.id, accent: "#ffee00" });
        expect(Object.keys(palette)).toHaveLength(13);
        expect(Object.values(palette).every((v) => v.startsWith("hsl("))).toBe(true);
      }
    }
  });

  it("keeps a bright accent dark enough for white text", () => {
    const lightness = (hex: string) => Number(buildPalette({ ...DEFAULT_APPEARANCE, accent: hex })["--color-accent-500"].split(" ")[2].replace("%)", ""));
    expect(lightness("#ffff00")).toBeLessThanOrEqual(50);
    expect(lightness("#000000")).toBeGreaterThanOrEqual(36);
  });
});
