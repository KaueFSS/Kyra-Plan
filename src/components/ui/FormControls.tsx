import { useState, type ReactNode } from "react";
import { WEEKDAY_LABELS_SHORT, classNames } from "../../utils/format";

/** Muted, evenly-weighted hues (no purples) so a full week of blocks reads calm, not rainbow. */
export const PALETTE = ["#2b8af7", "#2aa198", "#30a46c", "#c7962f", "#d0683f", "#c9557f", "#5f86a6", "#6b7a90"];

export function ColorSwatches({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          aria-label={`Cor ${color}`}
          className={classNames(
            "h-5 w-5 rounded-full transition-transform hover:scale-110",
            value === color && "ring-2 ring-offset-2 ring-offset-surface-1",
          )}
          style={{ backgroundColor: color, ["--tw-ring-color" as string]: color }}
        />
      ))}
    </div>
  );
}

export function DayToggles({
  value,
  onChange,
  single = false,
}: {
  value: number[];
  onChange: (days: number[]) => void;
  single?: boolean;
}) {
  const toggle = (day: number) => {
    if (single) return onChange([day]);
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort());
  };
  return (
    <div className="grid grid-cols-7 gap-1">
      {WEEKDAY_LABELS_SHORT.map((label, day) => (
        <button
          key={label}
          type="button"
          onClick={() => toggle(day)}
          className={classNames(
            "rounded-md py-1 text-[0.6875rem] font-semibold transition-colors",
            value.includes(day)
              ? "bg-accent-500 text-white"
              : "bg-surface-2 text-text-muted hover:text-text-secondary",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1 block text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">{children}</span>;
}

export function PopoverActions({
  onSave,
  onDelete,
  saving,
  saveLabel = "Salvar",
}: {
  onSave: () => void;
  onDelete?: () => void;
  saving?: boolean;
  saveLabel?: string;
}) {
  // Destructive actions take two clicks: the first arms, the second deletes.
  const [armed, setArmed] = useState(false);

  return (
    <div className="mt-3 flex items-center justify-between gap-2">
      {onDelete ? (
        <button
          type="button"
          onClick={() => (armed ? onDelete() : setArmed(true))}
          onBlur={() => setArmed(false)}
          className={classNames(
            "rounded-md text-xs font-medium text-danger transition-colors",
            armed ? "bg-danger px-2 py-1 text-white" : "hover:underline",
          )}
        >
          {armed ? "Confirmar exclusão" : "Excluir"}
        </button>
      ) : (
        <span className="text-[0.6875rem] text-text-muted">Enter para salvar</span>
      )}
      <button type="button" onClick={onSave} disabled={saving} className="ff-btn-primary px-3 py-1.5 text-xs">
        {saving ? "Salvando..." : saveLabel}
      </button>
    </div>
  );
}
