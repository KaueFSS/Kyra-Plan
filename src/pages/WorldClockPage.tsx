import { useEffect, useState } from "react";
import { Plus, X, Globe2, Sun, Moon } from "../components/ui/icons";
import { useWorldClockStore } from "../stores/worldClockStore";
import { EmptyState } from "../components/ui/EmptyState";
import { Modal } from "../components/ui/Modal";
import { useLiveTick } from "../hooks/useLiveTick";

function CityTime({ timezone, now }: { timezone: string; now: number }) {
  const date = new Date(now);
  const time = date.toLocaleTimeString("pt-BR", { timeZone: timezone, hour: "2-digit", minute: "2-digit" });
  const day = date.toLocaleDateString("pt-BR", { timeZone: timezone, weekday: "short", day: "2-digit", month: "short" });

  // Rough day/night indicator, purely cosmetic.
  const hour = Number(date.toLocaleTimeString("pt-BR", { timeZone: timezone, hour: "2-digit", hour12: false }).split(":")[0]);
  const isDaytime = hour >= 6 && hour < 18;

  return (
    <div>
      <p className="text-3xl font-semibold tabular-nums text-text-primary">{time}</p>
      <p className="text-xs text-text-muted">
        {day} · <span className="inline-flex items-center gap-1">{isDaytime ? <Sun size={12} /> : <Moon size={12} />}{isDaytime ? "Dia" : "Noite"}</span>
      </p>
    </div>
  );
}

function AddCityModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { availableTimezones, loadTimezones, addCity, clocks } = useWorldClockStore();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) loadTimezones();
  }, [open, loadTimezones]);

  const existingTz = new Set(clocks.map((c) => c.timezone));
  const filtered = availableTimezones.filter(
    ([city, tz]) => !existingTz.has(tz) && city.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Modal open={open} onClose={onClose} title="Adicionar cidade" widthClassName="max-w-sm">
      <input
        className="ff-input w-full mb-3"
        placeholder="Buscar cidade..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      <div className="max-h-72 overflow-y-auto space-y-1">
        {filtered.map(([city, tz]) => (
          <button
            key={tz}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-text-primary hover:bg-surface-2"
            onClick={async () => {
              await addCity(city, tz);
              onClose();
            }}
          >
            <span>{city}</span>
            <span className="text-xs text-text-muted">{tz}</span>
          </button>
        ))}
        {filtered.length === 0 && <p className="py-4 text-center text-sm text-text-muted">Nenhuma cidade encontrada.</p>}
      </div>
    </Modal>
  );
}

export function WorldClockPage() {
  const { clocks, load, removeCity } = useWorldClockStore();
  const [modalOpen, setModalOpen] = useState(false);
  const now = useLiveTick(1000);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-5 flex justify-end">
        <button className="ff-btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Adicionar cidade
        </button>
      </div>

      {clocks.length === 0 && (
        <EmptyState icon={Globe2} title="Nenhuma cidade adicionada" description="Adicione fusos horários de qualquer lugar do mundo." />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {clocks.map((clock) => (
          <div key={clock.id} className="ff-card px-4 py-4 relative group">
            <button
              className="absolute right-2 top-2 rounded-md p-1 text-text-muted opacity-0 group-hover:opacity-100 hover:text-danger transition-opacity"
              onClick={() => removeCity(clock.id)}
            >
              <X size={14} />
            </button>
            <p className="text-sm font-medium text-text-secondary mb-1">{clock.city}</p>
            <CityTime timezone={clock.timezone} now={now} />
          </div>
        ))}
      </div>

      <AddCityModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
