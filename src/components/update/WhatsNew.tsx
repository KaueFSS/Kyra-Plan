import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { Sparkles, X } from "../ui/icons";
import { useUpdateStore } from "../../stores/updateStore";
import { playSound } from "../../utils/sounds";
import { classNames } from "../../utils/format";
import changelog from "../../data/changelog.json";

export interface ChangelogEntry {
  version: string;
  date: string;
  added: string[];
}

export const CHANGELOG = changelog as ChangelogEntry[];
const SEEN_KEY = "sentutility.lastSeenVersion";

function readSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function markSeen(version: string) {
  try {
    localStorage.setItem(SEEN_KEY, version);
  } catch {
    // Worst case the window shows again next launch.
  }
}

/**
 * "O que há de novo": opens once after the app updates to a version that
 * has notes, and on demand from Settings (`openWhatsNew`).
 */
export function WhatsNew() {
  const currentVersion = useUpdateStore((s) => s.currentVersion);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!currentVersion) return;
    if (readSeen() !== currentVersion && CHANGELOG.some((e) => e.version === currentVersion)) setOpen(currentVersion);
  }, [currentVersion]);

  useEffect(() => {
    const onOpen = (e: Event) => setOpen((e as CustomEvent<string>).detail ?? CHANGELOG[0]?.version ?? null);
    window.addEventListener("sentutility:whats-new", onOpen);
    return () => window.removeEventListener("sentutility:whats-new", onOpen);
  }, []);

  useEffect(() => {
    if (open) playSound("open");
  }, [open]);

  if (!open) return null;

  const close = () => {
    if (currentVersion) markSeen(currentVersion);
    setOpen(null);
  };

  return (
    <div data-overlay className="fixed inset-0 z-[75] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" onClick={close}>
      <div
        className="ff-pop flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border-strong bg-surface-1 shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-4">
          <img src="/app-icon.svg" alt="" className="h-10 w-10 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-base font-semibold text-text-primary">
              <Sparkles size={15} className="text-accent-400" /> O que há de novo
            </p>
            <p className="text-xs text-text-muted">SentUtility {open}</p>
          </div>
          <button onClick={close} className="rounded-md p-1 text-text-muted hover:bg-surface-2 hover:text-text-primary" aria-label="Fechar">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {CHANGELOG.map((entry) => (
            <section key={entry.version} className={classNames(entry.version !== open && "opacity-70")}>
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Versão {entry.version}</h3>
                <span className="text-xs text-text-muted">{DateTime.fromISO(entry.date).setLocale("pt-BR").toFormat("d 'de' LLLL 'de' yyyy")}</span>
              </div>
              <ul className="space-y-1.5">
                {entry.added.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-snug text-text-secondary">
                    <span className="mt-[0.4rem] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="border-t border-border-subtle px-5 py-3">
          <button className="ff-btn-primary w-full py-2 text-sm" onClick={close}>
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}

/** Opens the window from anywhere (e.g. the Settings "Novidades" button). */
export function openWhatsNew(version?: string): void {
  window.dispatchEvent(new CustomEvent("sentutility:whats-new", { detail: version }));
}
