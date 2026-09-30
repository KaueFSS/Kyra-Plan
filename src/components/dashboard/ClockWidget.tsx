import { useState, type ReactNode } from "react";
import { DateTime } from "luxon";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Globe2, Moon, Plus, Sun, X } from "../ui/icons";
import { useSettingsStore, settingsToUpdateInput } from "../../stores/settingsStore";
import { useWorldClockStore } from "../../stores/worldClockStore";
import { useUiStore } from "../../stores/uiStore";
import { useLiveTick } from "../../hooks/useLiveTick";
import { WidgetCard, IconAction } from "../ui/WidgetCard";
import { CountryBadge } from "../ui/CountryBadge";
import { Popover, anchorBelow, type PopoverAnchor } from "../ui/Popover";
import { classNames } from "../../utils/format";
import type { WorldClock } from "../../types/worldClock";

function offsetLabel(zone: string, reference: string, now: number): string {
  const diff = (DateTime.fromMillis(now).setZone(zone).offset - DateTime.fromMillis(now).setZone(reference).offset) / 60;
  if (diff === 0) return "mesmo fuso";
  const hours = Number.isInteger(diff) ? `${Math.abs(diff)}h` : `${Math.abs(diff).toFixed(1)}h`;
  return diff > 0 ? `+${hours}` : `−${hours}`;
}

/** Home clock + world clocks. Cities are added/removed right here and can
 * be dragged to reorder. Must be rendered inside an `AppDndContext`. */
export function ClockWidget({ clocks, tabs }: { clocks: WorldClock[]; tabs?: ReactNode }) {
  const { settings, update } = useSettingsStore();
  const { availableTimezones, loadTimezones, addCity, removeCity } = useWorldClockStore();
  const { setPage } = useUiStore();
  const [picker, setPicker] = useState<{ anchor: PopoverAnchor; mode: "city" | "home" } | null>(null);
  const now = useLiveTick(1000);

  const homeZone = settings?.timezone || "UTC";
  const local = DateTime.fromMillis(now).setZone(homeZone).setLocale("pt-BR");
  const others = clocks.filter((c) => c.timezone !== homeZone);

  const openPicker = (mode: "city" | "home", anchor: PopoverAnchor) => {
    if (availableTimezones.length === 0) void loadTimezones();
    setPicker({ mode, anchor });
  };

  const choose = async (city: string, zone: string) => {
    if (picker?.mode === "home" && settings) {
      await update({ ...settingsToUpdateInput(settings), timezone: zone });
    } else {
      await addCity(city, zone);
    }
    setPicker(null);
  };

  const existing = new Set(clocks.map((c) => c.timezone));

  return (
    <WidgetCard
      icon={Globe2}
      title="Relógios"
      onTitleClick={() => setPage("world-clock")}
      actions={
        <>
          {tabs}
          <IconAction icon={Plus} label="Adicionar cidade" onClick={(e) => openPicker("city", anchorBelow(e.currentTarget))} />
        </>
      }
    >
      <button
        onClick={(e) => openPicker("home", anchorBelow(e.currentTarget))}
        className="mb-2 shrink-0 rounded-lg bg-surface-2 px-3 py-2 text-left transition-colors hover:bg-surface-3"
        title="Trocar seu fuso horário"
      >
        <p className="text-2xl font-semibold leading-none tabular-nums text-text-primary">
          {local.toFormat("HH:mm")}
          <span className="ml-1 text-sm font-medium text-text-muted">{local.toFormat("ss")}</span>
        </p>
        <p className="mt-1 truncate text-[0.75rem] capitalize text-text-muted">
          {local.toFormat("ccc, d MMM")} · {homeZone.split("/").pop()?.replace(/_/g, " ")}
        </p>
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {others.length === 0 ? (
          <p className="px-1 text-[0.75rem] text-text-muted">Use o + para ver o horário de outras cidades.</p>
        ) : (
          <SortableContext items={others.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {others.map((clock) => (
              <CityRow key={clock.id} clock={clock} now={now} homeZone={homeZone} onRemove={() => removeCity(clock.id)} />
            ))}
          </SortableContext>
        )}
      </div>

      <Popover
        anchor={picker?.anchor ?? null}
        onClose={() => setPicker(null)}
        title={picker?.mode === "home" ? "Seu fuso horário" : "Adicionar cidade"}
        width={250}
      >
        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {availableTimezones
            .filter(([, zone]) => picker?.mode === "home" || !existing.has(zone))
            .map(([city, zone]) => (
              <button
                key={zone}
                onClick={() => choose(city, zone)}
                className={classNames(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-text-secondary hover:bg-surface-2 hover:text-text-primary",
                  picker?.mode === "home" && zone === homeZone && "bg-accent-500/10 text-accent-400",
                )}
              >
                <CountryBadge timezone={zone} />
                <span className="flex-1 truncate">{city}</span>
                <span className="tabular-nums text-text-muted">{DateTime.fromMillis(now).setZone(zone).toFormat("HH:mm")}</span>
              </button>
            ))}
        </div>
      </Popover>
    </WidgetCard>
  );
}

function CityRow({ clock, now, homeZone, onRemove }: { clock: WorldClock; now: number; homeZone: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: clock.id,
    data: { type: "world-clock", accepts: "world-clock", clockId: clock.id, title: clock.city },
  });
  const time = DateTime.fromMillis(now).setZone(clock.timezone);
  const home = DateTime.fromMillis(now).setZone(homeZone);
  const isDay = time.hour >= 6 && time.hour < 18;
  // Compare calendar dates as each city sees them.
  const dayShift = Math.sign(time.toISODate()!.localeCompare(home.toISODate()!));

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={classNames(
        "group flex cursor-grab items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-surface-2 active:cursor-grabbing",
        isDragging && "opacity-30",
      )}
    >
      <CountryBadge timezone={clock.timezone} />
      <p className="min-w-0 flex-1 truncate text-xs text-text-primary">{clock.city}</p>
      <span title={isDay ? "Dia lá" : "Noite lá"} className={isDay ? "text-warning" : "text-info"}>
        {isDay ? <Sun size={14} /> : <Moon size={14} />}
      </span>
      <div className="shrink-0 text-right leading-tight">
        <p className="text-sm font-semibold tabular-nums text-text-primary">{time.toFormat("HH:mm")}</p>
        <p className="text-[0.6875rem] text-text-muted">
          {dayShift !== 0 && <span className="font-semibold text-accent-400">{dayShift > 0 ? "amanhã" : "ontem"} · </span>}
          {offsetLabel(clock.timezone, homeZone, now)}
        </p>
      </div>
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        className="-mr-0.5 rounded p-0.5 text-text-muted opacity-0 hover:text-danger group-hover:opacity-100"
        aria-label={`Remover ${clock.city}`}
      >
        <X size={12} />
      </button>
    </div>
  );
}
