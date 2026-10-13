import { describe, expect, it, vi } from "vitest";
import { DEFAULT_APPEARANCE, TONES, appearanceFromSettings, buildPalette, effectiveMode, encodeAccentSetting, takeColoursMigration } from "./appearance";

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
        expect(Object.keys(palette)).toHaveLength(14);
        const { "--color-on-accent": onAccent, ...colours } = palette;
        expect(Object.values(colours).every((v) => v.startsWith("hsl("))).toBe(true);
        expect(["#ffffff", "#0d0e10"]).toContain(onAccent);
      }
    }
  });

  it("uses a picked accent exactly, with dark text when it is light", () => {
    const white = buildPalette({ ...DEFAULT_APPEARANCE, accent: "#ffffff" });
    expect(white["--color-accent-500"]).toBe("hsl(0 0% 100%)");
    expect(white["--color-on-accent"]).toBe("#0d0e10");
    const navy = buildPalette({ ...DEFAULT_APPEARANCE, accent: "#1e3a8a" });
    expect(navy["--color-on-accent"]).toBe("#ffffff");
  });
});

describe("custom background colour", () => {
  it("keeps a white background white, with dark text, whatever the mode says", () => {
    const a = appearanceFromSettings({ theme: "dark", accentColor: "#ffffff:#2b8af7" });
    expect(a.tone).toBe("#ffffff");
    expect(effectiveMode(a)).toBe("light");
    const palette = buildPalette(a);
    expect(palette["--color-surface-0"]).toBe("hsl(0 0% 100%)");
    expect(palette["--color-text-primary"]).toMatch(/ (4|1[0-2])%\)$/);
  });

  it("keeps a dark pick as the exact background, with light text", () => {
    const a = appearanceFromSettings({ theme: "light", accentColor: "#1a1033:#2b8af7" });
    expect(effectiveMode(a)).toBe("dark");
    const palette = buildPalette(a);
    expect(palette["--color-surface-0"]).toBe(buildPalette({ ...a })["--color-surface-0"]);
    expect(palette["--color-text-primary"]).toMatch(/ 95%\)$/);
  });
});

describe("default colours migration", () => {
  it("runs once per computer, then leaves later picks alone", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
    expect(takeColoursMigration()).toBe(true);
    expect(takeColoursMigration()).toBe(false);
  });

  it("the default is the near-black background with the grey accent", () => {
    expect(DEFAULT_APPEARANCE).toEqual({ mode: "dark", tone: "#0d0d0d", accent: "#65676c" });
    // Settings saved by older versions ("indigo") land on it too.
    expect(appearanceFromSettings({ theme: "dark", accentColor: "indigo" })).toEqual(DEFAULT_APPEARANCE);
  });
});
