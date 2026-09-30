import { DateTime } from "luxon";
import { useLiveTick } from "../../hooks/useLiveTick";
import { clockToMinutes, minutesOfDay, relativeLabel, urgencyOf } from "../../utils/timeHints";
import { classNames } from "../../utils/format";

/**
 * A task's time that tells you how it stands at a glance:
 * red "atrasada" once it's past, highlighted "em 20 min" within the hour,
 * plain time otherwise (and always plain once the task is done).
 */
export function TimeChip({ time, done, compact = false, className }: { time: string | null; done: boolean; compact?: boolean; className?: string }) {
  const now = DateTime.fromMillis(useLiveTick(30_000));
  if (!time) return null;

  const until = clockToMinutes(time) - minutesOfDay(now);
  const urgency = done ? "later" : urgencyOf(until);

  return (
    <span
      title={done ? `Feita · ${time}` : `${time} · ${urgency === "overdue" ? "atrasada, " : ""}${relativeLabel(until)}`}
      className={classNames(
        "shrink-0 rounded-md px-1.5 py-px text-[0.6875rem] font-semibold tabular-nums",
        urgency === "overdue" && "bg-danger/15 text-danger",
        urgency === "soon" && "bg-accent-500/15 text-accent-400",
        urgency === "later" && "font-normal text-text-muted",
        className,
      )}
    >
      {urgency === "overdue" ? (compact ? time : `${time} · atrasada`) : urgency === "soon" ? (compact ? `${until}m` : relativeLabel(until)) : time}
    </span>
  );
}

/** How many of these tasks are past their time and still open. */
export function countOverdue(tasks: { scheduledTime: string | null; completion: { completed: boolean } | null }[], now: DateTime): number {
  const clock = minutesOfDay(now);
  return tasks.filter((t) => t.scheduledTime && !t.completion?.completed && clockToMinutes(t.scheduledTime) < clock).length;
}
