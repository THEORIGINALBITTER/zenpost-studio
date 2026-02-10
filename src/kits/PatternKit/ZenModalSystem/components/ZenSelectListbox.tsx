import { useEffect, useMemo, useRef, useState } from "react";

type Option = { value: string; label: string };

interface ZenSelectListboxProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  maxMenuHeight?: number;
  maxMenuWidth?: number;
}

export function ZenSelectListbox({
  value,
  onChange,
  options,
  label,
  placeholder = "Auswählen…",
  disabled = false,
  fullWidth = false,
  className = "",
  maxMenuHeight = 260,
  maxMenuWidth = 320,
}: ZenSelectListboxProps) {
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

  useEffect(() => {
    const idx = options.findIndex((o) => o.value === value);
    if (idx >= 0) setActiveIndex(idx);
  }, [value, options]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Keyboard
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
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
          setOpen(false);
          buttonRef.current?.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, activeIndex, options, onChange]);

  // Keep active item in view
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLDivElement>(
      `[data-idx="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const widthClass = fullWidth ? "w-full" : "w-[320px]";

  return (
    <div ref={rootRef} className={`flex flex-col ${widthClass} ${className}`}>
      {label ? (
        <div className="mb-[6px] text-center font-mono text-[11px] text-[#999] select-none">
          {label}
        </div>
      ) : null}

      <div className="relative">
        {/* Trigger */}
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          className={`
            relative w-full rounded-lg bg-transparent font-mono text-[#e5e5e5]
            py-3 text-sm text-center
            focus:outline-none
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          `}
          style={{
            border: "1px solid #3a3a3a rounded-[10px]",
          }}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <span className="text-[#e5e5e5]">
              {selected?.label ?? placeholder}
            </span>
            <span className="text-[#AC8E66] text-[12px] relative top-[1px]">
              ▾
            </span>
          </span>
        </button>

        {/* Menu */}
        {open ? (
          <div
            className="
              absolute left-0 right-0 mt-2 rounded-xl overflow-hidden
              bg-[#111] border border-[#AC8E66]/60 shadow-xl
            "
            style={{ maxHeight: maxMenuHeight + 30 + "px", maxWidth: maxMenuWidth + "50px" }}
          >
            <div
              ref={listRef}
              className="max-h-full overflow-y-auto py-2"
            >
              {options.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isActive = idx === activeIndex;

                return (
                  <div
                    key={opt.value}
                    data-idx={idx}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseDown={(e) => e.preventDefault()} // verhindert Focus-Klau
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      buttonRef.current?.focus();
                    }}
                    className={`
                      px-[5px] py-[2px] font-mono text-[10px] cursor-pointer
                      ${isActive ? "bg-[#AC8E66]/15 text-[#AC8E66]" : "text-[#e5e5e5]"}
                      ${isSelected ? "border-l-2 border-[#AC8E66]" : "border-l-2 border-transparent"}
                    `}
                  >
                    {opt.label}
                  </div>
                );
              })}
            </div>

            <div className="px-[5px] py-[2px] text-center text-[9px] font-mono text-[#777] border-t border-[#3a3a3a]">
              ↑ ↓ wählen · Enter übernehmen · Esc schließen
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
