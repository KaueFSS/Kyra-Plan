import { Check, Sparkles, X } from "../ui/icons";
import { useToastStore } from "../../stores/toastStore";
import { classNames } from "../../utils/format";

/** Bottom-centre stack of short messages (errors, confirmations). */
export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={classNames(
            "ff-pop pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm shadow-2xl shadow-black/40",
            toast.tone === "error" && "border-danger/40 bg-surface-1 text-text-primary",
            toast.tone === "success" && "border-success/40 bg-surface-1 text-text-primary",
            toast.tone === "info" && "border-border-strong bg-surface-1 text-text-primary",
          )}
        >
          <span
            className={classNames(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
              toast.tone === "error" && "bg-danger/15 text-danger",
              toast.tone === "success" && "bg-success/15 text-success",
              toast.tone === "info" && "bg-accent-500/15 text-accent-400",
            )}
          >
            {toast.tone === "error" ? <X size={13} strokeWidth={3} /> : toast.tone === "success" ? <Check size={13} strokeWidth={3} /> : <Sparkles size={13} />}
          </span>
          <span className="min-w-0 flex-1">{toast.message}</span>
          <button onClick={() => dismiss(toast.id)} className="rounded p-0.5 text-text-muted hover:text-text-primary" aria-label="Fechar">
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
