import { useEffect, useRef } from "react";
import { Check, Timeline } from "../ui/icons";
import { WidgetCard } from "../ui/WidgetCard";
import { useTodayAgenda } from "../../hooks/useTodayAgenda";
import { durationLabel, minutesOfDay, relativeLabel, remainingLabel } from "../../utils/timeHints";
import { AGENDA_KIND, clockLabel } from "./agendaMeta";
import { classNames } from "../../utils/format";
import type { AgendaItem } from "../../utils/todayAgenda";

/**
 * "Linha do Dia": everything with a time today on one rail — timetable,
 * events, tasks and alarms — with a live "now" marker, progress on what's
 * running and a ribbon of the whole day on top.
 */
export function TodayTimelineWidget() {
  const { agenda, now } = useTodayAgenda();
  const clock = minutesOfDay(now) + now.second / 60;
  const markerRef = useRef<HTMLDivElement>(null);

  const left = agenda.filter((i) => i.status !== "past").length;
  const overdue = agenda.filter((i) => i.overdue).length;
  const markerIndex = agenda.findIndex((i) => i.status !== "past");
  const insertAt = markerIndex === -1 ? agenda.length : markerIndex;

  useEffect(() => {
    markerRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [insertAt]);

  return (
    <WidgetCard
      icon={Timeline}
      title="Linha do Dia"
      subtitle={
        agenda.length === 0
          ? "Tudo que tiver horário hoje aparece aqui"
          : left === 0
            ? "Dia concluído"
            : `${left} ${left === 1 ? "item restante" : "itens restantes"} hoje`
      }
      actions={
        overdue > 0 && (
          <span className="rounded-md bg-danger/15 px-1.5 py-0.5 text-[0.75rem] font-semibold text-danger">
            {overdue} {overdue === 1 ? "atrasada" : "atrasadas"}
          </span>
        )
      }
    >
      {agenda.length > 0 && <DayRibbon agenda={agenda} clock={clock} />}

      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        {agenda.length === 0 ? (
          <p className="px-1 py-2 text-xs text-text-muted">
            Aulas da programação, eventos, tarefas com horário e alarmes de hoje entram aqui sozinhos, em ordem.
          </p>
        ) : (
          <ol className="relative">
            {agenda.map((item, index) => (
              <li key={item.id}>
                {index === insertAt && <NowMarker ref={markerRef} clock={clock} />}
                <TimelineRow item={item} clock={clock} last={index === agenda.length - 1} />
              </li>
            ))}
            {insertAt === agenda.length && <NowMarker ref={markerRef} clock={clock} />}
          </ol>
        )}
      </div>
    </WidgetCard>
  );
}

/** The whole day at a glance: colored segments per item and a moving "now" line. */
function DayRibbon({ agenda, clock }: { agenda: AgendaItem[]; clock: number }) {
  const from = Math.min(6 * 60, ...agenda.map((i) => i.start));
  const to = Math.max(22 * 60, ...agenda.map((i) => i.end ?? i.start));
  const pos = (m: number) => `${((Math.min(Math.max(m, from), to) - from) / (to - from)) * 100}%`;

  return (
    <div className="mb-2.5 shrink-0">
      <div className="relative h-2.5 overflow-hidden rounded-full bg-surface-3">
        <div className="absolute inset-y-0 left-0 bg-text-muted/15" style={{ width: pos(clock) }} />
        {agenda.map((item) =>
          item.end !== null ? (
            <span
              key={item.id}
              className={classNames("absolute inset-y-0.5 rounded-full", item.status === "past" && "opacity-40")}
              style={{ left: pos(item.start), width: `max(0.25rem, calc(${pos(item.end)} - ${pos(item.start)}))`, background: item.color }}
            />
          ) : (
            <span key={item.id} className="absolute inset-y-0 w-0.5 bg-text-secondary/70" style={{ left: pos(item.start) }} />
          ),
        )}
        <span className="absolute inset-y-0 w-0.5 bg-text-primary shadow-[0_0_6px_var(--color-accent-500)]" style={{ left: pos(clock) }} />
      </div>
      <div className="mt-0.5 flex justify-between text-[0.625rem] tabular-nums text-text-muted">
        <span>{clockLabel(from)}</span>
        <span>{clockLabel(Math.round((from + to) / 2))}</span>
        <span>{clockLabel(to)}</span>
      </div>
    </div>
  );
}

function NowMarker({ ref, clock }: { ref: React.Ref<HTMLDivElement>; clock: number }) {
  return (
    <div ref={ref} className="flex items-center gap-2 py-1">
      <span className="w-11 shrink-0 text-right text-[0.6875rem] font-bold tabular-nums text-accent-400">{clockLabel(Math.floor(clock))}</span>
      <span className="h-2 w-2 shrink-0 rounded-full bg-accent-400 shadow-[0_0_0_3px_var(--color-accent-glow)]" />
      <span className="h-px flex-1 bg-gradient-to-r from-accent-400 to-transparent" />
      <span className="text-[0.625rem] font-bold uppercase tracking-wider text-accent-400">agora</span>
    </div>
  );
}

function TimelineRow({ item, clock, last }: { item: AgendaItem; clock: number; last: boolean }) {
  const kind = AGENDA_KIND[item.kind];
  const Icon = kind.icon;
  const past = item.status === "past" && !item.overdue;
  const live = item.status === "now" && item.end !== null;
  const progress = live ? Math.min(1, (clock - item.start) / (item.end! - item.start)) : 0;

  let hint: string;
  if (live) hint = remainingLabel(item.end! - clock);
  else if (item.done) hint = "feito";
  else if (item.overdue) hint = "atrasada";
  else if (past) hint = relativeLabel(-(clock - (item.end ?? item.start)));
  else hint = relativeLabel(item.start - clock);

  return (
    <div className={classNames("group flex gap-2", past && "opacity-50")}>
      <div className="w-11 shrink-0 pt-1.5 text-right leading-tight">
        <p className={classNames("text-xs font-semibold tabular-nums", live ? "text-accent-400" : "text-text-primary")}>{clockLabel(item.start)}</p>
        {item.end !== null && <p className="text-[0.625rem] tabular-nums text-text-muted">{clockLabel(item.end)}</p>}
      </div>

      {/* Rail: a dot per stop, a line down to the next one. */}
      <div className="relative flex w-2 shrink-0 flex-col items-center">
        <span
          className={classNames(
            "mt-2 flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full",
            live && "ring-4 ring-[color-mix(in_srgb,var(--dot)_25%,transparent)]",
          )}
          style={{ background: past ? "var(--color-border-strong)" : item.overdue ? "var(--color-danger)" : item.color, ["--dot" as string]: item.color }}
        >
          {past && <Check size={7} strokeWidth={4} className="text-text-primary" />}
        </span>
        {!last && <span className="mt-0.5 w-px flex-1 bg-border-strong" />}
      </div>

      <div
        className={classNames(
          "mb-1.5 min-w-0 flex-1 rounded-lg px-2 py-1.5 transition-colors",
          live ? "bg-accent-500/10 shadow-[inset_0_0_0_1px_var(--color-accent-500)]" : item.overdue ? "bg-danger/[0.08]" : "group-hover:bg-surface-2",
        )}
      >
        <div className="flex items-center gap-1.5">
          <Icon size={13} className="shrink-0" style={{ color: past ? undefined : item.color }} />
          <p className={classNames("min-w-0 flex-1 truncate text-sm font-medium text-text-primary", item.done && "line-through")}>{item.title}</p>
          <span
            className={classNames(
              "shrink-0 text-[0.6875rem] tabular-nums",
              live ? "font-semibold text-accent-400" : item.overdue ? "rounded bg-danger/15 px-1 font-semibold text-danger" : item.status === "next" ? "font-semibold text-text-secondary" : "text-text-muted",
            )}
          >
            {hint}
          </span>
        </div>
        <p className="mt-0.5 text-[0.6875rem] text-text-muted">
          {kind.label}
          {item.end !== null && ` · ${durationLabel(item.end - item.start)}`}
        </p>
        {live && (
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-accent-500 transition-[width] duration-1000" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
