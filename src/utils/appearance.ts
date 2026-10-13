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

/** The look a fresh install opens with: near-black background, neutral grey accent. */
export const DEFAULT_APPEARANCE: Appearance = { mode: "dark", tone: "#0d0d0d", accent: "#65676c" };

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
  { id: "default", label: "Padrão", appearance: DEFAULT_APPEARANCE },
  { id: "graphite-azure", label: "Grafite", appearance: { mode: "dark", tone: "graphite", accent: "#2b8af7" } },
  { id: "midnight-cyan", label: "Meia-noite", appearance: { mode: "dark", tone: "midnight", accent: "#1fa8c9" } },
  { id: "forest-emerald", label: "Floresta", appearance: { mode: "dark", tone: "forest", accent: "#2fa36b" } },
  { id: "wine-rose", label: "Vinho", appearance: { mode: "dark", tone: "wine", accent: "#d9467a" } },
  { id: "sand-amber", label: "Areia", appearance: { mode: "light", tone: "sand", accent: "#d08a1e" } },
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
    tone: TONES.some((t) => t.id === tone) ? tone : tone && isHexColor(tone) ? tone.toLowerCase() : DEFAULT_APPEARANCE.tone,
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

/** WCAG relative luminance, 0 (black) … 1 (white). */
export function luminance(hex: string): number {
  if (!isHexColor(hex)) return 0;
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

const isCustomTone = (tone: string) => !TONES.some((t) => t.id === tone) && isHexColor(tone);

/**
 * Light or dark for this appearance. Presets follow the chosen mode; a
 * background colour the user picked decides by its own brightness, so a
 * white background always gets dark text and vice versa.
 */
export function effectiveMode(a: Appearance): Mode {
  if (isCustomTone(a.tone)) return luminance(a.tone) > 0.3 ? "light" : "dark";
  return a.mode;
}

/** The accent exactly as picked, plus lighter/darker steps and the text colour that reads on it. */
function accentVars(accent: string, mode: Mode): Record<string, string> {
  const [h, s, l] = hexToHsl(accent);
  return {
    "--color-accent-500": hsl(h, s, l),
    "--color-accent-400": mode === "dark" ? hsl(h, s, clamp(l + 10, l, 85)) : hsl(h, s, clamp(l - 6, 20, l)),
    "--color-accent-600": hsl(h, s, Math.max(l - 10, 4)),
    "--color-accent-glow": hsl(h, s, l, mode === "dark" ? 0.18 : 0.14),
    // White text on dark accents, near-black on light ones (white, yellow…).
    "--color-on-accent": luminance(accent) > 0.4 ? "#0d0e10" : "#ffffff",
  };
}

/** Surfaces built around a background colour the user picked: it stays exactly that colour. */
function customToneVars(tone: string, mode: Mode): Record<string, string> {
  const [h, s, l] = hexToHsl(tone);
  const up = (d: number) => hsl(h, s, clamp(l + d, 0, 100));
  const textSat = Math.min(s, 12);
  if (mode === "dark") {
    return {
      "--color-surface-0": up(0),
      "--color-surface-1": up(3),
      "--color-surface-2": up(6.5),
      "--color-surface-3": up(10.5),
      "--color-border-subtle": up(10),
      "--color-border-strong": up(16),
      "--color-text-primary": hsl(h, Math.min(s, 8), 95),
      "--color-text-secondary": hsl(h, textSat, clamp(l + 45, 66, 86)),
      "--color-text-muted": hsl(h, textSat, clamp(l + 30, 47, 76)),
    };
  }
  return {
    "--color-surface-0": up(0),
    "--color-surface-1": up(l >= 97 ? 0 : 3),
    "--color-surface-2": up(-4),
    "--color-surface-3": up(-8),
    "--color-border-subtle": up(-10),
    "--color-border-strong": up(-18),
    "--color-text-primary": hsl(h, Math.min(s, 20), clamp(l - 70, 4, 12)),
    "--color-text-secondary": hsl(h, textSat, clamp(l - 62, 18, 38)),
    "--color-text-muted": hsl(h, textSat, clamp(l - 45, 30, 55)),
  };
}

/** The CSS custom properties (same names as `@theme` in index.css) for an appearance. */
export function buildPalette(a: Appearance): Record<string, string> {
  const mode = effectiveMode(a);
  if (isCustomTone(a.tone)) return { ...customToneVars(a.tone, mode), ...accentVars(a.accent, mode) };

  const preset = TONES.find((t) => t.id === a.tone) ?? TONES[0];
  const { h, s } = preset;
  const surfaces =
    mode === "dark"
      ? {
          "--color-surface-0": hsl(h, s, 5.7),
          "--color-surface-1": hsl(h, s, 8.6),
          "--color-surface-2": hsl(h, s, 12),
          "--color-surface-3": hsl(h, s, 16),
          "--color-border-subtle": hsl(h, s, 15.5),
          "--color-border-strong": hsl(h, s, 22),
          "--color-text-primary": hsl(h, 8, 93),
          "--color-text-secondary": hsl(h, Math.min(s, 14), 66),
          "--color-text-muted": hsl(h, Math.min(s, 10), 47),
        }
      : {
          "--color-surface-0": hsl(h, s * 0.6, 96),
          "--color-surface-1": hsl(h, s * 0.4, 99.5),
          "--color-surface-2": hsl(h, s * 0.6, 95),
          "--color-surface-3": hsl(h, s * 0.6, 90),
          "--color-border-subtle": hsl(h, s * 0.6, 89),
          "--color-border-strong": hsl(h, s * 0.5, 80),
          "--color-text-primary": hsl(h, Math.min(s, 20), 10),
          "--color-text-secondary": hsl(h, Math.min(s, 10), 36),
          "--color-text-muted": hsl(h, 8, 53),
        };
  return { ...surfaces, ...accentVars(a.accent, mode) };
}

const CACHE_KEY = "focusflow.appearance";

function paint(a: Appearance): void {
  const root = document.documentElement;
  root.classList.toggle("light", effectiveMode(a) === "light");
  for (const [name, value] of Object.entries(buildPalette(a))) root.style.setProperty(name, value);
}

/** Paints the whole app with an appearance and remembers it for the next start. */
export function applyAppearance(a: Appearance): void {
  paint(a);
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(a));
  } catch {
    // The cache only avoids a flash of the default look at startup.
  }
}

let frame = 0;
let queued: Appearance | null = null;
let settleTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Live preview while a colour is being dragged: repaints at most once per
 * frame and switches off every CSS transition meanwhile — otherwise each
 * tiny change re-animates hundreds of elements and the picker stutters.
 */
export function previewAppearance(a: Appearance): void {
  queued = a;
  document.documentElement.classList.add("ff-repainting");
  if (!frame) {
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (queued) paint(queued);
    });
  }
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => document.documentElement.classList.remove("ff-repainting"), 250);
}

/** Applies the last used appearance before the first paint (settings load a moment later). */
export function applyCachedAppearance(): void {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    // First launch: paint the default look right away, before settings load.
    if (!raw) return paint(DEFAULT_APPEARANCE);
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

/**
 * Bump when the default look changes and everyone should be moved to it
 * once (people who installed earlier still have the old colours saved).
 */
const COLOURS_REVISION = "2";
const REVISION_KEY = "sentutility.coloursRevision";

/**
 * True exactly once per computer after a default-colours change: the caller
 * then applies DEFAULT_APPEARANCE. Picks made afterwards are left alone.
 */
export function takeColoursMigration(): boolean {
  try {
    if (localStorage.getItem(REVISION_KEY) === COLOURS_REVISION) return false;
    localStorage.setItem(REVISION_KEY, COLOURS_REVISION);
    return true;
  } catch {
    // Can't remember it: don't keep resetting people's colours on every launch.
    return false;
  }
}
