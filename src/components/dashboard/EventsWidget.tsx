import { useState } from "react";
import { DateTime } from "luxon";
import { CalendarClock, Plus } from "../ui/icons";
import { useUiStore } from "../../stores/uiStore";
import { createEvents } from "../../stores/smartActions";
import { useClickGuard } from "../../hooks/useClickGuard";
import { useLiveTick } from "../../hooks/useLiveTick";
import { WidgetCard, IconAction } from "../ui/WidgetCard";
import { InlineAdd } from "../ui/InlineAdd";
import { anchorBelow } from "../ui/Popover";
import { EventEditorPopover, type EventEditTarget } from "../calendar/EventEditorPopover";
import { useEventDraggable } from "../calendar/eventDnd";
import { classNames } from "../../utils/format";
import { durationLabel, relativeLabel, remainingLabel } from "../../utils/timeHints";
import type { EventOccurrence } from "../../types/event";

interface EventsWidgetProps {
  occurrences: EventOccurrence[];
  selectedDate: string;
  range: { start: string; end: string };
}

function dayLabel(dateIso: string): string {
  const date = DateTime.fromISO(dateIso).setLocale("pt-BR");
  const today = DateTime.now().startOf("day");
  const diff = Math.round(date.startOf("day").diff(today, "days").days);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  return date.toFormat("EEE, d 'de' MMM");
}

/** "em 25 min", "em 2 h", "agora" — for the next event countdown. */
function countdown(from: DateTime, to: DateTime): string {
  const minutes = Math.round(to.diff(from, "minutes").minutes);
  if (minutes <= 0) return "agora";
  if (minutes < 60) return `em ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `em ${hours} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`;
  return `em ${Math.round(hours / 24)} dia(s)`;
}

export function EventsWidget({ occurrences, selectedDate, range }: EventsWidgetProps) {
  const { setPage } = useUiStore();
  const [editing, setEditing] = useState<EventEditTarget | null>(null);
  const now = DateTime.fromMillis(useLiveTick(30_000));

  const selected = DateTime.fromISO(selectedDate);
  const sorted = [...occurrences].sort((a, b) => a.occurrenceStart.localeCompare(b.occurrenceStart));
  const ofSelectedDay = sorted.filter((occ) => DateTime.fromISO(occ.occurrenceStart).hasSame(selected, "day"));
  const upcoming = sorted
    .filter((occ) => DateTime.fromISO(occ.occurrenceStart) > selected.endOf("day"))
    .slice(0, 5);

  const happening = sorted.find((occ) => DateTime.fromISO(occ.occurrenceStart) <= now && DateTime.fromISO(occ.occurrenceEnd) > now);
  const next = sorted.find((occ) => DateTime.fromISO(occ.occurrenceStart) > now);
  const smartSubtitle = happening
    ? `Agora: ${happening.title}`
    : next
      ? `Próximo: ${next.title} ${countdown(now, DateTime.fromISO(next.occurrenceStart))}`
      : dayLabel(selectedDate);

  const openEdit = (occurrence: EventOccurrence, anchor: { x: number; y: number }) =>
    setEditing({ occurrence, anchor, date: selectedDate });

  return (
    <WidgetCard
      icon={CalendarClock}
      title="Eventos"
      subtitle={<span className={happening ? "font-medium text-accent-400" : undefined}>{smartSubtitle}</span>}
      onTitleClick={() => setPage("calendar")}
      actions={
        <IconAction
          icon={Plus}
          label="Novo evento"
          onClick={(e) => setEditing({ occurrence: null, date: selectedDate, anchor: anchorBelow(e.currentTarget) })}
        />
      }
    >
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
        <p className="px-1 pb-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">{dayLabel(selectedDate)}</p>
        {ofSelectedDay.length === 0 && <p className="px-1 pb-1 text-xs text-text-muted">Nada marcado.</p>}
        {ofSelectedDay.map((occ) => (
          <EventRow key={`${occ.id}-${occ.occurrenceStart}`} occurrence={occ} onEdit={openEdit} now={now} />
        ))}

        {upcoming.length > 0 && (
          <>
            <p className="px-1 pb-0.5 pt-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted">Próximos</p>
            {upcoming.map((occ) => (
              <EventRow key={`${occ.id}-${occ.occurrenceStart}`} occurrence={occ} onEdit={openEdit} now={now} showDate />
            ))}
          </>
        )}
      </div>

      <div className="mt-2 shrink-0">
        <InlineAdd
          label="Adicionar evento"
          placeholder="Ex.: Prova amanhã 9h-11h"
          onSubmit={(p) => createEvents(p, selectedDate, range)}
        />
      </div>

      <EventEditorPopover target={editing} onClose={() => setEditing(null)} range={range} />
    </WidgetCard>
  );
}

function EventRow({
  occurrence,
  onEdit,
  showDate = false,
  now,
}: {
  occurrence: EventOccurrence;
  now: DateTime;
  onEdit: (occ: EventOccurrence, anchor: { x: number; y: number }) => void;
  showDate?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useEventDraggable(occurrence, "list");
  const swallowClick = useClickGuard(isDragging);
  const start = DateTime.fromISO(occurrence.occurrenceStart);
  const end = DateTime.fromISO(occurrence.occurrenceEnd);
  const minutesToStart = start.diff(now, "minutes").minutes;
  const phase = end <= now ? "past" : start <= now ? "now" : minutesToStart <= 60 ? "soon" : "later";
  const progress = phase === "now" ? now.diff(start).toMillis() / end.diff(start).toMillis() : 0;
  const minutes = Math.round(end.diff(start, "minutes").minutes);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (swallowClick()) return;
        onEdit(occurrence, { x: e.clientX + 8, y: e.clientY + 8 });
      }}
      title="Arraste para um dia do calendário para remarcar"
      style={{ ["--event" as string]: occurrence.color }}
      className={classNames(
        "relative flex cursor-grab items-center gap-2.5 overflow-hidden rounded-lg px-1.5 py-1.5 transition-colors hover:bg-surface-2 active:cursor-grabbing",
        phase === "now" && "bg-[color-mix(in_srgb,var(--event)_14%,transparent)]",
        phase === "past" && "opacity-50",
        isDragging && "opacity-30",
      )}
    >
      <span className="w-1 self-stretch rounded-full" style={{ backgroundColor: occurrence.color }} />
      {phase === "now" && (
        <span className="absolute bottom-0 left-0 h-0.5" style={{ width: `${progress * 100}%`, background: occurrence.color }} />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm leading-tight text-text-primary">{occurrence.title}</p>
        <p className="text-[0.75rem] tabular-nums text-text-muted">
          {showDate && <span className="capitalize">{start.setLocale("pt-BR").toFormat("EEE dd/MM")} · </span>}
          {start.toFormat("HH:mm")} – {end.toFormat("HH:mm")}
          {minutes > 0 && minutes < 24 * 60 && <span> · {durationLabel(minutes)}</span>}
        </p>
      </div>
      {(phase === "now" || phase === "soon") && (
        <span
          className={classNames(
            "shrink-0 rounded-md px-1.5 py-px text-[0.6875rem] font-semibold tabular-nums",
            phase === "now" ? "text-white" : "bg-accent-500/15 text-accent-400",
          )}
          style={phase === "now" ? { background: occurrence.color } : undefined}
        >
          {phase === "now" ? remainingLabel(end.diff(now, "minutes").minutes) : relativeLabel(Math.ceil(minutesToStart))}
        </span>
      )}
    </div>
  );
}
