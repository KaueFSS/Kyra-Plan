import { useEffect } from "react";
import { Sparkles, X } from "../ui/icons";
import { useUpdateStore } from "../../stores/updateStore";

const FIRST_CHECK_DELAY_MS = 8_000;
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;

/** Checks for a new version shortly after launch and every few hours after. */
export function useAutoUpdateCheck() {
  const { loadVersion, checkForUpdates } = useUpdateStore();
  useEffect(() => {
    void loadVersion();
    const first = setTimeout(() => void checkForUpdates({ silent: true }), FIRST_CHECK_DELAY_MS);
    const every = setInterval(() => void checkForUpdates({ silent: true }), CHECK_EVERY_MS);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, [loadVersion, checkForUpdates]);
}

function megabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Bottom-right card that offers a new version, then shows the download and
 * install. Stays out of the way: "Depois" hides it until the next launch.
 */
export function UpdateToast() {
  const { status, currentVersion, dismissedVersion, install, dismiss } = useUpdateStore();

  const visible =
    (status.kind === "available" && status.version !== dismissedVersion) || status.kind === "downloading" || status.kind === "installing";
  if (!visible) return null;

  const progress =
    status.kind === "downloading" && status.total ? Math.min(1, status.downloaded / status.total) : status.kind === "installing" ? 1 : null;

  return (
    <div className="fixed bottom-4 right-4 z-[70] w-[22rem] overflow-hidden rounded-2xl border border-border-strong bg-surface-1 shadow-2xl shadow-black/50">
      <div className="flex items-start gap-3 p-4">
        <img src="/app-icon.svg" alt="" className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          {status.kind === "available" && (
            <>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                <Sparkles size={14} className="text-accent-400" /> Nova versão disponível
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                SentUtility <span className="font-semibold text-text-secondary">{status.version}</span>
                {currentVersion && <> · você está na {currentVersion}</>}
              </p>
              {status.notes && <p className="mt-2 line-clamp-3 whitespace-pre-line text-xs text-text-secondary">{status.notes}</p>}
            </>
          )}
          {status.kind === "downloading" && (
            <>
              <p className="text-sm font-semibold text-text-primary">Baixando a versão {status.version}…</p>
              <p className="mt-0.5 text-xs tabular-nums text-text-muted">
                {megabytes(status.downloaded)}
                {status.total ? ` de ${megabytes(status.total)}` : ""}
              </p>
            </>
          )}
          {status.kind === "installing" && (
            <>
              <p className="text-sm font-semibold text-text-primary">Instalando a versão {status.version}…</p>
              <p className="mt-0.5 text-xs text-text-muted">O SentUtility vai reabrir sozinho em instantes.</p>
            </>
          )}
        </div>
        {status.kind === "available" && (
          <button onClick={dismiss} className="rounded-md p-1 text-text-muted hover:bg-surface-2 hover:text-text-primary" aria-label="Fechar">
            <X size={14} />
          </button>
        )}
      </div>

      {status.kind === "available" ? (
        <div className="flex gap-2 border-t border-border-subtle px-4 py-3">
          <button className="ff-btn-ghost flex-1 py-1.5 text-xs" onClick={dismiss}>
            Depois
          </button>
          <button className="ff-btn-primary flex-1 py-1.5 text-xs" onClick={() => void install()}>
            Atualizar agora
          </button>
        </div>
      ) : (
        <div className="h-1 bg-surface-3">
          <div
            className={progress === null ? "h-full w-1/3 animate-pulse bg-accent-500" : "h-full bg-accent-500 transition-[width] duration-300"}
            style={progress === null ? undefined : { width: `${progress * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
