import { useMemo, useState } from "react";
import { Plus, Sparkles } from "./icons";
import { classNames } from "../../utils/format";
import { describeParsed, parseNatural, type ParsedInput } from "../../utils/naturalLanguage";

interface InlineAddProps {
  placeholder: string;
  /** Receives the raw text and what the natural-language parser understood. */
  onSubmit: (parsed: ParsedInput, raw: string) => Promise<void>;
  label?: string;
  compact?: boolean;
  /** Stay expanded as an input instead of collapsing to a "+ Adicionar" button. */
  alwaysOpen?: boolean;
  /** Override which understood parts are shown (e.g. hide days where they don't apply). */
  describe?: (parsed: ParsedInput) => string[];
  /** Alarms, for instance, can be just a time with no name. */
  requireTitle?: boolean;
}

/**
 * The standard quick-create field used everywhere in the HUD: type a phrase
 * like "Academia seg qua 18h", see what was understood as chips, press Enter.
 */
export function InlineAdd({
  placeholder,
  onSubmit,
  label = "Adicionar",
  compact = false,
  alwaysOpen = false,
  describe,
  requireTitle = true,
}: InlineAddProps) {
  const [open, setOpen] = useState(alwaysOpen);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => parseNatural(text), [text]);
  const chips = text.trim() ? (describe ?? describeParsed)(parsed) : [];

  const submit = async () => {
    if (!text.trim() || busy) return;
    if (requireTitle && !parsed.title) return setError("Falta o nome.");
    setBusy(true);
    setError(null);
    try {
      await onSubmit(parsed, text);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={classNames(
          "flex w-full items-center gap-1.5 rounded-lg border border-dashed border-border-subtle text-text-muted transition-colors hover:border-accent-500 hover:text-accent-400",
          compact ? "justify-center py-1 text-[0.75rem]" : "px-2.5 py-1.5 text-xs",
        )}
        aria-label={label}
        title={label}
      >
        <Plus size={compact ? 12 : 13} /> {!compact && label}
      </button>
    );
  }

  return (
    <div
      className="space-y-1"
      onBlur={(e) => {
        if (!alwaysOpen && !e.currentTarget.contains(e.relatedTarget as Node | null) && !text) setOpen(false);
      }}
    >
      <div className="relative">
        <Sparkles size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-accent-400/70" />
        <input
          autoFocus={!alwaysOpen}
          value={text}
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
            if (e.key === "Escape") {
              setText("");
              if (!alwaysOpen) setOpen(false);
            }
          }}
          className={classNames("ff-input w-full py-1.5 pl-6 pr-2", compact ? "text-[0.75rem]" : "text-xs")}
        />
      </div>
      {(chips.length > 0 || error) && (
        <div className="flex flex-wrap items-center gap-1 px-0.5">
          {error ? (
            <span className="text-[0.75rem] text-danger">{error}</span>
          ) : (
            <>
              {parsed.title && <span className="max-w-full truncate text-[0.75rem] font-medium text-text-secondary">{parsed.title}</span>}
              {chips.map((chip) => (
                <span key={chip} className="rounded bg-accent-500/15 px-1.5 py-px text-[0.6875rem] font-semibold text-accent-400">
                  {chip}
                </span>
              ))}
              <span className="ml-auto text-[0.6875rem] text-text-muted">Enter ↵</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
