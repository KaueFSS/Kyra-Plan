import { useEffect, useRef, useState } from "react";
import { Search, CheckSquare, CalendarDays, AlarmClock, CalendarClock } from "../ui/icons";
import { useUiStore } from "../../stores/uiStore";
import { searchService, type SearchResult, type SearchResultKind } from "../../services/searchService";
import { classNames } from "../../utils/format";

const ICONS: Record<SearchResultKind, typeof CheckSquare> = {
  task: CheckSquare,
  event: CalendarDays,
  alarm: AlarmClock,
  schedule_block: CalendarClock,
};

export function GlobalSearch() {
  const { searchOpen, closeSearch, setPage } = useUiStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const found = await searchService.search(query);
      setResults(found);
    }, 150);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && searchOpen) closeSearch();
      if ((e.ctrlKey || e.metaKey) && e.code === "Space") {
        e.preventDefault();
        useUiStore.getState().openSearch();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchOpen, closeSearch]);

  if (!searchOpen) return null;

  const goToResult = (kind: SearchResultKind) => {
    if (kind === "task") setPage("daily-tasks");
    else if (kind === "event") setPage("calendar");
    else if (kind === "alarm") setPage("alarms");
    else setPage("weekly-schedule");
    closeSearch();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-32"
      onClick={closeSearch}
    >
      <div className="ff-card w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
          <Search size={18} className="text-text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar tarefas, eventos, alarmes..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
        </div>

        <div className="max-h-80 overflow-y-auto py-1">
          {query.trim() && results.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-text-muted">Nenhum resultado encontrado.</p>
          )}
          {results.map((result) => {
            const Icon = ICONS[result.kind];
            return (
              <button
                key={`${result.kind}-${result.id}`}
                onClick={() => goToResult(result.kind)}
                className={classNames(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2 transition-colors",
                )}
              >
                <Icon size={16} className="text-accent-400 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-text-primary">{result.title}</p>
                  <p className="truncate text-xs text-text-muted">{result.subtitle}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
