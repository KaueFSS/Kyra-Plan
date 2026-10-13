import { useEffect, useRef, useState } from "react";
import { DateTime } from "luxon";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, ListTodo, MoreHorizontal, Plus, Trash2 } from "../ui/icons";
import { WidgetCard, IconAction } from "../ui/WidgetCard";
import { InlineAdd } from "../ui/InlineAdd";
import { Popover, anchorBelow, type PopoverAnchor } from "../ui/Popover";
import { ColorSwatches, FieldLabel, PALETTE } from "../ui/FormControls";
import { TaskEditorPopover, type TaskEditTarget } from "./TaskEditorPopover";
import { PriorityDot } from "./PriorityDot";
import { useTaskStore } from "../../stores/taskStore";
import { useTaskListStore } from "../../stores/taskListStore";
import { useSettingsStore, settingsToUpdateInput } from "../../stores/settingsStore";
import { useDashboardStore } from "../../stores/dashboardStore";
import { createListTask } from "../../stores/smartActions";
import { orderByDueDate, orderedListTasks } from "../../utils/listOrder";
import { useLiveTick } from "../../hooks/useLiveTick";
import { useClickGuard } from "../../hooks/useClickGuard";
import { describeTask } from "../../utils/naturalLanguage";
import { durationLabel } from "../../utils/timeHints";
import { classNames } from "../../utils/format";
import type { DropTarget } from "../dnd/types";
import type { TaskWithProgress } from "../../types/task";
import type { TaskList } from "../../types/taskList";

const HIDE_OPTIONS = [0, 1, 3, 6, 12, 24];

/** When a ticked task leaves its list: completedAt (UTC) + the configured hours. */
function leavesAt(task: TaskWithProgress, hours: number): DateTime | null {
  if (task.status !== "completed" || !task.completedAt) return null;
  return DateTime.fromSQL(task.completedAt, { zone: "utc" }).plus({ hours });
}

function dueLabel(task: TaskWithProgress, today: DateTime): { text: string; tone: "overdue" | "today" | "soon" | "later" } | null {
  if (!task.endDate) return task.scheduledTime ? { text: task.scheduledTime, tone: "later" } : null;
  const due = DateTime.fromISO(task.endDate);
  const days = Math.round(due.diff(today.startOf("day"), "days").days);
  const time = task.scheduledTime ? ` ${task.scheduledTime}` : "";
  if (days < 0) return { text: `${due.toFormat("dd/MM")}${time}`, tone: "overdue" };
  if (days === 0) return { text: `Hoje${time}`, tone: "today" };
  if (days === 1) return { text: `Amanhã${time}`, tone: "soon" };
  if (days < 7) return { text: `${due.setLocale("pt-BR").toFormat("ccc")}${time}`, tone: "later" };
  return { text: `${due.toFormat("dd/MM")}${time}`, tone: "later" };
}

/**
 * A plain to-do list (one-off tasks). A tab can hold several of these, each
 * bound to its own list; tasks can be dragged between them or onto a
 * calendar day. Ticked tasks fade out after the configured hours.
 */
export function TaskListWidget({ widgetId, listId }: { widgetId: string; listId?: string }) {
  const lists = useTaskListStore((s) => s.lists);
  const loadLists = useTaskListStore((s) => s.load);
  const loaded = useTaskListStore((s) => s.loaded);
  const single = useTaskStore((s) => s.single);
  const toggleSingle = useTaskStore((s) => s.toggleSingle);
  const reorderSingle = useTaskStore((s) => s.reorderSingle);
  const settings = useSettingsStore((s) => s.settings);
  const [editing, setEditing] = useState<TaskEditTarget | null>(null);
  const [menu, setMenu] = useState<PopoverAnchor | null>(null);
  const now = DateTime.fromMillis(useLiveTick(60_000));

  useEffect(() => {
    if (!loaded) void loadLists();
  }, [loaded, loadLists]);

  // A widget whose list was deleted falls back to the first list.
  const list = lists.find((l) => l.id === listId) ?? lists[0];
  const hours = settings?.doneTasksVisibleHours ?? 3;

  const target: DropTarget = { accepts: "list-task", listId: list?.id ?? "" };
  const { setNodeRef, isOver } = useDroppable({ id: `task-list-${widgetId}`, data: target, disabled: !list });

  // The user's own order (drag to rearrange); ticked tasks sink to the bottom.
  const tasks = orderedListTasks(single, list?.id).filter((t) => {
    const leaves = leavesAt(t, hours);
    return !leaves || leaves > now;
  });
  const open = tasks.filter((t) => t.status !== "completed").length;
  const overdue = tasks.filter((t) => t.status !== "completed" && t.endDate && t.endDate < now.toISODate()!).length;

  if (!list) {
    return (
      <WidgetCard icon={ListTodo} title="Lista de tarefas">
        <p className="px-1 text-xs text-text-muted">Carregando listas…</p>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      icon={ListTodo}
      title={list.name}
      subtitle={
        <span>
          {open === 0 ? (tasks.length ? "Tudo feito por aqui" : "Lista vazia") : `${open} ${open === 1 ? "pendente" : "pendentes"}`}
          {overdue > 0 && <span className="font-medium text-danger"> · {overdue} atrasada{overdue > 1 ? "s" : ""}</span>}
        </span>
      }
      actions={<IconAction icon={MoreHorizontal} label="Opções da lista" onClick={(e) => setMenu(anchorBelow(e.currentTarget))} />}
    >
      <div
        ref={setNodeRef}
        className={classNames(
          "-mx-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto rounded-lg px-1 transition-colors",
          isOver && "bg-accent-500/10 ring-1 ring-accent-500/50",
        )}
      >
        {tasks.length === 0 && (
          <p className="px-1 py-2 text-xs text-text-muted">
            Escreva abaixo, ex.: “Pagar a conta amanhã 10h”. Arraste tarefas entre listas ou para um dia do calendário.
          </p>
        )}
        <SortableContext items={tasks.map((t) => `list-task-${t.id}`)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              list={list}
              now={now}
              hours={hours}
              onToggle={() => toggleSingle(task.id)}
              onEdit={(anchor) => setEditing({ task, anchor })}
            />
          ))}
        </SortableContext>
      </div>

      <div className="mt-2 shrink-0">
        <InlineAdd
          kind="task"
          label="Adicionar tarefa"
          placeholder="Ex.: Pagar a conta amanhã 10h"
          describe={(p) => describeTask(p, p.date ? DateTime.fromISO(p.date).setLocale("pt-BR").toFormat("ccc dd/MM") : undefined)}
          onSubmit={(p) => createListTask(p, list.id)}
        />
      </div>

      <TaskEditorPopover target={editing} onClose={() => setEditing(null)} />
      <ListMenu anchor={menu} onClose={() => setMenu(null)} list={list} widgetId={widgetId} onSortByDate={() => reorderSingle(orderByDueDate(tasks.filter((t) => t.status !== "completed")).concat(tasks.filter((t) => t.status === "completed")).map((t) => t.id))} />
    </WidgetCard>
  );
}

function TaskRow({
  task,
  list,
  now,
  hours,
  onToggle,
  onEdit,
}: {
  task: TaskWithProgress;
  list: TaskList;
  now: DateTime;
  hours: number;
  onToggle: () => void;
  onEdit: (anchor: PopoverAnchor) => void;
}) {
  const done = task.status === "completed";
  // Carries both the drag payload and the drop descriptor (like the daily list).
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver, active } = useSortable({
    id: `list-task-${task.id}`,
    disabled: done,
    data: { type: "list-task", accepts: "list-task", taskId: task.id, listId: list.id, title: task.title, color: list.color },
  });
  const swallowClick = useClickGuard(isDragging);
  // Dragging in from another list: show where it will land.
  const incoming = isOver && !isDragging && (active?.data.current as { listId?: string } | undefined)?.listId !== list.id;
  const due = dueLabel(task, now);
  const leaves = leavesAt(task, hours);

  // Pop + green flash only at the moment it gets ticked.
  const wasDone = useRef(done);
  const [celebrate, setCelebrate] = useState(false);
  useEffect(() => {
    const flipped = done && !wasDone.current;
    wasDone.current = done;
    if (!flipped) return;
    setCelebrate(true);
    const id = setTimeout(() => setCelebrate(false), 900);
    return () => clearTimeout(id);
  }, [done]);

  return (
    <div
      ref={setNodeRef}
      {...(done ? {} : listeners)}
      {...attributes}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={classNames(
        "group relative flex items-center gap-2 rounded-lg px-1 py-1.5 outline-none hover:bg-surface-2",
        !done && "cursor-grab active:cursor-grabbing",
        done && !celebrate && "opacity-55",
        celebrate && "ff-flash",
        isDragging && "z-10 opacity-40",
        incoming && "before:absolute before:inset-x-1 before:-top-px before:h-0.5 before:rounded-full before:bg-accent-500",
      )}
    >
      <span
        className="flex h-5 w-3.5 shrink-0 items-center justify-center text-text-muted opacity-0 transition-opacity group-hover:opacity-100"
        title={done ? undefined : "Arraste para reordenar, mudar de lista ou escolher um dia do calendário"}
      >
        <GripVertical size={12} />
      </span>

      <button
        onClick={onToggle}
        aria-label={done ? "Desmarcar" : "Concluir"}
        className={classNames(
          "flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-md border-2 transition-colors",
          done ? "border-success bg-success text-white" : "hover:bg-[color-mix(in_srgb,var(--list)_15%,transparent)]",
          celebrate && "ff-pop",
        )}
        style={done ? undefined : { borderColor: list.color, ["--list" as string]: list.color }}
      >
        {done && <Check size={11} strokeWidth={3.5} />}
      </button>

      <button
        onClick={(e) => {
          if (swallowClick()) return;
          onEdit({ x: e.clientX + 8, y: e.clientY + 8 });
        }}
        className={classNames("min-w-0 flex-1 truncate text-left text-sm text-text-primary", done && "text-text-muted line-through")}
      >
        {task.title}
      </button>

      {done && leaves ? (
        <span className="shrink-0 text-[0.6875rem] text-text-muted" title="Tarefas concluídas saem da lista depois de um tempo (ajuste no menu ⋯)">
          some em {durationLabel(Math.max(1, leaves.diff(now, "minutes").minutes))}
        </span>
      ) : (
        due && (
          <span
            className={classNames(
              "shrink-0 rounded-md px-1.5 py-px text-[0.6875rem] font-semibold tabular-nums",
              due.tone === "overdue" && "bg-danger/15 text-danger",
              due.tone === "today" && "bg-accent-500/15 text-accent-400",
              due.tone === "soon" && "bg-warning/15 text-warning",
              due.tone === "later" && "font-normal text-text-muted",
            )}
          >
            {due.text}
          </span>
        )
      )}
      {task.priority !== "medium" && <PriorityDot priority={task.priority} />}
    </div>
  );
}

/** Rename / recolor / switch / create / delete — everything about this list in one place. */
function ListMenu({
  anchor,
  onClose,
  list,
  widgetId,
  onSortByDate,
}: {
  anchor: PopoverAnchor | null;
  onClose: () => void;
  list: TaskList;
  widgetId: string;
  onSortByDate: () => void;
}) {
  const { lists, create, update, remove } = useTaskListStore();
  const { settings, update: updateSettings } = useSettingsStore();
  const setWidgetList = useDashboardStore((s) => s.setWidgetList);
  const [name, setName] = useState(list.name);
  const [armDelete, setArmDelete] = useState(false);

  useEffect(() => {
    if (anchor) {
      setName(list.name);
      setArmDelete(false);
    }
  }, [anchor, list.name]);

  const saveName = () => {
    if (name.trim() && name.trim() !== list.name) void update(list.id, name.trim(), list.color);
  };

  const newList = async () => {
    const color = PALETTE[lists.length % PALETTE.length];
    const created = await create(`Lista ${lists.length + 1}`, color);
    if (created) {
      setWidgetList(widgetId, created.id);
      onClose();
    }
  };

  return (
    <Popover anchor={anchor} onClose={onClose} title="Lista" width={300}>
      <div className="space-y-3">
        <div>
          <FieldLabel>Nome</FieldLabel>
          <input
            className="ff-input w-full"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === "Enter" && (saveName(), onClose())}
          />
        </div>
        <div>
          <FieldLabel>Cor</FieldLabel>
          <ColorSwatches value={list.color} onChange={(color) => void update(list.id, list.name, color)} />
        </div>

        {lists.length > 1 && (
          <div>
            <FieldLabel>Mostrar outra lista aqui</FieldLabel>
            <div className="space-y-0.5">
              {lists
                .filter((l) => l.id !== list.id)
                .map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      setWidgetList(widgetId, l.id);
                      onClose();
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text-secondary hover:bg-surface-2 hover:text-text-primary"
                  >
                    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: l.color }} />
                    {l.name}
                  </button>
                ))}
            </div>
          </div>
        )}

        <button
          className="ff-btn-secondary w-full py-1.5 text-xs"
          onClick={() => {
            onSortByDate();
            onClose();
          }}
        >
          Ordenar por data
        </button>

        <button className="ff-btn-secondary w-full py-1.5 text-xs" onClick={() => void newList()}>
          <Plus size={13} /> Nova lista neste widget
        </button>

        {settings && (
          <div>
            <FieldLabel>Concluídas saem da lista depois de</FieldLabel>
            <div className="grid grid-cols-6 gap-1">
              {HIDE_OPTIONS.map((h) => (
                <button
                  key={h}
                  onClick={() => void updateSettings({ ...settingsToUpdateInput(settings), doneTasksVisibleHours: h })}
                  className={classNames(
                    "rounded-md py-1 text-xs font-medium transition-colors",
                    settings.doneTasksVisibleHours === h ? "bg-accent-500 text-white" : "bg-surface-2 text-text-secondary hover:text-text-primary",
                  )}
                  title={h === 0 ? "Somem na hora" : `${h} hora(s)`}
                >
                  {h === 0 ? "Já" : `${h}h`}
                </button>
              ))}
            </div>
          </div>
        )}

        {lists.length > 1 && (
          <button
            onClick={async () => {
              if (!armDelete) return setArmDelete(true);
              if (await remove(list.id)) onClose();
            }}
            className={classNames(
              "flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors",
              armDelete ? "bg-danger text-white" : "text-danger hover:bg-danger/10",
            )}
          >
            <Trash2 size={13} /> {armDelete ? "Confirmar: excluir a lista e as tarefas dela" : "Excluir lista"}
          </button>
        )}
      </div>
    </Popover>
  );
}
