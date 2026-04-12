import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Option = { value: string; label: string };
type ZenTheme = "dark" | "paper" | "paper-light";
type ZenDropdownVariant = "default" | "input" | "button" | "compact";

interface ZenDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options?: Option[];
  label?: string;

  className?: string;
  fullWidth?: boolean;
  variant?: ZenDropdownVariant;

  labelSize?: string; // "text-sm" oder "12px"
  labelColor?: string; // optional override
  disabled?: boolean;

  maxMenuHeight?: number;
  placeholder?: string;
  triggerHeight?: number;

  theme?: ZenTheme;

  /** Overrides the trigger button text (ignores selected option label) */
  triggerLabel?: string;
  /** Extra inline styles merged onto the trigger button */
  triggerStyle?: React.CSSProperties;
  /** Icon node rendered before the trigger text */
  triggerIcon?: React.ReactNode;
  /** Width in px — overrides the default Tailwind width class */
  width?: number;
  /** Custom menu content — render function receives a closeMenu callback.
   *  When set, the options list and keyboard hint are hidden. */
  customMenuContent?: (closeMenu: () => void) => React.ReactNode;
}

function isPx(v?: string) {
  return !!v && v.includes("px");
}

export const ZenDropdown = ({
  value,
  onChange,
  options = [],
  label,
  className = "",
  fullWidth = false,
  variant = "default",
  labelSize,
  labelColor,
  disabled = false,
  maxMenuHeight = 260,
  placeholder = "Auswählen…",
  triggerHeight,
  theme = "paper",
  triggerLabel,
  triggerStyle,
  triggerIcon,
  width,
  customMenuContent,
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

  // Keep old "compact" working as alias for the new "input" style.
  const normalizedVariant: Exclude<ZenDropdownVariant, "compact"> =
    variant === "compact" ? "input" : variant;
  const isInput = normalizedVariant === "input";
  const isButton = normalizedVariant === "button";
  // "button" should visually match ZenRoughButton(size="small"), whose rough border is inset.
  const resolvedTriggerHeight = triggerHeight ?? (isButton ? 40 : undefined);
  const widthClass = width ? "" : (fullWidth ? "w-full" : "w-[320px]");
  const widthStyle = width ? { width: `${width}px` } : undefined;

  const labelClass = isPx(labelSize) ? "" : (labelSize ?? "text-sm");
  const labelStyle = isPx(labelSize) ? { fontSize: labelSize } : undefined;

  // ===== Theme Tokens (zentral) default it is paper =====
  const tokens = useMemo(() => {
    if (theme === "paper-light") {
      return {
        // Trigger
        triggerText: "#1a1a1a",
        triggerBorder: "rgba(172,142,102,0.55)",
        triggerBg: "#d0cbb8",
        triggerHoverBg: "#d9d4c5",
        caret: "#AC8E66",

        // Label
        label: labelColor ?? "#1a1a1a",

        // Menu
        menuBg: "#e8e1d2",
        menuBorder: "rgba(172,142,102,0.55)",
        itemText: "#3f3a32",
        itemActiveBg: "rgba(172,142,102,0.14)",
        itemActiveText: "#1a1a1a",
        itemSelectedBar: "#AC8E66",
        hintText: "#6b6255",
        hintBorder: "rgba(172,142,102,0.28)",
      } as const;
    }

    if (theme === "paper") {
      return {
        // Trigger
        triggerText: "#1a1a1a",
        triggerBorder: "rgba(172,142,102,0.55)",
        triggerBg: "#d0cbb8", 
        triggerHoverBg: "rgba(208,203,184,0.85)",
        caret: "#AC8E66",

        // Label
        label: labelColor ?? "#1a1a1a",

        // Menu
        menuBg: "#1a1a1a",
        menuBorder: "rgba(172,142,102,0.55)",
        itemText: "#d0cbb8",
        itemActiveBg: "rgb(208,203,184)",
        itemActiveText: "#1a1a1a",
        itemSelectedBar: "#AC8E66",
        hintText: "#d0cbb8",
        hintBorder: "rgba(172,142,102,0.35)",
      } as const;
    }

    // dark Titel und Texte sind Dunkel, Menü ist Hell des Dropdown
    return {
      triggerText: "#1a1a1a",
      triggerBorder: "#3a3a3a",
      triggerBg: "transparent",
      triggerHoverBg: "transparent",
      caret: "#1a1a1a",

      label: labelColor ?? "#666",

      menuBg: "#1a1a1a",
      menuBorder: "#3a3a3a",
      itemText: "#888",
      itemActiveBg: "",
      itemActiveText: "#d0cbb8",
      itemSelectedBar: "#AC8E66",
      hintText: "#d0cbb8",
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

  const buttonText = triggerLabel ?? (selected?.label ?? placeholder);

  const triggerClasses = `
    relative ${widthClass} rounded-lg font-mono text-center
    focus:outline-none
    ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
    ${resolvedTriggerHeight ? (isButton ? "text-[9px]" : isInput ? "text-[11px]" : "text-[12px]") : (isInput ? "py-2 text-[11px]" : "py-3 text-[12px]")}
  `;

  return (
    <div ref={rootRef} className={`flex flex-col items-center ${widthClass} ${className}`} style={widthStyle}>
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
          border: `0.5px solid ${open ? tokens.menuBorder : tokens.triggerBorder}`,
          borderRadius: '4px 4px 4px 4px',
          background: open ? tokens.triggerHoverBg : tokens.triggerBg,
          color: tokens.triggerText,
          boxShadow: "none",
          transition: "background 180ms ease, border-color 180ms ease",
          height: resolvedTriggerHeight ? `${resolvedTriggerHeight}px` : undefined,
          minHeight: resolvedTriggerHeight ? `${resolvedTriggerHeight}px` : 32,
          paddingTop: resolvedTriggerHeight ? 0 : undefined,
          paddingBottom: resolvedTriggerHeight ? 0 : undefined,
          ...widthStyle,
          ...triggerStyle,
        }}
        onMouseEnter={(e) => {
          if (!disabled && !open) {
            (e.currentTarget as HTMLButtonElement).style.background = tokens.triggerHoverBg;
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            (e.currentTarget as HTMLButtonElement).style.background = triggerStyle?.background as string ?? tokens.triggerBg;
          }
        }}
        onClick={() => (open ? close() : openMenu())}
        onFocus={() =>
          !disabled && setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)))
        }
      >
        <span className="inline-flex items-center justify-center gap-2 w-full px-2">
          {triggerIcon && <span className="inline-flex shrink-0">{triggerIcon}</span>}
          <span className="truncate max-w-[85%]">{buttonText}</span>
          <span style={{ color: tokens.caret }} className="text-[10px] relative top-[1px] shrink-0">
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
                width: customMenuContent ? undefined : menuPos.width,
                minWidth: customMenuContent ? menuPos.width : undefined,
                backgroundColor: tokens.menuBg,
                border: `1px solid ${tokens.menuBorder}`,
                boxShadow: "none",
                opacity: 1,
              }}
            >
              {customMenuContent ? (
                customMenuContent(close)
              ) : (
                <>
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
                            borderLeft: `3px solid ${isSelected ? tokens.itemSelectedBar : "transparent"}`,
                            paddingLeft: isSelected ? '18px' : '16px',
                            paddingTop: '2px',
                            paddingBottom: '2px',
                            opacity: 1,
                          }}
                        >
                          <div className="truncate">{opt.label}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div
                    className="px-3 py-2 text-center text-[11px] font-mono"
                    style={{
                      color: tokens.hintText,
                      borderTop: `1px solid ${tokens.hintBorder}`,
                    }}
                  >
                    ↑ ↓ wählen · Enter übernehmen · Esc schließen
                  </div>
                </>
              )}
            </div>,
            document.body
          )
        : null}
    </div>
  );
};
