import { DateTime } from "luxon";
import { Check, RotateCcw, Sparkles } from "../ui/icons";
import { useUpdateStore } from "../../stores/updateStore";

/** Settings card: current version, update status and a manual check. */
export function AboutSection() {
  const { status, currentVersion, checkForUpdates, install } = useUpdateStore();
  const busy = status.kind === "checking" || status.kind === "downloading" || status.kind === "installing";

  let line: React.ReactNode;
  switch (status.kind) {
    case "checking":
      line = "Procurando atualizações…";
      break;
    case "up-to-date":
      line = (
        <span className="flex items-center gap-1 text-success">
          <Check size={13} strokeWidth={3} /> Você está na versão mais recente · verificado {DateTime.fromMillis(status.checkedAt).setLocale("pt-BR").toRelative()}
        </span>
      );
      break;
    case "available":
      line = (
        <span className="flex items-center gap-1 font-medium text-accent-400">
          <Sparkles size={13} /> Versão {status.version} disponível
        </span>
      );
      break;
    case "downloading":
      line = `Baixando a versão ${status.version}…`;
      break;
    case "installing":
      line = `Instalando a versão ${status.version}…`;
      break;
    case "error":
      line = <span className="text-danger">{status.message}</span>;
      break;
    default:
      line = "O app procura atualizações sozinho ao abrir e a cada 6 horas.";
  }

  return (
    <div className="ff-card flex items-center gap-4 p-5">
      <img src="/app-icon.svg" alt="" className="h-14 w-14 shrink-0 rounded-2xl" />
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-text-primary">
          SentUtility <span className="ml-1 text-sm font-medium text-text-muted">{currentVersion ? `versão ${currentVersion}` : "modo navegador"}</span>
        </p>
        <div className="mt-0.5 text-xs text-text-muted">{line}</div>
      </div>
      {status.kind === "available" ? (
        <button className="ff-btn-primary px-3 py-1.5 text-xs" onClick={() => void install()}>
          Atualizar agora
        </button>
      ) : (
        <button className="ff-btn-secondary px-3 py-1.5 text-xs" disabled={busy || !currentVersion} onClick={() => void checkForUpdates()}>
          <RotateCcw size={13} /> Procurar atualizações
        </button>
      )}
    </div>
  );
}
