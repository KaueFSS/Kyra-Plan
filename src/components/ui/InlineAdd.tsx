import { useMemo, useRef, useState } from "react";
import { Clock, Plus, Sparkles } from "./icons";
import { classNames } from "../../utils/format";
import { describeParsed, parseNatural, type ParsedInput } from "../../utils/naturalLanguage";
import { chipsFor, ghostFor, matchSuggestions, suggestionText, topSuggestions, type SmartKind, type SuggestionItem } from "../../utils/smartSuggest";
import { useSuggestionPool } from "../../hooks/useSuggestionPool";

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
  /** What this field creates: picks the shortcuts and the history it predicts from. */
  kind?: SmartKind;
}

/**
 * The standard quick-create field used everywhere in the HUD. Type a phrase
 * in Portuguese or English ("Academia seg qua 18h", "Call mom tomorrow 3pm"),
 * see what was understood, press Enter. It also helps along the way:
 *  - completes what you type from things you've added before (Tab or →),
 *  - lists matching past entries with the time and days they usually had,
 *  - offers recents when empty,
 *  - shows one-click shortcuts (hours, days, length) for what's still missing.
 */
export function InlineAdd({
  placeholder,
  onSubmit,
  label = "Adicionar",
  compact = false,
  alwaysOpen = false,
  describe,
  requireTitle = true,
  kind = "task",
}: InlineAddProps) {
  const [open, setOpen] = useState(alwaysOpen);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [dismissed, setDismissed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pool = useSuggestionPool(kind);
  const parsed = useMemo(() => parseNatural(text), [text]);
  const chips = text.trim() ? (describe ?? describeParsed)(parsed) : [];

  // Predictions only while the title is still being typed (no time/days/date yet).
  const hasDetails = !!(parsed.startTime || parsed.days.length || parsed.date || parsed.durationMinutes || parsed.recurrence || parsed.priority);
  const typing = text.trim().length > 0;
  const matches: SuggestionItem[] = useMemo(() => {
    if (!focused || dismissed || hasDetails) return [];
    return typing ? matchSuggestions(parsed.title || text, pool, compact ? 3 : 4) : topSuggestions(pool, compact ? 3 : 4);
  }, [focused, dismissed, hasDetails, typing, parsed.title, text, pool, compact]);
  const showingRecents = !typing && matches.length > 0;
  const ghost = focused && !dismissed && !hasDetails ? ghostFor(text, pool) : null;
  const shortcuts = focused && typing && parsed.title ? chipsFor(kind, parsed) : [];

  const fill = (value: string) => {
    setText(value + " ");
    setError(null);
    setHighlight(-1);
    setDismissed(false);
    inputRef.current?.focus();
  };
  const accept = (item: SuggestionItem) => fill(suggestionText(item));

  const submit = async () => {
    if (!text.trim() || busy) return;
    if (requireTitle && !parsed.title) return setError("Falta o nome.");
    setBusy(true);
    setError(null);
    try {
      await onSubmit(parsed, text);
      setText("");
      setHighlight(-1);
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

  const textSize = compact ? "text-[0.75rem]" : "text-xs";

  return (
    <div
      className="space-y-1"
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        setFocused(false);
        setHighlight(-1);
        if (!alwaysOpen && !text) setOpen(false);
      }}
    >
      <div className="relative rounded-lg bg-surface-2">
        <Sparkles size={12} className="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 text-accent-400/70" />
        {/* Ghost completion: the rest of a past entry, in muted text right after what's typed. */}
        {ghost && (
          <div className={classNames("pointer-events-none absolute inset-0 flex items-center border border-transparent py-1.5 pl-6 pr-2", textSize)} aria-hidden>
            <span className="invisible whitespace-pre">{text}</span>
            <span className="whitespace-pre text-text-muted/60">{ghost.rest}</span>
            <span className="ml-2 rounded bg-surface-3 px-1 text-[0.625rem] font-semibold text-text-muted">Tab</span>
          </div>
        )}
        <input
          ref={inputRef}
          autoFocus={!alwaysOpen}
          value={text}
          placeholder={placeholder}
          spellCheck={false}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
            setHighlight(-1);
            setDismissed(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && matches.length) {
              e.preventDefault();
              setHighlight((h) => (h + 1) % matches.length);
            } else if (e.key === "ArrowUp" && matches.length) {
              e.preventDefault();
              setHighlight((h) => (h <= 0 ? matches.length - 1 : h - 1));
            } else if (e.key === "Tab" && !e.shiftKey && (highlight >= 0 || ghost)) {
              e.preventDefault();
              accept(highlight >= 0 ? matches[highlight] : ghost!.item);
            } else if (e.key === "ArrowRight" && ghost && inputRef.current?.selectionStart === text.length) {
              e.preventDefault();
              fill(ghost.item.title);
            } else if (e.key === "Enter") {
              if (highlight >= 0 && matches[highlight]) accept(matches[highlight]);
              else void submit();
            } else if (e.key === "Escape") {
              if (matches.length || ghost) {
                setDismissed(true);
                setHighlight(-1);
              } else {
                setText("");
                if (!alwaysOpen) setOpen(false);
              }
            }
          }}
          className={classNames("ff-input w-full bg-transparent py-1.5 pl-6 pr-2", textSize)}
        />
      </div>

      {matches.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border-subtle bg-surface-2/60" role="listbox">
          {showingRecents && <p className="px-2 pt-1.5 text-[0.625rem] font-semibold uppercase tracking-wider text-text-muted">Recentes</p>}
          {matches.map((item, i) => {
            const detail = item.details ? describeParsed(parseNatural(item.details)).join(" · ") : "";
            return (
              <button
                key={item.title}
                role="option"
                aria-selected={i === highlight}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => accept(item)}
                onMouseEnter={() => setHighlight(i)}
                className={classNames(
                  "flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors",
                  i === highlight ? "bg-accent-500/15" : "hover:bg-surface-3",
                )}
              >
                {showingRecents && <Clock size={12} className="shrink-0 text-text-muted" />}
                <span className={classNames("min-w-0 flex-1 truncate font-medium text-text-primary", textSize)}>{item.title}</span>
                {detail && <span className="shrink-0 truncate text-[0.6875rem] tabular-nums text-text-muted">{detail}</span>}
              </button>
            );
          })}
        </div>
      )}

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

      {shortcuts.length > 0 && (
        <div className="flex flex-wrap gap-1 px-0.5">
          {shortcuts.map((chip) => (
            <button
              key={chip.label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => fill(text.trimEnd() + " " + chip.insert)}
              className="rounded-md border border-border-subtle px-1.5 py-px text-[0.6875rem] text-text-secondary transition-colors hover:border-accent-500 hover:text-accent-400"
            >
              + {chip.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
