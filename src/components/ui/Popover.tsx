import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "./icons";

export interface PopoverAnchor {
  x: number;
  y: number;
}

interface PopoverProps {
  anchor: PopoverAnchor | null;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}

const VIEWPORT_MARGIN = 12;

/** Small floating editor anchored to a screen point. Rendered in a portal
 * so it is never clipped by a card's `overflow` and always stays inside
 * the window — this is what replaces modals for creating/editing in the HUD. */
export function Popover({ anchor, onClose, title, children, width = 300 }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return;
    const height = ref.current.offsetHeight;
    const actualWidth = ref.current.offsetWidth;
    const left = Math.min(Math.max(VIEWPORT_MARGIN, anchor.x), window.innerWidth - actualWidth - VIEWPORT_MARGIN);
    const fitsBelow = anchor.y + height + VIEWPORT_MARGIN <= window.innerHeight;
    const top = fitsBelow ? anchor.y : Math.max(VIEWPORT_MARGIN, anchor.y - height);
    setPosition({ left, top });
  }, [anchor, width]);

  useEffect(() => {
    if (!anchor) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // Deferred so the click that opened the popover doesn't immediately close it.
    const id = setTimeout(() => window.addEventListener("pointerdown", onPointerDown), 0);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(id);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [anchor, onClose]);

  if (!anchor) return null;

  return createPortal(
    <div
      ref={ref}
      data-overlay
      style={{
        // `width` is given at 100% UI scale; rem keeps the popover in step with its text.
        width: `${width / 16}rem`,
        maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
        left: position?.left ?? anchor.x,
        top: position?.top ?? anchor.y,
        visibility: position ? "visible" : "hidden",
      }}
      className="fixed z-[60] rounded-xl border border-border-strong bg-surface-1 p-3 shadow-2xl shadow-black/50"
    >
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{title}</p>
        <button onClick={onClose} className="rounded-md p-0.5 text-text-muted hover:bg-surface-2 hover:text-text-primary" aria-label="Fechar">
          <X size={14} />
        </button>
      </div>
      {children}
    </div>,
    document.body,
  );
}

/** Anchor a popover just below the element that was clicked. */
export function anchorBelow(el: Element): PopoverAnchor {
  const rect = el.getBoundingClientRect();
  return { x: rect.left, y: rect.bottom + 6 };
}
