import { type ReactNode, useEffect } from "react";
import { X } from "./icons";
import { classNames } from "../../utils/format";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  widthClassName?: string;
}

export function Modal({ open, onClose, title, children, widthClassName = "max-w-lg" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div data-overlay className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={classNames(
          "ff-card w-full mx-4 shadow-2xl shadow-black/40 max-h-[85vh] overflow-y-auto",
          widthClassName,
        )}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4 sticky top-0 bg-surface-1">
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="ff-btn-ghost p-1.5 rounded-md" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
