import { useEffect, useRef, useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Home, LayoutGrid, Palette, Pencil, Plus, RotateCcw, Search, Settings, X } from "../ui/icons";
import { useDashboardStore, errorMessage } from "../../stores/dashboardStore";
import { useUiStore } from "../../stores/uiStore";
import { Popover, anchorBelow, type PopoverAnchor } from "../ui/Popover";
import { FieldLabel } from "../ui/FormControls";
import { TAB_TEMPLATES } from "../../utils/gridLayout";
import { WIDGET_CATALOG } from "./widgetCatalog";
import { AppearancePopover } from "./AppearancePopover";
import { NowPill } from "../agenda/NowPill";
import { classNames } from "../../utils/format";
import type { DashboardTab } from "../../types/dashboard";

/**
 * Obsidian-style tab strip for the dashboard: click to switch, double-click
 * to rename, drag to reorder, × to delete, + to create (blank or from a
 * template). The right side holds the edit-mode controls for the open tab.
 */
export function TabBar() {
  const { tabs, activeTabId, editing, setActive, setEditing, reorderTabs, resetHome } = useDashboardStore();
  const { openSearch, setPage } = useUiStore();
  const [newTabAnchor, setNewTabAnchor] = useState<PopoverAnchor | null>(null);
  const [catalogAnchor, setCatalogAnchor] = useState<PopoverAnchor | null>(null);
  const [appearanceAnchor, setAppearanceAnchor] = useState<PopoverAnchor | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = tabs.map((t) => t.id);
    void reorderTabs(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="flex shrink-0 items-center gap-2 px-3 pt-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={tabs.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <TabChip key={tab.id} tab={tab} active={tab.id === activeTabId} onSelect={() => setActive(tab.id)} canDelete={tabs.length > 1} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        onClick={(e) => setNewTabAnchor(anchorBelow(e.currentTarget))}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary"
        title="Nova guia"
        aria-label="Nova guia"
      >
        <Plus size={16} />
      </button>

      <div className="flex min-w-0 flex-1 justify-center px-2">{!editing && <NowPill />}</div>

      <div className="flex shrink-0 items-center gap-1.5">
        {editing ? (
          <>
            <button className="ff-btn-secondary px-2.5 py-1.5 text-xs" onClick={(e) => setCatalogAnchor(anchorBelow(e.currentTarget))}>
              <LayoutGrid size={14} /> Adicionar widget
            </button>
            {activeTabId === "home" && (
              <button className="ff-btn-ghost px-2.5 py-1.5 text-xs" onClick={resetHome} title="Voltar ao layout original do Início">
                <RotateCcw size={13} /> Restaurar padrão
              </button>
            )}
            <button className="ff-btn-primary px-3 py-1.5 text-xs" onClick={() => setEditing(false)}>
              <Check size={14} /> Concluir
            </button>
          </>
        ) : (
          <>
            <button
              onClick={openSearch}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-text-primary"
              title="Buscar (Ctrl+Espaço)"
              aria-label="Buscar"
            >
              <Search size={15} />
            </button>
            <button
              onClick={(e) => setAppearanceAnchor(anchorBelow(e.currentTarget))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-text-primary"
              title="Cores do app"
              aria-label="Cores do app"
            >
              <Palette size={15} />
            </button>
            <button
              onClick={() => setPage("settings")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-text-primary"
              title="Configurações"
              aria-label="Configurações"
            >
              <Settings size={15} />
            </button>
            <button
              className="ff-btn-ghost px-2.5 py-1.5 text-xs"
              onClick={() => setEditing(true)}
              title={`Organizar os widgets de “${activeTab?.name ?? ""}”`}
            >
              <Pencil size={13} /> Editar guia
            </button>
          </>
        )}
      </div>

      <NewTabPopover anchor={newTabAnchor} onClose={() => setNewTabAnchor(null)} />
      <AppearancePopover anchor={appearanceAnchor} onClose={() => setAppearanceAnchor(null)} />
      <CatalogPopover anchor={catalogAnchor} onClose={() => setCatalogAnchor(null)} tab={activeTab} />
    </div>
  );
}

function TabChip({ tab, active, onSelect, canDelete }: { tab: DashboardTab; active: boolean; onSelect: () => void; canDelete: boolean }) {
  const { renameTab, deleteTab } = useDashboardStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tab.id });
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(tab.name);
  const [armedDelete, setArmedDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) inputRef.current?.select();
  }, [renaming]);

  const commitRename = async () => {
    setRenaming(false);
    if (name.trim() && name.trim() !== tab.name) {
      try {
        await renameTab(tab.id, name);
      } catch {
        setName(tab.name);
      }
    } else {
      setName(tab.name);
    }
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      onClick={onSelect}
      onDoubleClick={() => setRenaming(true)}
      title="Clique para abrir · duplo clique para renomear · arraste para reordenar"
      className={classNames(
        "group flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors",
        active
          ? "border-border-strong bg-surface-2 font-medium text-text-primary"
          : "border-transparent text-text-muted hover:bg-surface-1 hover:text-text-secondary",
        isDragging && "opacity-50",
      )}
    >
      {tab.id === "home" && <Home size={13} className={active ? "text-accent-400" : ""} />}
      {renaming ? (
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") void commitRename();
            if (e.key === "Escape") {
              setName(tab.name);
              setRenaming(false);
            }
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-28 bg-transparent outline-none"
          maxLength={40}
        />
      ) : (
        <span className="max-w-[10rem] truncate">{tab.name}</span>
      )}
      {canDelete && !renaming && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (armedDelete) void deleteTab(tab.id);
            else setArmedDelete(true);
          }}
          onBlur={() => setArmedDelete(false)}
          title={armedDelete ? "Clique de novo para excluir a guia" : "Excluir guia"}
          className={classNames(
            "rounded transition-all",
            armedDelete
              ? "bg-danger px-1.5 text-[0.6875rem] font-semibold text-white"
              : "p-0.5 text-text-muted opacity-0 hover:text-danger group-hover:opacity-100",
          )}
        >
          {armedDelete ? "Excluir?" : <X size={12} />}
        </button>
      )}
    </div>
  );
}

function NewTabPopover({ anchor, onClose }: { anchor: PopoverAnchor | null; onClose: () => void }) {
  const createTab = useDashboardStore((s) => s.createTab);
  const restoreHome = useDashboardStore((s) => s.restoreHome);
  const hasHome = useDashboardStore((s) => s.tabs.some((t) => t.id === "home"));
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("blank");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (anchor) {
      setName("");
      setTemplateId("blank");
      setError(null);
    }
  }, [anchor]);

  const create = async () => {
    const template = TAB_TEMPLATES.find((t) => t.id === templateId) ?? TAB_TEMPLATES[0];
    const finalName = name.trim() || (template.id === "blank" ? "Nova guia" : template.name);
    try {
      await createTab(finalName, template.widgets);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Popover anchor={anchor} onClose={onClose} title="Nova guia" width={300}>
      <div className="space-y-3" onKeyDown={(e) => e.key === "Enter" && create()}>
        {!hasHome && (
          <button
            onClick={async () => {
              try {
                await restoreHome();
                onClose();
              } catch (err) {
                setError(errorMessage(err));
              }
            }}
            className="flex w-full items-center gap-2.5 rounded-lg border border-accent-500 bg-accent-500/10 px-3 py-2 text-left transition-colors hover:bg-accent-500/15"
          >
            <Home size={20} className="ff-glyph shrink-0" />
            <span>
              <span className="block text-sm font-medium text-text-primary">Restaurar guia Início</span>
              <span className="block text-[0.75rem] text-text-muted">A guia padrão, com tudo em um lugar só</span>
            </span>
          </button>
        )}
        <input autoFocus className="ff-input w-full" placeholder="Nome (ex.: Estudos, Trabalho)" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        <div>
          <FieldLabel>Começar com</FieldLabel>
          <div className="space-y-1">
            {TAB_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => setTemplateId(template.id)}
                className={classNames(
                  "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                  templateId === template.id ? "border-accent-500 bg-accent-500/10" : "border-border-subtle hover:border-border-strong",
                )}
              >
                <span className="block text-sm font-medium text-text-primary">{template.name}</span>
                <span className="block text-[0.75rem] text-text-muted">{template.description}</span>
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        <button className="ff-btn-primary w-full py-2 text-sm" onClick={create}>
          Criar guia
        </button>
      </div>
    </Popover>
  );
}

function CatalogPopover({ anchor, onClose, tab }: { anchor: PopoverAnchor | null; onClose: () => void; tab: DashboardTab | undefined }) {
  const addWidget = useDashboardStore((s) => s.addWidget);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (anchor) setError(null);
  }, [anchor]);

  const present = new Set(tab?.widgets.map((w) => w.type) ?? []);

  return (
    <Popover anchor={anchor} onClose={onClose} title="Adicionar widget" width={320}>
      <div className="max-h-[60vh] space-y-1 overflow-y-auto">
        {WIDGET_CATALOG.map((meta) => {
          const already = present.has(meta.type);
          return (
            <button
              key={meta.type}
              disabled={already}
              onClick={() => {
                const problem = addWidget(meta.type);
                if (problem) setError(problem);
                else onClose();
              }}
              className={classNames(
                "flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors",
                already ? "cursor-default opacity-40" : "hover:bg-surface-2",
              )}
            >
              <meta.icon size={24} className="ff-glyph mt-0.5 shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-text-primary">{meta.label}</span>
                <span className="block text-[0.75rem] text-text-muted">{already ? "Já está nesta guia" : meta.description}</span>
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </Popover>
  );
}
