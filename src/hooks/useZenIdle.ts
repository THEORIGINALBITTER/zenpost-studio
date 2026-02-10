import { useEffect, useRef, useState } from "react";

export function useZenIdle(delay = 2000) {
  const [idle, setIdle] = useState(false);
  const timer = useRef<number | null>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const reset = (event?: Event) => {
      if (event && "isTrusted" in event && !(event as Event).isTrusted) {
        return;
      }
      if (event instanceof PointerEvent) {
        const prev = lastPos.current;
        const next = { x: event.clientX, y: event.clientY };
        if (prev && prev.x === next.x && prev.y === next.y && event.movementX === 0 && event.movementY === 0) {
          return;
        }
        lastPos.current = next;
      }
      setIdle(false);
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
      timer.current = window.setTimeout(() => {
        setIdle(true);
      }, delay);
    };

    window.addEventListener("pointermove", reset);
    window.addEventListener("keydown", reset);
    window.addEventListener("mousedown", reset);
    window.addEventListener("touchstart", reset);

    reset();

    return () => {
      window.removeEventListener("pointermove", reset);
      window.removeEventListener("keydown", reset);
      window.removeEventListener("mousedown", reset);
      window.removeEventListener("touchstart", reset);
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    };
  }, [delay]);

  return idle;
}
