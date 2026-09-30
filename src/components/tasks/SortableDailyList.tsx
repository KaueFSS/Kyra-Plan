import { useState } from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Flame, GripVertical } from "../ui/icons";
import { useTaskStore } from "../../stores/taskStore";
import { useClickGuard } from "../../hooks/useClickGuard";
import { TaskEditorPopover, type TaskEditTarget } from "./TaskEditorPopover";
import { TaskHistoryTrail } from "./TaskHistoryTrail";
import { TaskTimerControl, TaskTimerReadout } from "./TaskTimerControl";
import { PriorityDot } from "./PriorityDot";
import { TimeChip } from "./TimeChip";
import { classNames, todayIsoDate } from "../../utils/format";
import { currentStreak } from "../../utils/timeHints";
import type { TaskWithProgress } from "../../types/task";

/**
 * Daily tasks in the user's own order: drag a row by its grip to reorder
 * (persisted), click the box to complete, click the title to edit.
 * Must be rendered inside an `AppDndContext`.
 */
/** Pending first (in the user's order), done ones sink to the bottom. Drag
 * reordering works on this same visual order so what you see is what's saved. */
export function visualDailyOrder<T extends TaskWithProgress>(tasks: T[]): T[] {
  const done = (t: T) => t.completion?.completed ?? false;
  return [...tasks.filter((t) => !done(t)), ...tasks.filter(done)];
}

export function SortableDailyList({ tasks, showHistory = false }: { tasks: TaskWithProgress[]; showHistory?: boolean }) {
  const [editing, setEditing] = useState<TaskEditTarget | null>(null);
  const ordered = visualDailyOrder(tasks);

  return (
    <>
      <SortableContext items={ordered.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {ordered.map((task) => (
            <SortableDailyRow key={task.id} task={task} showHistory={showHistory} onEdit={setEditing} />
          ))}
        </div>
      </SortableContext>
      <TaskEditorPopover target={editing} onClose={() => setEditing(null)} />
    </>
  );
}

function SortableDailyRow({
  task,
  showHistory,
  onEdit,
}: {
  task: TaskWithProgress;
  showHistory: boolean;
  onEdit: (target: TaskEditTarget) => void;
}) {
  const toggleCompletion = useTaskStore((s) => s.toggleCompletion);
  // Sortable items are both draggable and a drop target, so the data
  // carries both the drag payload and the drop descriptor.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "daily-task", accepts: "daily-task", taskId: task.id, title: task.title },
  });
  const swallowClick = useClickGuard(isDragging);
  const done = task.completion?.completed ?? false;
  const timed = (task.durationSeconds ?? 0) > 0;
  const streak = currentStreak(task.history, task.completion?.cycleDate ?? todayIsoDate());

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={classNames(
        "group flex items-center gap-2 rounded-lg border border-transparent px-1 py-1.5 transition-colors hover:border-border-subtle hover:bg-surface-2",
        isDragging && "opacity-30",
      )}
    >
      <span
        {...listeners}
        {...attributes}
        className="flex h-5 w-4 shrink-0 cursor-grab items-center justify-center text-text-muted opacity-40 group-hover:opacity-100 active:cursor-grabbing"
        aria-label="Arrastar para reordenar"
      >
        <GripVertical size={13} />
      </span>

      {timed ? (
        <TaskTimerControl task={task} compact />
      ) : (
        <button
          onClick={() => toggleCompletion(task.id)}
          aria-label={done ? "Desmarcar" : "Concluir"}
          className={classNames(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
            done ? "border-accent-500 bg-accent-500 text-white" : "border-border-strong hover:border-accent-500",
          )}
        >
          {done && <Check size={10} strokeWidth={3.5} />}
        </button>
      )}

      <button
        onClick={(e) => {
          if (swallowClick()) return;
          onEdit({ task, anchor: { x: e.clientX + 8, y: e.clientY + 8 } });
        }}
        className={classNames("min-w-0 flex-1 truncate text-left text-sm text-text-secondary hover:text-text-primary", done && "text-text-muted line-through")}
      >
        {task.title}
      </button>

      {timed && <TaskTimerReadout task={task} />}
      {showHistory && <TaskHistoryTrail history={task.history} />}
      {streak >= 2 && (
        <span
          className={classNames("flex shrink-0 items-center gap-0.5 text-[0.6875rem] font-bold tabular-nums", done ? "text-warning" : "text-warning/70")}
          title={`${streak} dias seguidos`}
        >
          <Flame size={13} />
          {streak}
        </span>
      )}
      <TimeChip time={task.scheduledTime} done={done} />
      <PriorityDot priority={task.priority} />
    </div>
  );
}
