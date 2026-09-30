import { useCallback, useEffect, useState } from "react";

/** Width/height of an element, kept up to date with a ResizeObserver. */
export function useElementSize<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const ref = useCallback((node: T | null) => setElement(node), []);

  useEffect(() => {
    if (!element) return;
    const update = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return { ref, ...size };
}
