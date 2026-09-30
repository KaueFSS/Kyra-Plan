import { countryForTimezone } from "../../utils/timezoneFlags";

export function CountryBadge({ timezone }: { timezone: string }) {
  return (
    <span className="inline-flex h-5 min-w-7 shrink-0 items-center justify-center rounded-md bg-surface-3 px-1 text-[0.625rem] font-bold tracking-wider text-text-secondary">
      {countryForTimezone(timezone)}
    </span>
  );
}
