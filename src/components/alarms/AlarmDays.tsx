import { WEEKDAY_LABELS_SHORT, alarmDaysLabel, classNames } from "../../utils/format";

const LETTERS = ["S", "T", "Q", "Q", "S", "S", "D"];

/** The seven weekdays as letters, the ones the alarm rings on lit up. */
export function AlarmDays({ days, enabled, today }: { days: number[]; enabled: boolean; today: number }) {
  const every = days.length === 0;
  return (
    <span className="flex items-center gap-0.5" title={alarmDaysLabel(days)}>
      {LETTERS.map((letter, day) => {
        const on = every || days.includes(day);
        return (
          <span
            key={day}
            title={WEEKDAY_LABELS_SHORT[day]}
            className={classNames(
              "flex h-3.5 w-3.5 items-center justify-center rounded-[4px] text-[0.5625rem] font-bold leading-none",
              on ? (enabled ? "bg-accent-500/20 text-accent-400" : "bg-surface-3 text-text-secondary") : "text-text-muted/50",
              day === today && "ring-1 ring-text-muted/60",
            )}
          >
            {letter}
          </span>
        );
      })}
    </span>
  );
}
