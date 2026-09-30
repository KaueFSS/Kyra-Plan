import { invoke } from "./tauri";
import type { DashboardTabRecord, WidgetPlacement } from "../types/dashboard";

export const dashboardService = {
  listTabs: () => invoke<DashboardTabRecord[]>("list_dashboard_tabs"),
  createTab: (name: string, widgets: WidgetPlacement[]) =>
    invoke<DashboardTabRecord>("create_dashboard_tab", { name, layout: JSON.stringify(widgets) }),
  updateTab: (id: string, name: string, widgets: WidgetPlacement[]) =>
    invoke<DashboardTabRecord>("update_dashboard_tab", { id, name, layout: JSON.stringify(widgets) }),
  deleteTab: (id: string) => invoke<void>("delete_dashboard_tab", { id }),
  reorderTabs: (orderedIds: string[]) => invoke<void>("reorder_dashboard_tabs", { orderedIds }),
  restoreHome: () => invoke<DashboardTabRecord>("restore_home_tab"),
};
