import { create } from "zustand";
import { dashboardService } from "../services/dashboardService";
import { HOME_LAYOUT, findFreeSpot, parseLayout } from "../utils/gridLayout";
import { ApiError } from "../services/tauri";
import { useTaskListStore } from "./taskListStore";
import { PALETTE } from "../components/ui/FormControls";
import type { DashboardTab, DashboardTabRecord, WidgetPlacement, WidgetType } from "../types/dashboard";

const ACTIVE_TAB_KEY = "focusflow.activeTab";
const SAVE_DELAY_MS = 400;

function toTab(record: DashboardTabRecord): DashboardTab {
  return { id: record.id, name: record.name, position: record.position, widgets: parseLayout(record.layout) };
}

function rememberActive(id: string) {
  try {
    localStorage.setItem(ACTIVE_TAB_KEY, id);
  } catch {
    // Remembering the last tab is a convenience; losing it is harmless.
  }
}

function recallActive(): string | null {
  try {
    return localStorage.getItem(ACTIVE_TAB_KEY);
  } catch {
    return null;
  }
}

const pendingSaves = new Map<string, ReturnType<typeof setTimeout>>();

interface DashboardState {
  tabs: DashboardTab[];
  activeTabId: string;
  editing: boolean;
  loaded: boolean;

  load: () => Promise<void>;
  setActive: (id: string) => void;
  setEditing: (editing: boolean) => void;
  createTab: (name: string, widgets: WidgetPlacement[]) => Promise<void>;
  renameTab: (id: string, name: string) => Promise<void>;
  deleteTab: (id: string) => Promise<void>;
  reorderTabs: (orderedIds: string[]) => Promise<void>;
  /** Brings the default "Início" tab back (at the front) after it was deleted, and opens it. */
  restoreHome: () => Promise<void>;
  /** Replaces a tab's widgets locally right away and saves shortly after (debounced). */
  setWidgets: (id: string, widgets: WidgetPlacement[]) => void;
  /** Adds a widget at the first free spot; returns an error message if the tab is full. */
  addWidget: (type: WidgetType, extra?: Pick<WidgetPlacement, "listId">) => string | null;
  /**
   * Adds another to-do list widget, showing a list that isn't on this tab
   * yet — or a brand-new list when every list is already shown.
   */
  addTaskListWidget: () => Promise<string | null>;
  /** Points a "tasks" widget at another list. */
  setWidgetList: (widgetId: string, listId: string) => void;
  removeWidget: (widgetId: string) => void;
  resetHome: () => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  tabs: [],
  activeTabId: "home",
  editing: false,
  loaded: false,

  load: async () => {
    let tabs: DashboardTab[];
    try {
      tabs = (await dashboardService.listTabs()).map(toTab);
    } catch {
      tabs = [];
    }
    // Never leave the HUD empty: fall back to the default "Início" layout.
    if (tabs.length === 0) tabs = [{ id: "home", name: "Início", position: 0, widgets: HOME_LAYOUT }];
    const remembered = recallActive();
    const activeTabId = tabs.some((t) => t.id === remembered) ? remembered! : (tabs[0]?.id ?? "home");
    set({ tabs, activeTabId, loaded: true });
  },

  setActive: (id) => {
    rememberActive(id);
    set({ activeTabId: id, editing: false });
  },

  setEditing: (editing) => set({ editing }),

  createTab: async (name, widgets) => {
    const created = toTab(await dashboardService.createTab(name, widgets));
    rememberActive(created.id);
    // A brand-new blank tab opens straight into edit mode so it can be filled.
    set({ tabs: [...get().tabs, created], activeTabId: created.id, editing: widgets.length === 0 });
  },

  renameTab: async (id, name) => {
    const tab = get().tabs.find((t) => t.id === id);
    if (!tab || !name.trim() || name.trim() === tab.name) return;
    const updated = toTab(await dashboardService.updateTab(id, name.trim(), tab.widgets));
    set({ tabs: get().tabs.map((t) => (t.id === id ? updated : t)) });
  },

  deleteTab: async (id) => {
    await dashboardService.deleteTab(id);
    const tabs = get().tabs.filter((t) => t.id !== id);
    const activeTabId = get().activeTabId === id ? (tabs[0]?.id ?? "home") : get().activeTabId;
    rememberActive(activeTabId);
    set({ tabs, activeTabId, editing: false });
  },

  reorderTabs: async (orderedIds) => {
    const byId = new Map(get().tabs.map((t) => [t.id, t]));
    set({ tabs: orderedIds.map((id) => byId.get(id)).filter((t): t is DashboardTab => !!t) });
    try {
      await dashboardService.reorderTabs(orderedIds);
    } catch {
      await get().load();
    }
  },

  restoreHome: async () => {
    await dashboardService.restoreHome();
    await get().load();
    get().setActive("home");
  },

  setWidgets: (id, widgets) => {
    const tab = get().tabs.find((t) => t.id === id);
    if (!tab) return;
    set({ tabs: get().tabs.map((t) => (t.id === id ? { ...t, widgets } : t)) });

    const existing = pendingSaves.get(id);
    if (existing) clearTimeout(existing);
    pendingSaves.set(
      id,
      setTimeout(() => {
        pendingSaves.delete(id);
        // Read the name at save time so a rename in between isn't reverted.
        const name = get().tabs.find((t) => t.id === id)?.name ?? tab.name;
        void dashboardService.updateTab(id, name, widgets).catch(() => get().load());
      }, SAVE_DELAY_MS),
    );
  },

  addWidget: (type, extra) => {
    const tab = get().tabs.find((t) => t.id === get().activeTabId);
    if (!tab) return "Guia não encontrada.";
    // To-do lists may repeat (each copy shows its own list); everything else once per tab.
    if (type !== "tasks" && tab.widgets.some((w) => w.type === type)) return "Esse widget já está nesta guia.";
    const spot = findFreeSpot(tab.widgets, type);
    if (!spot) return "Sem espaço livre — diminua ou remova um widget.";
    get().setWidgets(tab.id, [...tab.widgets, { i: `${type}-${Date.now().toString(36)}`, type, ...spot, ...extra }]);
    return null;
  },

  addTaskListWidget: async () => {
    const tab = get().tabs.find((t) => t.id === get().activeTabId);
    if (!tab) return "Guia não encontrada.";
    if (!findFreeSpot(tab.widgets, "tasks")) return "Sem espaço livre — diminua ou remova um widget.";

    const listStore = useTaskListStore.getState();
    if (!listStore.loaded) await listStore.load();
    const lists = useTaskListStore.getState().lists;
    const shown = new Set(tab.widgets.filter((w) => w.type === "tasks").map((w) => w.listId ?? lists[0]?.id));
    let listId = lists.find((l) => !shown.has(l.id))?.id;
    if (!listId) {
      const created = await listStore.create(`Lista ${lists.length + 1}`, PALETTE[lists.length % PALETTE.length]);
      if (!created) return "Não foi possível criar a lista.";
      listId = created.id;
    }
    return get().addWidget("tasks", { listId });
  },

  setWidgetList: (widgetId, listId) => {
    const tab = get().tabs.find((t) => t.widgets.some((w) => w.i === widgetId));
    if (!tab) return;
    get().setWidgets(tab.id, tab.widgets.map((w) => (w.i === widgetId ? { ...w, listId } : w)));
  },

  removeWidget: (widgetId) => {
    const tab = get().tabs.find((t) => t.id === get().activeTabId);
    if (!tab) return;
    get().setWidgets(tab.id, tab.widgets.filter((w) => w.i !== widgetId));
  },

  resetHome: () => get().setWidgets("home", HOME_LAYOUT),
}));

export function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : "Algo deu errado.";
}
