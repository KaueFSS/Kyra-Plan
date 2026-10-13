/**
 * Small UI sounds, synthesised with the Web Audio API — no audio files,
 * works offline, a few milliseconds each. Tuned to be soft and short so they
 * feel satisfying rather than noisy. Preferences live in localStorage (a
 * per-computer convenience): master on/off, volume, and button clicks.
 */

export type SoundName =
  | "click"
  | "complete"
  | "uncomplete"
  | "add"
  | "remove"
  | "drop"
  | "start"
  | "pause"
  | "celebrate"
  | "error"
  | "open";

export interface SoundPrefs {
  enabled: boolean;
  clicks: boolean;
  /** 0 … 1 */
  volume: number;
}

const PREFS_KEY = "sentutility.sounds";
const DEFAULT_PREFS: SoundPrefs = { enabled: true, clicks: true, volume: 0.6 };

export function getSoundPrefs(): SoundPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<SoundPrefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function setSoundPrefs(prefs: SoundPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Not persisted; the choice still applies for this session.
  }
  cached = prefs;
}

let cached: SoundPrefs | null = null;
let context: AudioContext | null = null;
let lastPlayed = new Map<SoundName, number>();

function audio(): AudioContext | null {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    return context;
  } catch {
    return null;
  }
}

interface Note {
  freq: number;
  /** Seconds from now. */
  at?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  /** Glide to this frequency over the note. */
  to?: number;
}

function play(notes: Note[], volume: number) {
  const ctx = audio();
  if (!ctx) return;
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);
  const t0 = ctx.currentTime + 0.005;
  for (const n of notes) {
    const start = t0 + (n.at ?? 0);
    const dur = n.dur ?? 0.12;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.setValueAtTime(n.freq, start);
    if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, start + dur);
    // Quick attack, smooth exponential tail: reads as a "pluck", never a beep.
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(n.gain ?? 0.2, start + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(env).connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }
}

const SOUNDS: Record<SoundName, Note[]> = {
  // A tiny, dry tick — the "physical button" feel.
  click: [{ freq: 1900, to: 1200, dur: 0.035, type: "triangle", gain: 0.06 }],
  // Two rising notes: "done!".
  complete: [
    { freq: 784, dur: 0.12, type: "sine", gain: 0.18 },
    { freq: 1175, at: 0.075, dur: 0.22, type: "sine", gain: 0.16 },
  ],
  uncomplete: [{ freq: 660, to: 440, dur: 0.14, type: "sine", gain: 0.12 }],
  // Bubbly pop for something new.
  add: [
    { freq: 520, to: 1040, dur: 0.09, type: "sine", gain: 0.16 },
    { freq: 1560, at: 0.05, dur: 0.06, type: "triangle", gain: 0.05 },
  ],
  remove: [{ freq: 360, to: 160, dur: 0.16, type: "sine", gain: 0.16 }],
  // Soft "thock" when something lands.
  drop: [
    { freq: 300, to: 180, dur: 0.07, type: "sine", gain: 0.2 },
    { freq: 1400, dur: 0.025, type: "triangle", gain: 0.04 },
  ],
  start: [
    { freq: 523, dur: 0.1, gain: 0.14 },
    { freq: 784, at: 0.07, dur: 0.16, gain: 0.14 },
  ],
  pause: [
    { freq: 784, dur: 0.1, gain: 0.12 },
    { freq: 523, at: 0.07, dur: 0.16, gain: 0.12 },
  ],
  // Little arpeggio for a completed day.
  celebrate: [
    { freq: 523, dur: 0.16, gain: 0.14 },
    { freq: 659, at: 0.08, dur: 0.16, gain: 0.14 },
    { freq: 784, at: 0.16, dur: 0.18, gain: 0.14 },
    { freq: 1047, at: 0.24, dur: 0.42, gain: 0.15 },
    { freq: 2093, at: 0.24, dur: 0.3, type: "triangle", gain: 0.03 },
  ],
  error: [
    { freq: 220, dur: 0.09, type: "triangle", gain: 0.14 },
    { freq: 196, at: 0.1, dur: 0.14, type: "triangle", gain: 0.14 },
  ],
  open: [{ freq: 880, to: 1320, dur: 0.07, type: "sine", gain: 0.07 }],
};

/** Plays a UI sound if sounds are on. Rapid repeats of the same sound are merged. */
export function playSound(name: SoundName): void {
  const prefs = (cached ??= getSoundPrefs());
  if (!prefs.enabled || prefs.volume <= 0) return;
  if (name === "click" && !prefs.clicks) return;
  const now = performance.now();
  if (now - (lastPlayed.get(name) ?? 0) < 45) return;
  lastPlayed.set(name, now);
  play(SOUNDS[name], prefs.volume);
}

/** For tests and the settings preview. */
export function resetSoundCache(): void {
  cached = null;
  lastPlayed = new Map();
}
