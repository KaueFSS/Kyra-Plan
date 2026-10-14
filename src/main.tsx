import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// Bundled with the app (not fetched from the web) so the typeface is the
// same on every machine and works offline.
import "@fontsource-variable/inter/index.css";
import "./styles/index.css";
import { applyCachedAppearance, takeColoursMigration } from "./utils/appearance";
import { isDemo } from "./services/tauri";
import { useUiStore, type Page } from "./stores/uiStore";

applyCachedAppearance();

// In the browser demo a link can open straight on a page or tab: ?page=calendar&tab=estudos
if (isDemo) {
  // The demo starts with its own colours: never run the "move to new defaults" step on them.
  takeColoursMigration();
  const params = new URLSearchParams(window.location.search);
  const page = params.get("page");
  if (page) useUiStore.getState().setPage(page as Page);
  const tab = params.get("tab");
  if (tab) {
    try {
      localStorage.setItem("focusflow.activeTab", tab);
    } catch {
      // Only a convenience for the demo link.
    }
  }
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
