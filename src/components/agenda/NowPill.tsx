import { useTodayAgenda } from "../../hooks/useTodayAgenda";
import { nowAndNext } from "../../utils/todayAgenda";
import { minutesOfDay, relativeLabel, remainingLabel } from "../../utils/timeHints";
import { AGENDA_KIND, clockLabel } from "./agendaMeta";
import { classNames } from "../../utils/format";

/**
 * The single most useful line on the screen: what's happening right now
 * (with how much is left) or what's next (and how soon), pulled from the
 * timetable, events, tasks with a time and alarms.
 */
export function NowPill() {
  const { agenda, now } = useTodayAgenda();
  const { now: current, next } = nowAndNext(agenda);
  const clock = minutesOfDay(now) + now.second / 60;
  const overdue = agenda.filter((i) => i.overdue);
  const overdueBadge = overdue.length > 0 && (
    <span
      className="shrink-0 rounded-full bg-danger/15 px-2 py-1 text-xs font-semibold text-danger"
      title={`Atrasadas: ${overdue.map((i) => i.title).join(", ")}`}
    >
      {overdue.length} {overdue.length === 1 ? "atrasada" : "atrasadas"}
    </span>
  );

  if (current.length === 0 && !next) {
    const rest = agenda.length > 0;
    return (
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate rounded-full border border-border-subtle px-3 py-1 text-xs text-text-muted">
          {overdue.length > 0 ? "Nada mais agendado hoje" : rest ? "Tudo de hoje já passou — bom descanso" : "Nada com horário hoje"}
        </span>
        {overdueBadge}
      </span>
    );
  }

  const item = current[0];
  if (item && item.end !== null) {
    const Icon = AGENDA_KIND[item.kind].icon;
    const progress = Math.min(1, Math.max(0, (clock - item.start) / (item.end - item.start)));
    return (
      <span className="flex min-w-0 items-center gap-2">
      <span
        className="relative flex min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-full border border-accent-500/40 bg-accent-500/10 py-1 pl-2.5 pr-3 text-xs"
        title={`${item.title} · ${clockLabel(item.start)}–${clockLabel(item.end)}`}
      >
        <span className="absolute inset-y-0 left-0 bg-accent-500/15" style={{ width: `${progress * 100}%` }} />
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-400" />
        </span>
        <span className="relative shrink-0 font-bold uppercase tracking-wide text-accent-400">Agora</span>
        <Icon size={14} className="relative shrink-0 text-accent-400" />
        <span className="relative truncate font-semibold text-text-primary">{item.title}</span>
        <span className="relative shrink-0 tabular-nums text-text-secondary">{remainingLabel(item.end - clock)}</span>
        {current.length > 1 && (
          <span className="relative shrink-0 rounded-full bg-surface-3 px-1.5 font-semibold text-text-secondary" title={current.slice(1).map((i) => i.title).join(", ")}>
            +{current.length - 1}
          </span>
        )}
        {next && (
          <span className="relative hidden shrink-0 text-text-muted xl:inline">
            · depois: <span className="text-text-secondary">{next.title}</span> {clockLabel(next.start)}
          </span>
        )}
      </span>
      {overdueBadge}
      </span>
    );
  }

  const upcoming = next!;
  const Icon = AGENDA_KIND[upcoming.kind].icon;
  const until = upcoming.start - clock;
  const soon = until <= 15;
  return (
    <span className="flex min-w-0 items-center gap-2">
    <span
      className={classNames(
        "flex min-w-0 max-w-full items-center gap-2 rounded-full border py-1 pl-2.5 pr-3 text-xs",
        soon ? "border-warning/50 bg-warning/10" : "border-border-subtle bg-surface-1",
      )}
      title={`${AGENDA_KIND[upcoming.kind].label}: ${upcoming.title} às ${clockLabel(upcoming.start)}`}
    >
      <span className={classNames("shrink-0 font-bold uppercase tracking-wide", soon ? "text-warning" : "text-text-muted")}>Próximo</span>
      <Icon size={14} className={classNames("shrink-0", soon ? "text-warning" : "text-accent-400")} />
      <span className="truncate font-semibold text-text-primary">{upcoming.title}</span>
      <span className="shrink-0 tabular-nums text-text-secondary">
        {clockLabel(upcoming.start)} · {relativeLabel(Math.ceil(until))}
      </span>
    </span>
    {overdueBadge}
    </span>
  );
}
