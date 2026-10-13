import { useEffect, useRef, useState } from "react";
import { DateTime } from "luxon";
import { Check, Flame, X } from "../ui/icons";
import { Popover, anchorBelow, type PopoverAnchor } from "../ui/Popover";
import { useStreakStore } from "../../stores/streakStore";
import { useToastStore } from "../../stores/toastStore";
import { classNames } from "../../utils/format";
import { playSound } from "../../utils/sounds";
import type { StreakDay } from "../../types/taskList";

const REFRESH_MS = 10 * 60 * 1000;

function days(n: number): string {
  return `${n} ${n === 1 ? "dia" : "dias"}`;
}

/**
 * The "complete everything" streak in the top bar: a flame with how many
 * days in a row every task due was done. Lights up when today is complete,
 * stays warm while today is still open, and celebrates the moment you finish.
 */
export function StreakBadge() {
  const { streak, celebrateKey, load } = useStreakStore();
  const show = useToastStore((s) => s.show);
  const [anchor, setAnchor] = useState<PopoverAnchor | null>(null);
  const [pop, setPop] = useState(false);
  const firstKey = useRef(celebrateKey);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (celebrateKey === firstKey.current || !streak) return;
    setPop(true);
    playSound("celebrate");
    show(`Dia completo! Sequência de ${days(streak.current)}.`, "success");
    const id = setTimeout(() => setPop(false), 700);
    return () => clearTimeout(id);
    // Only the key bump should trigger the celebration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrateKey]);

  if (!streak) return null;

  const todayComplete = streak.todayTotal > 0 && streak.todayDone === streak.todayTotal;
  const left = streak.todayTotal - streak.todayDone;
  const lit = todayComplete;
  const warm = !lit && streak.current > 0;

  return (
    <>
      <button
        onClick={(e) => setAnchor(anchorBelow(e.currentTarget))}
        title={
          streak.todayTotal === 0
            ? `Sequência: ${days(streak.current)}`
            : todayComplete
              ? `Sequência: ${days(streak.current)} · hoje completo!`
              : `Sequência: ${days(streak.current)} · faltam ${left} tarefa(s) hoje`
        }
        className={classNames(
          "flex h-8 items-center gap-1 rounded-lg px-2 text-sm font-bold tabular-nums transition-colors",
          lit ? "bg-warning/15 text-warning" : warm ? "text-warning/80 hover:bg-surface-2" : "text-text-muted hover:bg-surface-2",
          pop && "ff-pop",
        )}
      >
        <Flame size={17} className={lit ? "drop-shadow-[0_0_6px_var(--color-warning)]" : undefined} />
        {streak.current}
      </button>

      <Popover anchor={anchor} onClose={() => setAnchor(null)} title="Sequência" width={320}>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span
              className={classNames(
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
                streak.current > 0 ? "bg-warning/15 text-warning" : "bg-surface-2 text-text-muted",
              )}
            >
              <Flame size={30} />
            </span>
            <div>
              <p className="text-2xl font-bold leading-none tabular-nums text-text-primary">{days(streak.current)}</p>
              <p className="mt-1 text-xs text-text-muted">seguidos concluindo tudo · recorde: {days(streak.best)}</p>
            </div>
          </div>

          {streak.todayTotal > 0 && (
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-medium text-text-secondary">Hoje</span>
                <span className={todayComplete ? "font-semibold text-success" : "text-text-muted"}>
                  {todayComplete ? "Completo!" : `${streak.todayDone} de ${streak.todayTotal} · faltam ${left}`}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div
                  className={classNames("h-full rounded-full transition-[width] duration-500", todayComplete ? "bg-success" : "bg-warning")}
                  style={{ width: `${(streak.todayDone / streak.todayTotal) * 100}%` }}
                />
              </div>
              {!todayComplete && (
                <p className="mt-1.5 text-[0.75rem] text-text-muted">
                  Conclua tudo de hoje para chegar a {days(streak.current + 1)}.
                </p>
              )}
            </div>
          )}

          <div>
            <p className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">Últimos 14 dias</p>
            <div className="grid grid-cols-7 gap-1.5">
              {streak.recent.map((day) => (
                <DayDot key={day.date} day={day} />
              ))}
            </div>
          </div>

          <p className="text-[0.75rem] leading-snug text-text-muted">
            Um dia conta quando todas as tarefas diárias e as semanais daquele dia foram feitas. Dias sem tarefas não contam nem quebram; esquecer alguma quebra a sequência.
          </p>
        </div>
      </Popover>
    </>
  );
}

function DayDot({ day }: { day: StreakDay }) {
  const date = DateTime.fromISO(day.date).setLocale("pt-BR");
  const label = {
    perfect: "tudo feito",
    missed: `${day.done} de ${day.total} — quebrou`,
    empty: "sem tarefas",
    today: `hoje · ${day.done} de ${day.total}`,
  }[day.result];

  return (
    <div className="flex flex-col items-center gap-0.5" title={`${date.toFormat("ccc dd/MM")}: ${label}`}>
      <span
        className={classNames(
          "flex h-7 w-7 items-center justify-center rounded-lg",
          day.result === "perfect" && "bg-warning/20 text-warning",
          day.result === "missed" && "bg-danger/12 text-danger",
          day.result === "empty" && "bg-surface-2 text-text-muted/50",
          day.result === "today" && "bg-surface-2 text-text-secondary ring-1 ring-warning/60",
        )}
      >
        {day.result === "perfect" ? <Flame size={14} /> : day.result === "missed" ? <X size={12} strokeWidth={3} /> : day.result === "today" ? <Check size={12} /> : "·"}
      </span>
      <span className="text-[0.625rem] tabular-nums text-text-muted">{date.toFormat("dd")}</span>
    </div>
  );
}
