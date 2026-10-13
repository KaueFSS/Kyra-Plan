import { useTodayAgenda } from "../../hooks/useTodayAgenda";
import { useStreakStore } from "../../stores/streakStore";
import { nowAndNext } from "../../utils/todayAgenda";
import { minutesOfDay, relativeLabel, remainingLabel } from "../../utils/timeHints";
import { AGENDA_KIND, clockLabel } from "./agendaMeta";
import { classNames } from "../../utils/format";

/**
 * Slim bar at the bottom of the dashboard, like a desktop app's status bar.
 * Left: what's happening now (with progress) or what's next and when.
 * Right: today's progress, anything overdue, and the date and time.
 */
export function StatusBar() {
  const { agenda, now } = useTodayAgenda();
  const streak = useStreakStore((s) => s.streak);
  const { now: current, next } = nowAndNext(agenda);
  const clock = minutesOfDay(now) + now.second / 60;
  const overdue = agenda.filter((i) => i.overdue);
  const item = current.find((i) => i.end !== null);

  return (
    <footer className="flex h-10 shrink-0 items-center gap-4 border-t border-border-subtle bg-surface-1/60 px-4 text-[0.8125rem]">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {item && item.end !== null ? (
          <>
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-400" />
            </span>
            <span className="shrink-0 text-[0.75rem] font-semibold uppercase tracking-wider text-accent-400">Agora</span>
            <ItemLabel kind={item.kind} title={item.title} />
            <span className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-surface-3">
              <span
                className="block h-full rounded-full bg-accent-500"
                style={{ width: `${Math.min(100, ((clock - item.start) / (item.end - item.start)) * 100)}%` }}
              />
            </span>
            <span className="shrink-0 tabular-nums text-text-secondary">{remainingLabel(item.end - clock)}</span>
            {current.length > 1 && <span className="shrink-0 text-text-muted">+{current.length - 1} ao mesmo tempo</span>}
            {next && (
              <span className="hidden min-w-0 truncate text-text-muted lg:inline">
                · depois: <span className="text-text-secondary">{next.title}</span> às {clockLabel(next.start)}
              </span>
            )}
          </>
        ) : next ? (
          <>
            <span className={classNames("h-2.5 w-2.5 shrink-0 rounded-full", next.start - clock <= 15 ? "bg-warning" : "bg-text-muted")} />
            <span className="shrink-0 text-[0.75rem] font-semibold uppercase tracking-wider text-text-muted">A seguir</span>
            <ItemLabel kind={next.kind} title={next.title} />
            <span className={classNames("shrink-0 tabular-nums", next.start - clock <= 15 ? "font-medium text-warning" : "text-text-secondary")}>
              {clockLabel(next.start)} · {relativeLabel(Math.ceil(next.start - clock))}
            </span>
          </>
        ) : (
          <span className="truncate text-text-muted">{agenda.length ? "Nada mais com horário hoje" : "Nada com horário hoje"}</span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-4 text-text-muted">
        {overdue.length > 0 && (
          <span className="flex items-center gap-1.5 font-medium text-danger" title={overdue.map((i) => `${clockLabel(i.start)} ${i.title}`).join("\n")}>
            <span className="h-2 w-2 rounded-full bg-danger" />
            {overdue.length} {overdue.length === 1 ? "atrasada" : "atrasadas"}
          </span>
        )}
        {streak && streak.todayTotal > 0 && (
          <span className="flex items-center gap-1.5" title="Tarefas de hoje (diárias e semanais)">
            Hoje
            <span className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-3">
              <span
                className={classNames("block h-full rounded-full", streak.todayDone === streak.todayTotal ? "bg-success" : "bg-accent-500")}
                style={{ width: `${(streak.todayDone / streak.todayTotal) * 100}%` }}
              />
            </span>
            <span className={classNames("tabular-nums", streak.todayDone === streak.todayTotal && "font-medium text-success")}>
              {streak.todayDone}/{streak.todayTotal}
            </span>
          </span>
        )}
        <span className="hidden h-4 w-px bg-border-strong sm:block" />
        <span className="tabular-nums">
          <span className="capitalize">{now.setLocale("pt-BR").toFormat("ccc, d LLL").replace(/\./g, "")}</span>
          <span className="ml-2 text-[0.9375rem] font-semibold text-text-primary">{now.toFormat("HH:mm")}</span>
        </span>
      </div>
    </footer>
  );
}

function ItemLabel({ kind, title }: { kind: keyof typeof AGENDA_KIND; title: string }) {
  const Icon = AGENDA_KIND[kind].icon;
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Icon size={15} className="shrink-0 text-text-muted" />
      <span className="truncate font-semibold text-text-primary" title={`${AGENDA_KIND[kind].label}: ${title}`}>
        {title}
      </span>
    </span>
  );
}
