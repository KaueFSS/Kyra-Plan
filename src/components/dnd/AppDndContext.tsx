import { type ReactNode, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useScheduleStore } from "../../stores/scheduleStore";
import { useTaskStore } from "../../stores/taskStore";
import { useCalendarStore } from "../../stores/calendarStore";
import { useWorldClockStore } from "../../stores/worldClockStore";
import type { DragPayload, DropTarget } from "./types";
import { clockToMinutes } from "../../utils/timeHints";
import { minutesToClock, snap } from "../../utils/timetableLayout";
import { playSound } from "../../utils/sounds";
import { visualDailyOrder } from "../tasks/SortableDailyList";

/** Pointer-first detection (drop where the cursor is), falling back to
 * rectangle overlap so dropping near an edge still lands somewhere. */
const collisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  return pointerHits.length > 0 ? pointerHits : rectIntersection(args);
};

interface AppDndContextProps {
  children: ReactNode;
  /** Visible event range, so a moved event can be re-expanded for that range. */
  eventRange?: { start: string; end: string };
}

/**
 * One drag-and-drop context per screen. Every draggable declares a typed
 * payload and every drop zone declares what it `accepts`; this component
 * is the single place that turns a drop into a store action, so each
 * widget only has to describe itself, not wire its own drop logic.
 */
export function AppDndContext({ children, eventRange }: AppDndContextProps) {
  const [active, setActive] = useState<DragPayload | null>(null);
  const reschedule = useScheduleStore((s) => s.reschedule);
  const { reorderDaily, moveWeeklyTaskDay, moveToList, setDueDate, daily } = useTaskStore();
  const moveEventToDate = useCalendarStore((s) => s.moveEventToDate);
  const { clocks, reorder: reorderClocks } = useWorldClockStore();

  const sensors = useSensors(
    // A few pixels of travel before a drag starts keeps plain clicks
    // (open editor, toggle checkbox) working on draggable items.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragStart = (event: DragStartEvent) => {
    setActive((event.active.data.current as DragPayload | undefined) ?? null);
  };

  const onDragEnd = ({ active: dragged, over, delta }: DragEndEvent) => {
    setActive(null);
    const payload = dragged.data.current as DragPayload | undefined;
    const target = over?.data.current as DropTarget | undefined;
    if (!payload) return;
    if (target) playSound("drop");

    switch (payload.type) {
      case "schedule-block": {
        // Dropped on a day column: that day, shifted by how far it moved vertically (15-min steps).
        if (target?.accepts !== "schedule-day") break;
        const { block } = payload;
        const start = clockToMinutes(block.startTime);
        const length = clockToMinutes(block.endTime) - start;
        const moved = target.minutePx ? delta.y / target.minutePx : 0;
        const shifted = moved ? Math.max(0, Math.min(24 * 60 - length, snap(start + moved, 15))) : start;
        const startTime = minutesToClock(shifted);
        const endTime = minutesToClock(shifted + length);
        if (target.day !== block.dayOfWeek || startTime !== block.startTime) void reschedule(block.id, target.day, startTime, endTime);
        break;
      }
      case "weekly-task": {
        if (target?.accepts === "weekly-task") void moveWeeklyTaskDay(payload.taskId, payload.fromDay, target.day);
        break;
      }
      case "event": {
        if (target?.accepts === "event" && eventRange) {
          void moveEventToDate(payload.occurrence, target.date, eventRange.start, eventRange.end);
        }
        break;
      }
      case "daily-task": {
        if (target?.accepts !== "daily-task" || target.taskId === payload.taskId) break;
        const ids = visualDailyOrder(daily).map((t) => t.id);
        const from = ids.indexOf(payload.taskId);
        const to = ids.indexOf(target.taskId);
        if (from >= 0 && to >= 0) void reorderDaily(arrayMove(ids, from, to));
        break;
      }
      case "list-task": {
        // Onto another list widget: move it there. Onto a calendar day: that becomes its due date.
        if (target?.accepts === "list-task" && target.listId !== payload.listId) void moveToList(payload.taskId, target.listId);
        if (target?.accepts === "event") void setDueDate(payload.taskId, target.date);
        break;
      }
      case "world-clock": {
        if (target?.accepts !== "world-clock" || target.clockId === payload.clockId) break;
        const ids = clocks.map((c) => c.id);
        const from = ids.indexOf(payload.clockId);
        const to = ids.indexOf(target.clockId);
        if (from >= 0 && to >= 0) void reorderClocks(arrayMove(ids, from, to));
        break;
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActive(null)}
    >
      {children}
      <DragOverlay dropAnimation={null}>{active ? <DragPreview payload={active} /> : null}</DragOverlay>
    </DndContext>
  );
}

/** Floating copy that follows the cursor. Rendered at the document level,
 * so it isn't clipped by the scrollable list the item was dragged out of. */
function DragPreview({ payload }: { payload: DragPayload }) {
  const label =
    payload.type === "event"
      ? payload.occurrence.title
      : payload.type === "schedule-block"
        ? payload.block.title
        : payload.title;
  const color =
    payload.type === "event"
      ? payload.occurrence.color
      : payload.type === "schedule-block"
        ? payload.block.color
        : payload.type === "weekly-task" || payload.type === "list-task"
          ? payload.color
          : "var(--color-accent-500)";

  return (
    <div
      className="flex max-w-[14rem] cursor-grabbing items-center gap-2 rounded-lg border border-border-strong bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-text-primary shadow-2xl shadow-black/50"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <span className="truncate">{label}</span>
    </div>
  );
}
