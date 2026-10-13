import { create } from "zustand";
import { settingsService, type Settings, type UpdateSettingsInput } from "../services/settingsService";
import { appearanceFromSettings, applyAppearance, encodeAccentSetting, previewAppearance, type Appearance } from "../utils/appearance";

const APPEARANCE_SAVE_DELAY_MS = 350;
let appearanceSaveTimer: ReturnType<typeof setTimeout> | undefined;
/** Choices made while the picker is still moving, not yet committed to state. */
let pendingAppearance: Appearance | null = null;

interface SettingsState {
  settings: Settings | null;
  loading: boolean;
  load: () => Promise<void>;
  update: (input: UpdateSettingsInput) => Promise<void>;
  /** Repaints the app right away and saves shortly after (so dragging a colour picker is cheap). */
  setAppearance: (patch: Partial<Appearance>) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: false,

  load: async () => {
    set({ loading: true });
    const settings = await settingsService.get();
    set({ settings, loading: false });
  },

  update: async (input) => {
    const settings = await settingsService.update(input);
    set({ settings });
  },

  setAppearance: (patch) => {
    const current = get().settings;
    if (!current) return;
    const next = { ...(pendingAppearance ?? appearanceFromSettings(current)), ...patch };
    pendingAppearance = next;
    // Only the CSS variables change while you drag — no React re-render, no save.
    previewAppearance(next);

    clearTimeout(appearanceSaveTimer);
    appearanceSaveTimer = setTimeout(async () => {
      const settled = pendingAppearance;
      pendingAppearance = null;
      const base = get().settings;
      if (!settled || !base) return;
      applyAppearance(settled);
      const latest = { ...base, theme: settled.mode, accentColor: encodeAccentSetting(settled) };
      set({ settings: latest });
      try {
        await settingsService.update(settingsToUpdateInput(latest));
      } catch {
        await get().load();
      }
    }, APPEARANCE_SAVE_DELAY_MS);
  },
}));

export function settingsToUpdateInput(settings: Settings): UpdateSettingsInput {
  const { updatedAt, ...rest } = settings;
  void updatedAt;
  return rest;
}
