import React, { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleQuestion } from "@fortawesome/free-solid-svg-icons";

interface ZenInlineHintProps {
  /** Kurzer Erklärtext — 1–2 Sätze, keine Doku-Seite in Miniatur */
  text: string;
  title?: string;
  className?: string;
}

/**
 * Kleines Fragezeichen-Icon direkt neben einem Element, das bei Klick eine
 * kurze Erklärung als Popover zeigt — kein Modal, keine Navigation weg von
 * dem, was der Nutzer gerade tut. Gedacht für "was bedeutet das hier"
 * (Funktionserklärung), nicht für "warum funktioniert es gerade nicht"
 * (dafür gibt es die kontextuellen Diagnosen).
 */
export const ZenInlineHint: React.FC<ZenInlineHintProps> = ({ text, title, className = "" }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={wrapperRef} className={className} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label={title ?? "Erklärung anzeigen"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 14,
          height: 14,
          borderRadius: "50%",
          border: "1px solid rgba(172,142,102,0.6)",
          background: open ? "rgba(172,142,102,0.15)" : "transparent",
          color: "#AC8E66",
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
        }}
      >
        <FontAwesomeIcon icon={faCircleQuestion} style={{ fontSize: 9 }} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "18px",
            left: 0,
            zIndex: 50,
            width: "230px",
            padding: "9px 11px",
            borderRadius: "6px",
            background: "#1a1a1a",
            border: "0.5px solid rgba(172,142,102,0.4)",
            boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: "9px",
            color: "#d0cbb8",
            lineHeight: 1.5,
          }}
        >
          {title && (
            <div style={{ color: "#AC8E66", fontWeight: 600, marginBottom: 4, fontSize: "9px" }}>
              {title}
            </div>
          )}
          {text}
        </div>
      )}
    </div>
  );
};
