import { create } from "zustand";
import { ApiError } from "../services/tauri";
import { playSound } from "../utils/sounds";

export type ToastTone = "error" | "success" | "info";

export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
}

const LIFETIME_MS = 4500;
let nextId = 1;

/** Short messages at the bottom of the screen — so a refused action never fails silently. */
export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  show: (message, tone = "info") => {
    const id = nextId++;
    // Same message already showing? Don't stack duplicates.
    if (get().toasts.some((t) => t.message === message)) return;
    set({ toasts: [...get().toasts.slice(-2), { id, tone, message }] });
    setTimeout(() => get().dismiss(id), LIFETIME_MS);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

/** Shows the backend's own message for an ApiError, or a fallback. */
export function reportError(err: unknown, fallback: string): void {
  playSound("error");
  useToastStore.getState().show(err instanceof ApiError ? err.message : fallback, "error");
}
