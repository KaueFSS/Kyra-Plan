import { classNames } from "../../utils/format";

/**
 * On/off switch. The knob is anchored to the left edge and moved with
 * `translate-x`, so its position never depends on the button's layout.
 * Size scales with the UI (rem), like the text around it.
 */
export function Switch({
  checked,
  onChange,
  label,
  size = "md",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  size?: "sm" | "md";
}) {
  const small = size === "sm";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      onClick={() => onChange(!checked)}
      className={classNames(
        "relative shrink-0 rounded-full transition-colors",
        small ? "h-5 w-9" : "h-6 w-11",
        checked ? "bg-accent-500" : "bg-surface-3",
      )}
    >
      <span
        className={classNames(
          "absolute left-0 top-0.5 rounded-full bg-white shadow transition-transform",
          small ? "h-4 w-4" : "h-5 w-5",
          checked ? (small ? "translate-x-[1.125rem]" : "translate-x-[1.375rem]") : "translate-x-0.5",
        )}
      />
    </button>
  );
}
