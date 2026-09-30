import { useEffect } from "react";

/** Window size the HUD was designed at (a typical notebook window). Below it
 * the UI only shrinks a little — readable text matters more than density. */
const DESIGN_WIDTH = 1440;
const DESIGN_HEIGHT = 800;
const MIN_SCALE = 0.92;
const MAX_SCALE = 1.3;

export function computeUiScale(width: number, height: number): number {
  const fit = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, fit));
}

/**
 * Scales the whole interface with the window so every screen gets the same
 * layout, just bigger or smaller. Tailwind sizes are rem-based, so changing
 * the root font-size scales text and spacing; `--ui-scale` lets the few
 * px-sized things (Lucide icons, see index.css) follow along.
 */
export function useUiScale(): void {
  useEffect(() => {
    const apply = () => {
      const scale = computeUiScale(window.innerWidth, window.innerHeight);
      const root = document.documentElement;
      root.style.fontSize = `${16 * scale}px`;
      root.style.setProperty("--ui-scale", scale.toFixed(3));
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);
}
