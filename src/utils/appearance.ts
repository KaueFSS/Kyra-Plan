/**
 * User-chosen look of the app: a mode (dark/light), a background "tone" and
 * an accent colour. Every surface, border and text colour is derived from
 * these few choices, so any combination stays consistent and readable.
 *
 * Persisted in the existing settings row: `theme` holds the mode and
 * `accentColor` holds "<tone>:<#hex>" (legacy values fall back to defaults).
 */
export type Mode = "dark" | "light";

export interface Appearance {
  mode: Mode;
  tone: string;
  accent: string;
}

export interface Tone {
  id: string;
  label: string;
  /** Hue and saturation (HSL) of the tinted greys used for surfaces. */
  h: number;
  s: number;
}

export interface AccentSwatch {
  id: string;
  label: string;
  hex: string;
}

export interface Combo {
  id: string;
  label: string;
  appearance: Appearance;
}

export const DEFAULT_APPEARANCE: Appearance = { mode: "dark", tone: "graphite", accent: "#2b8af7" };

export const TONES: Tone[] = [
  { id: "graphite", label: "Grafite", h: 220, s: 10 },
  { id: "slate", label: "Ardósia", h: 213, s: 18 },
  { id: "midnight", label: "Meia-noite", h: 225, s: 32 },
  { id: "ocean", label: "Oceano", h: 190, s: 22 },
  { id: "forest", label: "Floresta", h: 150, s: 16 },
  { id: "wine", label: "Vinho", h: 345, s: 18 },
  { id: "sand", label: "Areia", h: 32, s: 14 },
];

export const ACCENTS: AccentSwatch[] = [
  { id: "azure", label: "Azul", hex: "#2b8af7" },
  { id: "cyan", label: "Ciano", hex: "#1fa8c9" },
  { id: "emerald", label: "Esmeralda", hex: "#2fa36b" },
  { id: "amber", label: "Âmbar", hex: "#d08a1e" },
  { id: "orange", label: "Laranja", hex: "#e2692f" },
  { id: "red", label: "Vermelho", hex: "#e5484d" },
  { id: "rose", label: "Rosa", hex: "#d9467a" },
  { id: "violet", label: "Violeta", hex: "#8b5cf6" },
];

export const COMBOS: Combo[] = [
  { id: "graphite-azure", label: "Grafite", appearance: DEFAULT_APPEARANCE },
  { id: "midnight-cyan", label: "Meia-noite", appearance: { mode: "dark", tone: "midnight", accent: "#1fa8c9" } },
  { id: "forest-emerald", label: "Floresta", appearance: { mode: "dark", tone: "forest", accent: "#2fa36b" } },
  { id: "wine-rose", label: "Vinho", appearance: { mode: "dark", tone: "wine", accent: "#d9467a" } },
  { id: "sand-amber", label: "Areia", appearance: { mode: "light", tone: "sand", accent: "#d08a1e" } },
  { id: "slate-azure", label: "Neblina", appearance: { mode: "light", tone: "slate", accent: "#2b8af7" } },
];

const HEX = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: string): boolean {
  return HEX.test(value);
}

/** Reads `theme` + `accentColor` from settings; unknown/legacy values use the defaults. */
export function appearanceFromSettings(settings: { theme: string; accentColor: string }): Appearance {
  const mode: Mode = settings.theme === "light" ? "light" : "dark";
  const [tone, accent] = settings.accentColor.split(":");
  return {
    mode,
    tone: TONES.some((t) => t.id === tone) ? tone : DEFAULT_APPEARANCE.tone,
    accent: accent && isHexColor(accent) ? accent.toLowerCase() : DEFAULT_APPEARANCE.accent,
  };
}

export function encodeAccentSetting(a: Appearance): string {
  return `${a.tone}:${a.accent.toLowerCase()}`;
}

export function sameAppearance(a: Appearance, b: Appearance): boolean {
  return a.mode === b.mode && a.tone === b.tone && a.accent.toLowerCase() === b.accent.toLowerCase();
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round = (n: number) => Math.round(n * 10) / 10;

function hsl(h: number, s: number, l: number, alpha?: number): string {
  const base = `${round(h)} ${round(s)}% ${round(l)}%`;
  return alpha === undefined ? `hsl(${base})` : `hsl(${base} / ${alpha})`;
}

function hexToHsl(hex: string): [number, number, number] {
  const value = isHexColor(hex) ? hex : DEFAULT_APPEARANCE.accent;
  const r = parseInt(value.slice(1, 3), 16) / 255;
  const g = parseInt(value.slice(3, 5), 16) / 255;
  const b = parseInt(value.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s * 100, l * 100];
}

/** The CSS custom properties (same names as `@theme` in index.css) for an appearance. */
export function buildPalette(a: Appearance): Record<string, string> {
  const tone = TONES.find((t) => t.id === a.tone) ?? TONES[0];
  const { h, s } = tone;
  const [ah, as, al] = hexToHsl(a.accent);
  // Keep the accent readable with white text and never neon: any hue is
  // allowed, but saturation and lightness are held in a comfortable band.
  const aSat = clamp(as, 40, 85);
  const l500 = clamp(al, 36, 50);

  if (a.mode === "dark") {
    return {
      "--color-surface-0": hsl(h, s, 5.7),
      "--color-surface-1": hsl(h, s, 8.6),
      "--color-surface-2": hsl(h, s, 12),
      "--color-surface-3": hsl(h, s, 16),
      "--color-border-subtle": hsl(h, s, 15.5),
      "--color-border-strong": hsl(h, s, 22),
      "--color-text-primary": hsl(h, 8, 93),
      "--color-text-secondary": hsl(h, Math.min(s, 14), 66),
      "--color-text-muted": hsl(h, Math.min(s, 10), 47),
      "--color-accent-500": hsl(ah, aSat, l500),
      "--color-accent-400": hsl(ah, aSat, Math.min(l500 + 11, 68)),
      "--color-accent-600": hsl(ah, aSat, l500 - 8),
      "--color-accent-glow": hsl(ah, aSat, l500, 0.18),
    };
  }
  return {
    "--color-surface-0": hsl(h, s * 0.6, 96),
    "--color-surface-1": hsl(h, s * 0.4, 99.5),
    "--color-surface-2": hsl(h, s * 0.6, 95),
    "--color-surface-3": hsl(h, s * 0.6, 90),
    "--color-border-subtle": hsl(h, s * 0.6, 89),
    "--color-border-strong": hsl(h, s * 0.5, 80),
    "--color-text-primary": hsl(h, Math.min(s, 20), 10),
    "--color-text-secondary": hsl(h, Math.min(s, 10), 36),
    "--color-text-muted": hsl(h, 8, 53),
    "--color-accent-500": hsl(ah, aSat, l500 - 3),
    "--color-accent-400": hsl(ah, aSat, l500 + 8),
    "--color-accent-600": hsl(ah, aSat, l500 - 12),
    "--color-accent-glow": hsl(ah, aSat, l500 - 3, 0.12),
  };
}

const CACHE_KEY = "focusflow.appearance";

/** Paints the whole app with an appearance and remembers it for the next start. */
export function applyAppearance(a: Appearance): void {
  const root = document.documentElement;
  root.classList.toggle("light", a.mode === "light");
  for (const [name, value] of Object.entries(buildPalette(a))) root.style.setProperty(name, value);
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(a));
  } catch {
    // The cache only avoids a flash of the default look at startup.
  }
}

/** Applies the last used appearance before the first paint (settings load a moment later). */
export function applyCachedAppearance(): void {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<Appearance>;
    applyAppearance(
      appearanceFromSettings({
        theme: parsed.mode ?? "dark",
        accentColor: `${parsed.tone ?? ""}:${parsed.accent ?? ""}`,
      }),
    );
  } catch {
    // Corrupt cache: keep the default look.
  }
}
