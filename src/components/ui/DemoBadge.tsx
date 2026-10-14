import { isDemo } from "../../services/tauri";

/** Shown only in the browser demo, so nobody mistakes it for the installed app. */
export function DemoBadge() {
  if (!isDemo || new URLSearchParams(window.location.search).has("shot")) return null;
  return (
    <a
      href="https://github.com/KaueFSS/SentUtility/releases/latest"
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-12 right-3 z-50 rounded-full border border-border-subtle bg-surface-2/95 px-3 py-1.5 text-[0.75rem] text-text-secondary shadow-lg backdrop-blur transition-colors hover:text-text-primary"
      title="Baixar o instalador para Windows"
    >
      Demonstração no navegador · os dados não são salvos · <span className="font-semibold text-accent-400">baixar o app</span>
    </a>
  );
}
