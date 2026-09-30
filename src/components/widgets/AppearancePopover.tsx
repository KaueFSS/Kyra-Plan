import { Check, Moon, RotateCcw, Sun } from "../ui/icons";
import { Popover, type PopoverAnchor } from "../ui/Popover";
import { FieldLabel } from "../ui/FormControls";
import { useSettingsStore } from "../../stores/settingsStore";
import {
  ACCENTS,
  COMBOS,
  DEFAULT_APPEARANCE,
  TONES,
  appearanceFromSettings,
  buildPalette,
  sameAppearance,
  type Appearance,
} from "../../utils/appearance";
import { classNames } from "../../utils/format";

/**
 * Colour picker for the whole app: ready-made combinations for one-click
 * looks, plus independent choices of mode, background tone and accent.
 */
export function AppearancePopover({ anchor, onClose }: { anchor: PopoverAnchor | null; onClose: () => void }) {
  const settings = useSettingsStore((s) => s.settings);
  const setAppearance = useSettingsStore((s) => s.setAppearance);
  if (!settings) return null;

  const current = appearanceFromSettings(settings);
  const isPresetAccent = ACCENTS.some((a) => a.hex === current.accent);

  return (
    <Popover anchor={anchor} onClose={onClose} title="Cores do app" width={360}>
      <div className="space-y-4">
        <div>
          <FieldLabel>Combinações</FieldLabel>
          <div className="grid grid-cols-3 gap-2">
            {COMBOS.map((combo) => (
              <ComboCard
                key={combo.id}
                label={combo.label}
                appearance={combo.appearance}
                selected={sameAppearance(current, combo.appearance)}
                onSelect={() => setAppearance(combo.appearance)}
              />
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Modo</FieldLabel>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1">
            {(
              [
                { mode: "dark", label: "Escuro", icon: Moon },
                { mode: "light", label: "Claro", icon: Sun },
              ] as const
            ).map(({ mode, label, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setAppearance({ mode })}
                className={classNames(
                  "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm transition-colors",
                  current.mode === mode ? "bg-accent-500 font-medium text-white" : "text-text-secondary hover:text-text-primary",
                )}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>Fundo</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {TONES.map((tone) => {
              const palette = buildPalette({ ...current, tone: tone.id });
              return (
                <Swatch
                  key={tone.id}
                  label={tone.label}
                  color={palette["--color-surface-3"]}
                  selected={current.tone === tone.id}
                  onSelect={() => setAppearance({ tone: tone.id })}
                />
              );
            })}
          </div>
        </div>

        <div>
          <FieldLabel>Destaque</FieldLabel>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENTS.map((accent) => (
              <Swatch
                key={accent.id}
                label={accent.label}
                color={accent.hex}
                selected={current.accent === accent.hex}
                onSelect={() => setAppearance({ accent: accent.hex })}
              />
            ))}
            <label
              title="Escolher qualquer cor"
              className={classNames(
                "relative h-7 w-7 cursor-pointer rounded-full ring-offset-2 ring-offset-surface-1 transition-shadow",
                !isPresetAccent ? "ring-2 ring-text-primary" : "hover:ring-2 hover:ring-border-strong",
              )}
              style={{ background: "conic-gradient(#ef4444, #eab308, #22c55e, #06b6d4, #3b82f6, #ec4899, #ef4444)" }}
            >
              <input
                type="color"
                aria-label="Escolher qualquer cor"
                value={current.accent}
                onChange={(e) => setAppearance({ accent: e.target.value })}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
          <p className="mt-1.5 text-[0.75rem] text-text-muted">Qualquer cor vale — o app ajusta o brilho para ficar confortável de ler.</p>
        </div>

        {!sameAppearance(current, DEFAULT_APPEARANCE) && (
          <button className="ff-btn-ghost w-full py-1.5 text-xs" onClick={() => setAppearance(DEFAULT_APPEARANCE)}>
            <RotateCcw size={13} /> Voltar ao visual padrão
          </button>
        )}
      </div>
    </Popover>
  );
}

function ComboCard({
  label,
  appearance,
  selected,
  onSelect,
}: {
  label: string;
  appearance: Appearance;
  selected: boolean;
  onSelect: () => void;
}) {
  const p = buildPalette(appearance);
  return (
    <button
      onClick={onSelect}
      className={classNames(
        "rounded-lg border p-1.5 text-left transition-colors",
        selected ? "border-accent-500 bg-accent-500/10" : "border-border-subtle hover:border-border-strong",
      )}
    >
      <span
        className="flex h-10 items-end gap-1 rounded-md p-1.5"
        style={{ background: p["--color-surface-0"], border: `1px solid ${p["--color-border-strong"]}` }}
      >
        <span className="h-full flex-1 rounded-sm" style={{ background: p["--color-surface-2"] }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: p["--color-accent-500"] }} />
      </span>
      <span className="mt-1 block truncate text-center text-[0.75rem] text-text-secondary">{label}</span>
    </button>
  );
}

function Swatch({ label, color, selected, onSelect }: { label: string; color: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      title={label}
      aria-label={label}
      aria-pressed={selected}
      className={classNames(
        "flex h-7 w-7 items-center justify-center rounded-full ring-offset-2 ring-offset-surface-1 transition-shadow",
        selected ? "ring-2 ring-text-primary" : "hover:ring-2 hover:ring-border-strong",
      )}
      style={{ background: color, border: "1px solid rgb(128 128 128 / 0.35)" }}
    >
      {selected && <Check size={13} className="text-white mix-blend-difference" />}
    </button>
  );
}
