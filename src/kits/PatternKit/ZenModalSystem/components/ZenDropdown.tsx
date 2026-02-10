import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Option = { value: string; label: string };
type ZenTheme = "dark" | "paper";

interface ZenDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  label?: string;

  className?: string;
  fullWidth?: boolean;
  variant?: "default" | "compact";

  labelSize?: string; // "text-sm" oder "12px"
  labelColor?: string; // optional override
  disabled?: boolean;

  maxMenuHeight?: number;
  placeholder?: string;

  theme?: ZenTheme; // ✅ NEW
}

function isPx(v?: string) {
  return !!v && v.includes("px");
}

export const ZenDropdown = ({
  value,
  onChange,
  options,
  label,
  className = "",
  fullWidth = false,
  variant = "default",
  labelSize,
  labelColor,
  disabled = false,
  maxMenuHeight = 260,
  placeholder = "Auswählen…",
  theme = "dark", // ✅ default
}: ZenDropdownProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(() =>
    Math.max(0, options.findIndex((o) => o.value === value))
  );

  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  const [menuPos, setMenuPos] = useState<{ left: number; top: number; width: number } | null>(
    null
  );

  const isCompact = variant === "compact";
  const widthClass = fullWidth ? "w-full" : "w-[320px]";

  const labelClass = isPx(labelSize) ? "" : (labelSize ?? "text-sm");
  const labelStyle = isPx(labelSize) ? { fontSize: labelSize } : undefined;

  // ===== Theme Tokens (zentral) =====
  const tokens = useMemo(() => {
    if (theme === "paper") {
      return {
        // Trigger
        triggerText: "#3a3a3a",
        triggerBorder: "rgba(172,142,102,0.55)",
        triggerBg: "rgba(255,255,255,0.22)", // ganz leicht “eingelassen”
        triggerHoverBg: "rgba(172,142,102,0.12)",
        caret: "#AC8E66",

        // Label
        label: labelColor ?? "#555",

        // Menu
        menuBg: "#EDE6D8",
        menuBorder: "rgba(172,142,102,0.55)",
        menuShadow: "0 18px 40px rgba(0,0,0,0.35)",
        itemText: "#3a3a3a",
        itemActiveBg: "rgba(172,142,102,0.18)",
        itemActiveText: "#AC8E66",
        itemSelectedBar: "#AC8E66",
        hintText: "#7a6a52",
        hintBorder: "rgba(172,142,102,0.35)",
      } as const;
    }

    // dark Titel und Texte sind Dunkel, Menü ist Hell des Dropdown
    return {
      triggerText: "#555",
      triggerBorder: "#3a3a3a",
      triggerBg: "transparent",
      triggerHoverBg: "rgba(172,142,102,0.10)",
      caret: "#AC8E66",

      label: labelColor ?? "#666",

      menuBg: "#0A0A0A",
      menuBorder: "rgba(172,142,102,0.6)",
      menuShadow: "0 18px 40px rgba(0,0,0,0.55)",
      itemText: "#888",
      itemActiveBg: "rgba(201,201,197,0.1)",
      itemActiveText: "#AC8E66",
      itemSelectedBar: "#AC8E66",
      hintText: "#777",
      hintBorder: "#3a3a3a",
    } as const;
  }, [theme, labelColor]);

  // Keep active index in sync
  useEffect(() => {
    const idx = options.findIndex((o) => o.value === value);
    if (idx >= 0) setActiveIndex(idx);
  }, [value, options]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const openMenu = () => {
    if (disabled) return;
    setOpen(true);
  };

  // Position for portal menu
  useEffect(() => {
    if (!open) return;

    const updatePos = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuPos({
        left: Math.round(rect.left),
        top: Math.round(rect.bottom + 8),
        width: Math.round(rect.width),
      });
    };

    updatePos();

    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);

    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;

    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      const root = rootRef.current;
      const menu = document.getElementById("zen-dropdown-portal-menu");
      if (!root) return;

      const clickedInsideRoot = root.contains(t);
      const clickedInsideMenu = menu ? menu.contains(t) : false;

      if (!clickedInsideRoot && !clickedInsideMenu) close();
    };

    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(options.length - 1, i + 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const opt = options[activeIndex];
        if (opt) {
          onChange(opt.value);
          close();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, activeIndex, options, onChange]);

  // Ensure active option visible
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLDivElement>(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const buttonText = selected?.label ?? placeholder;

  const triggerClasses = `
    relative ${widthClass} rounded-lg font-mono text-center
    focus:outline-none
    ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
    ${isCompact ? "py-2 text-[11px]" : "py-3 text-[12px]"}
  `;

  return (
    <div ref={rootRef} className={`flex flex-col items-center ${widthClass} ${className}`}>
      {label ? (
        <div
          className={`mb-3 text-center font-mono ${labelClass} select-none`}
          style={{ ...labelStyle, color: tokens.label }}
        >
          {label}
        </div>
      ) : null}

      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        className={triggerClasses}
        style={{
          border: `1px solid ${tokens.triggerBorder}`,
          background: tokens.triggerBg,
          color: tokens.triggerText,
          transition: "background 180ms ease, border-color 180ms ease",
        }}
        onMouseEnter={() => {
          if (!disabled) {
            // leichter Hover “Glow”
            (buttonRef.current as HTMLButtonElement | null)?.style.setProperty(
              "background",
              tokens.triggerHoverBg
            );
          }
        }}
        onMouseLeave={() => {
          (buttonRef.current as HTMLButtonElement | null)?.style.setProperty(
            "background",
            tokens.triggerBg
          );
        }}
        onClick={() => (open ? close() : openMenu())}
        onFocus={() =>
          !disabled && setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)))
        }
      >
        <span className="inline-flex items-center justify-center gap-2 w-full">
          <span className="truncate max-w-[85%]">{buttonText}</span>
          <span style={{ color: tokens.caret }} className="text-[10px] relative top-[1px]">
            ▾
          </span>
        </span>
      </button>

      {/* PORTAL MENU */}
      {open && menuPos
        ? createPortal(
            <div
              id="zen-dropdown-portal-menu"
              className="fixed z-[999999] rounded-xl overflow-hidden"
              style={{
                left: menuPos.left,
                top: menuPos.top,
                width: menuPos.width,
                backgroundColor: tokens.menuBg,
                border: `1px solid ${tokens.menuBorder}`,
                boxShadow: tokens.menuShadow,
                opacity: 1,
              }}
            >
              <div ref={listRef} className="py-2 overflow-y-auto" style={{ maxHeight: maxMenuHeight }}>
                {options.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isActive = idx === activeIndex;

                  return (
                    <div
                      key={opt.value}
                      data-idx={idx}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onChange(opt.value);
                        close();
                      }}
                      className="px-4 py-2 font-mono text-[11px] select-none cursor-pointer text-left"
                      style={{
                        background: isActive ? tokens.itemActiveBg : "transparent",
                        color: isActive ? tokens.itemActiveText : tokens.itemText,
                        borderLeft: `2px solid ${isSelected ? tokens.itemSelectedBar : "transparent"}`,
                        opacity: 1,
                      }}
                    >
                      <div className="truncate">{opt.label}</div>
                    </div>
                  );
                })}
              </div>

              <div
                className="px-3 py-2 text-center text-[10px] font-mono"
                style={{
                  color: tokens.hintText,
                  borderTop: `1px solid ${tokens.hintBorder}`,
                }}
              >
                ↑ ↓ wählen · Enter übernehmen · Esc schließen
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
};
