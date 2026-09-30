import { create } from "zustand";
import { isTauri } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdateStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "up-to-date"; checkedAt: number }
  | { kind: "available"; version: string; notes: string; date: string | null }
  | { kind: "downloading"; version: string; downloaded: number; total: number | null }
  | { kind: "installing"; version: string }
  | { kind: "error"; message: string };

interface UpdateState {
  status: UpdateStatus;
  currentVersion: string | null;
  /** Version the user said "depois" to; the toast stays hidden for it until the next launch. */
  dismissedVersion: string | null;
  loadVersion: () => Promise<void>;
  /** `silent` checks (startup / periodic) never surface errors or "up to date". */
  checkForUpdates: (options?: { silent?: boolean }) => Promise<void>;
  install: () => Promise<void>;
  dismiss: () => void;
}

// The Update handle isn't serialisable state, so it lives beside the store.
let pending: Update | null = null;

export const useUpdateStore = create<UpdateState>((set, get) => ({
  status: { kind: "idle" },
  currentVersion: null,
  dismissedVersion: null,

  loadVersion: async () => {
    if (!isTauri()) return;
    set({ currentVersion: await getVersion() });
  },

  checkForUpdates: async ({ silent = false } = {}) => {
    if (!isTauri()) return;
    const busy = get().status.kind;
    if (busy === "checking" || busy === "downloading" || busy === "installing") return;

    set({ status: { kind: "checking" } });
    try {
      const update = await check();
      pending = update;
      if (update) {
        set({ status: { kind: "available", version: update.version, notes: update.body ?? "", date: update.date ?? null } });
      } else {
        set({ status: { kind: "up-to-date", checkedAt: Date.now() } });
      }
    } catch (err) {
      // Offline, no release published yet, GitHub hiccup: never nag on a background check.
      set({ status: silent ? { kind: "idle" } : { kind: "error", message: describeError(err) } });
    }
  },

  install: async () => {
    const update = pending;
    if (!update) return;
    const version = update.version;
    let downloaded = 0;
    let total: number | null = null;

    try {
      set({ status: { kind: "downloading", version, downloaded: 0, total: null } });
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") total = event.data.contentLength ?? null;
        if (event.event === "Progress") downloaded += event.data.chunkLength;
        if (event.event === "Finished") set({ status: { kind: "installing", version } });
        else set({ status: { kind: "downloading", version, downloaded, total } });
      });
      set({ status: { kind: "installing", version } });
      // On Windows the installer closes the app itself; elsewhere restart into the new version.
      await relaunch();
    } catch (err) {
      set({ status: { kind: "error", message: describeError(err) } });
    }
  },

  dismiss: () => {
    const status = get().status;
    if (status.kind === "available") set({ dismissedVersion: status.version });
  },
}));

function describeError(err: unknown): string {
  const text = typeof err === "string" ? err : err instanceof Error ? err.message : "";
  if (/network|dns|connect|timed? ?out|offline/i.test(text)) return "Sem conexão com a internet.";
  if (/signature/i.test(text)) return "A atualização não passou na verificação de assinatura e foi recusada.";
  if (/404|not found|valid release JSON/i.test(text)) return "Nenhuma versão publicada ainda.";
  return "Não foi possível verificar atualizações agora.";
}
