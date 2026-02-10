import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./zenCursor.css";

type CursorPos = {
  x: number;
  y: number;
};

export default function ZenCursor() {
  const [pos, setPos] = useState<CursorPos>({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      if (!visible) setVisible(true);
    };

    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [visible]);

  const cursor = (
    <div
      className={`zen-cursor ${visible ? "visible" : ""}`}
      style={{ left: pos.x, top: pos.y }}
      aria-hidden="true"
    >
      <div className="zen-core"></div>
      <div className="zen-ripple"></div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(cursor, document.body) : null;
}
