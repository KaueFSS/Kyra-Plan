import { useEffect, useRef } from "react";

/**
 * Releasing a drag over the same element fires a `click` right after
 * `pointerup`, which would open an item's editor after every drag. This
 * returns a check that swallows exactly that trailing click.
 */
export function useClickGuard(isDragging: boolean): () => boolean {
  const dragged = useRef(false);

  useEffect(() => {
    if (isDragging) {
      dragged.current = true;
      return;
    }
    if (!dragged.current) return;
    const id = setTimeout(() => (dragged.current = false), 80);
    return () => clearTimeout(id);
  }, [isDragging]);

  return () => {
    if (!dragged.current) return false;
    dragged.current = false;
    return true;
  };
}
