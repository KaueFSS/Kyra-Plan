import { useMemo, useState } from "react";
import ReactGridLayout from "react-grid-layout";
import { getCompactor } from "react-grid-layout/core";
import "react-grid-layout/css/styles.css";
import { GripHorizontal, LayoutGrid, Plus, X } from "../ui/icons";
import { useDashboardStore } from "../../stores/dashboardStore";
import { useElementSize } from "../../hooks/useElementSize";
import { GRID_COLS, GRID_ROWS, WIDGET_SIZES, findFreeSpot } from "../../utils/gridLayout";
import { WIDGET_CATALOG, WIDGET_META } from "./widgetCatalog";
import { WidgetRenderer } from "./WidgetRenderer";
import { classNames } from "../../utils/format";
import type { DashboardTab, WidgetPlacement } from "../../types/dashboard";

/** Free placement: no auto-compaction, and a widget can't be dropped on another. */
const compactor = getCompactor(null, false, true);

interface WidgetGridProps {
  tab: DashboardTab;
  editing: boolean;
  range: { start: string; end: string };
}

/**
 * A tab's widgets on a 12x12 grid that always fills the screen (row height
 * is derived from the available height, so there's never a page scroll).
 * In edit mode widgets get a drag bar, a resize corner and a remove button.
 */
export function WidgetGrid({ tab, editing, range }: WidgetGridProps) {
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const { setWidgets, removeWidget } = useDashboardStore();

  const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const gap = Math.round(rootPx * 0.75);
  const rowHeight = Math.max(4, (height - gap * (GRID_ROWS - 1)) / GRID_ROWS);

  const layout = useMemo(
    () =>
      tab.widgets.map((w) => ({
        i: w.i,
        x: w.x,
        y: w.y,
        w: w.w,
        h: w.h,
        minW: WIDGET_SIZES[w.type]?.minW ?? 1,
        minH: WIDGET_SIZES[w.type]?.minH ?? 1,
      })),
    [tab.widgets],
  );

  const onLayoutChange = (next: readonly { i: string; x: number; y: number; w: number; h: number }[]) => {
    const byId = new Map(tab.widgets.map((w) => [w.i, w]));
    const updated: WidgetPlacement[] = next
      .map((item) => {
        const widget = byId.get(item.i);
        return widget ? { ...widget, x: item.x, y: item.y, w: item.w, h: item.h } : null;
      })
      .filter((w): w is WidgetPlacement => !!w);
    const changed = updated.some((w) => {
      const before = byId.get(w.i)!;
      return before.x !== w.x || before.y !== w.y || before.w !== w.w || before.h !== w.h;
    });
    if (changed) setWidgets(tab.id, updated);
  };

  return (
    <div ref={ref} className={classNames("relative h-full min-h-0 w-full", editing && "rounded-xl ff-grid-editing")}>
      {tab.widgets.length === 0 && <EmptyTab tab={tab} />}
      {width > 0 && height > 0 && (
        <ReactGridLayout
          width={width}
          layout={layout}
          autoSize={false}
          style={{ height }}
          gridConfig={{ cols: GRID_COLS, rowHeight, margin: [gap, gap], containerPadding: [0, 0], maxRows: GRID_ROWS }}
          dragConfig={{ enabled: editing, bounded: true, handle: ".widget-drag-handle" }}
          resizeConfig={{ enabled: editing, handles: ["se"] }}
          compactor={compactor}
          onLayoutChange={onLayoutChange}
        >
          {tab.widgets.map((widget) => (
            <div key={widget.i} className="min-h-0">
              <WidgetFrame widget={widget} editing={editing} range={range} onRemove={() => removeWidget(widget.i)} />
            </div>
          ))}
        </ReactGridLayout>
      )}
    </div>
  );
}

function WidgetFrame({
  widget,
  editing,
  range,
  onRemove,
}: {
  widget: WidgetPlacement;
  editing: boolean;
  range: { start: string; end: string };
  onRemove: () => void;
}) {
  const meta = WIDGET_META[widget.type];

  return (
    <div className="relative h-full min-h-0">
      <div className={classNames("h-full min-h-0", editing && "pointer-events-none select-none")}>
        <WidgetRenderer type={widget.type} range={range} />
      </div>

      {editing && (
        <div className="absolute inset-0 flex flex-col overflow-hidden rounded-xl border-2 border-dashed border-accent-500/60 bg-surface-0/75 backdrop-blur-[2px]">
          <div className="widget-drag-handle flex cursor-grab items-center gap-2 bg-surface-2 px-3 py-2 active:cursor-grabbing">
            <GripHorizontal size={14} className="text-text-muted" />
            {meta && <meta.icon size={14} className="text-accent-400" />}
            <span className="flex-1 truncate text-xs font-semibold text-text-primary">{meta?.label ?? widget.type}</span>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onRemove}
              className="rounded-md p-1 text-text-muted hover:bg-danger/15 hover:text-danger"
              aria-label={`Remover ${meta?.label ?? "widget"}`}
              title="Remover da guia"
            >
              <X size={13} />
            </button>
          </div>
          <p className="m-auto rounded-full bg-surface-2 px-3 py-1 text-center text-[0.75rem] text-text-secondary">
            Arraste pela barra · redimensione pelo canto inferior
          </p>
        </div>
      )}
    </div>
  );
}

/** A blank tab invites you to add widgets right away. */
function EmptyTab({ tab }: { tab: DashboardTab }) {
  const { setWidgets } = useDashboardStore();
  const [error, setError] = useState<string | null>(null);

  const add = (type: WidgetPlacement["type"]) => {
    const spot = findFreeSpot(tab.widgets, type);
    if (!spot) return setError("Sem espaço livre.");
    setWidgets(tab.id, [...tab.widgets, { i: `${type}-${Date.now().toString(36)}`, type, ...spot }]);
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <LayoutGrid size={44} strokeWidth={1.6} className="ff-glyph" />
      <div>
        <p className="text-base font-semibold text-text-primary">“{tab.name}” está vazia</p>
        <p className="mt-1 text-sm text-text-muted">Escolha o que colocar nesta guia. Depois você pode arrastar e redimensionar.</p>
      </div>
      <div className="grid w-full max-w-3xl grid-cols-3 gap-2">
        {WIDGET_CATALOG.map((meta) => (
          <button
            key={meta.type}
            onClick={() => add(meta.type)}
            className="flex items-start gap-2.5 rounded-xl border border-border-subtle bg-surface-1 p-3 text-left transition-colors hover:border-accent-500"
          >
            <meta.icon size={26} className="ff-glyph mt-0.5 shrink-0" />
            <span className="min-w-0">
              <span className="flex items-center gap-1 text-sm font-medium text-text-primary">
                {meta.label} <Plus size={12} className="text-text-muted" />
              </span>
              <span className="block text-[0.75rem] leading-snug text-text-muted">{meta.description}</span>
            </span>
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
