import { useMemo, useState, type ReactNode } from "react";

type Variant = "default" | "active";
type Size = "default" | "compact" | "small";

interface ZenRoughButtonProps {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  size?: Size;
  width?: number;
  height?: number;
  href?: string;
  target?: string;
  rel?: string;
  disabled?: boolean;
  title?: string;
}

export const ZenRoughButton = ({
  label,
  icon,
  onClick,
  variant = "default",
  size = "default",
  width,
  height,
  href,
  target,
  rel,
  disabled = false,
  title: _title,
}: ZenRoughButtonProps) => {
  const [hovered, setHovered] = useState(false);

  const dims = useMemo(() => {
    const defaultWidth = size === "compact" ? 40 : size === "small" ? 180 : 320;
    const defaultHeight = size === "compact" ? 40 : size === "small" ? 46 : 56;
    return {
      w: width ?? defaultWidth,
      h: height ?? defaultHeight,
    };
  }, [size, width, height]);

  const strokeColor = useMemo(() => {
    if (variant === "active") return "#AC8E66";
    if (hovered) return "#1a1a1a";
    return "#555555";
  }, [variant, hovered]);

  const sizeClasses: Record<Size, string> = {
    compact:
      "relative rounded-full font-mono text-[10px] flex items-center justify-center",
    small:
      "relative rounded-lg font-mono text-[9px] flex items-center justify-center gap-2",
    default:
      "relative px-6 py-3 rounded-lg font-mono text-[10px] flex items-center justify-center gap-2 min-w-[280px]",
  };

  const base =
    "group transition-colors duration-200 border-0 outline-none focus:outline-none focus:ring-0 active:bg-transparent focus:bg-transparent no-underline";
  const hover = disabled ? "" : "cursor-pointer hover:text-[#1a1a1a]";
  const state = disabled ? "opacity-50 cursor-not-allowed" : "";
  const variantClasses: Record<Variant, string> = {
    default: "bg-transparent text-[#555]",
    active: "bg-[#AC8E66]/10 text-[#AC8E66]",
  };

  const commonStyle: React.CSSProperties = {
    width: dims.w,
    height: dims.h,
    outline: "none",
    border: "none",
    boxShadow: "none",
    WebkitTapHighlightColor: "transparent",
  };

  const commonHandlers = disabled
    ? {}
    : {
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false),
        onFocus: () => setHovered(true),
        onBlur: () => setHovered(false),
      };

  const content = (
    <>
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        {size === "compact" ? (
          <circle
            cx={dims.w / 2}
            cy={dims.h / 2}
            r={Math.max(0, dims.w / 2 - 4)}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.5"
          />
        ) : (
          <rect
            x="4"
            y="4"
            width={Math.max(0, dims.w - 8)}
            height={Math.max(0, dims.h - 8)}
            rx="8"
            ry="8"
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.4"
          />
        )}
      </svg>

      <span className="relative z-[1] inline-flex items-center justify-center gap-3">
        {size === "compact" ? (
          icon ? <span className="text-[14px] text-[#AC8E66]">{icon}</span> : null
        ) : (
          <>
            {icon ? (
              <span className="text-[10px] text-[#AC8E66] relative top-[1px] mr-[4px]">
                {icon}
              </span>
            ) : null}
            <span className="text-[9px]">{label}</span>
          </>
        )}
      </span>

      {/* Tooltip (CSS-only, calm) */}
      
    </>
  );

  const className = `${base} ${sizeClasses[size]} ${variantClasses[variant]} ${hover} ${state}`;

  // Link
  if (href) {
    const effectiveRel = rel ?? (target === "_blank" ? "noopener noreferrer" : undefined);

    return (
      <a
        href={disabled ? undefined : href}
        target={target}
        rel={effectiveRel}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        className={className}
        style={commonStyle}
        {...commonHandlers}
        onClick={(e) => {
          if (disabled) e.preventDefault();
        }}
      >
        {content}
      </a>
    );
  }

  // Button
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={className}
      style={commonStyle}
      {...commonHandlers}
    >
      {content}
    </button>
  );
};
