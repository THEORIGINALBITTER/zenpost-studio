import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./zenCursor.css";

export default function ZenCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.add("zen-cursor-active");
    const el = cursorRef.current;
    if (!el) return;

    let visible = false;

    const move = (e: MouseEvent) => {
      // Direkt DOM-Update — kein React setState, kein Re-Render
      el.style.transform = `translate(${e.clientX - 6}px, ${e.clientY - 6}px)`;
      if (!visible) {
        visible = true;
        el.classList.add("visible");
      }
    };

    window.addEventListener("mousemove", move, { passive: true });
    return () => {
      window.removeEventListener("mousemove", move);
      document.body.classList.remove("zen-cursor-active");
    };
  }, []);

  const cursor = (
    <div ref={cursorRef} className="zen-cursor" aria-hidden="true">
      <div className="zen-core" />
      <div className="zen-ripple" />
    </div>
  );

  return typeof document !== "undefined" ? createPortal(cursor, document.body) : null;
}
