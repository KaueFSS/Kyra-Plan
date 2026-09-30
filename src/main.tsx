import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// Bundled with the app (not fetched from the web) so the typeface is the
// same on every machine and works offline.
import "@fontsource-variable/inter/index.css";
import "./styles/index.css";
import { applyCachedAppearance } from "./utils/appearance";

applyCachedAppearance();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
