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

const BUTTON_TOKENS = {
  gold: "#AC8E66",
  goldHover: "#C9AF88",
  textLight: "#d0cbb8",
  textStrong: "#1a1a1a",
  darkBgTop: "#2A2A2C",
  darkBgBottom: "#1F1F21",
  darkBgTopHover: "#313134",
  darkBgBottomHover: "#252527",
  darkBorder: "rgba(208, 203, 184, 0.35)",
  darkBorderHover: "#AC8E66",
  activeBgTop: "#E6DDCB",
  activeBgBottom: "#D7C9AF",
  activeBgTopHover: "#ECE3D2",
  activeBgBottomHover: "#DDCFB5",
  activeBorder: "#AC8E66",
  activeBorderHover: "#C9AF88",
} as const;

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
    if (hovered) return "#d0cbb8";
    return "#e8e3d8";
  }, [variant, hovered]);

  const sizeClasses: Record<Size, string> = {
    compact:
      "relative rounded-full font-mono text-[10px] flex items-center justify-center",
    small:
      "relative rounded-[10px] font-mono text-[10px] flex items-center justify-center gap-2",
    default:
      "relative px-6 py-3 rounded-[10px] font-mono text-[11px] flex items-center justify-center gap-2 min-w-[280px]",
  };

  const base =
    "group border-0 outline-none focus:outline-none focus:ring-0 active:bg-transparent focus:bg-transparent no-underline transition-all duration-150";
  const hover = disabled ? "" : "cursor-pointer";
  const state = disabled ? "opacity-50 cursor-not-allowed" : "";
  const variantClasses: Record<Variant, string> = {
    default: "text-[#e8e3d8]",
    active: "text-[#1f1a14]",
  };

  const palette = useMemo(() => {
    if (variant === "active") {
      return {
        background: hovered
          ? `linear-gradient(180deg, ${BUTTON_TOKENS.activeBgTopHover} 0%, ${BUTTON_TOKENS.activeBgBottomHover} 100%)`
          : `linear-gradient(180deg, ${BUTTON_TOKENS.activeBgTop} 0%, ${BUTTON_TOKENS.activeBgBottom} 100%)`,
        border: hovered ? BUTTON_TOKENS.activeBorderHover : BUTTON_TOKENS.activeBorder,
        text: BUTTON_TOKENS.textStrong,
        shadow:
          "inset 0 1px 0 rgba(255,255,255,0.44), inset 0 -1px 0 rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.15)",
      };
    }

    return {
      background: hovered
        ? `linear-gradient(180deg, ${BUTTON_TOKENS.darkBgTopHover} 0%, ${BUTTON_TOKENS.darkBgBottomHover} 100%)`
        : `linear-gradient(180deg, ${BUTTON_TOKENS.darkBgTop} 0%, ${BUTTON_TOKENS.darkBgBottom} 100%)`,
      border: hovered ? BUTTON_TOKENS.darkBorderHover : BUTTON_TOKENS.darkBorder,
      text: BUTTON_TOKENS.textLight,
      shadow:
        "inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(0,0,0,0.42), 0 1px 2px rgba(0,0,0,0.18)",
    };
  }, [hovered, variant]);

  const commonStyle: React.CSSProperties = {
    width: dims.w,
    height: dims.h,
    outline: "none",
    border: `1px solid ${palette.border}`,
    background: palette.background,
    boxShadow: palette.shadow,
    color: palette.text,
    WebkitTapHighlightColor: "transparent",
    borderRadius: size === "compact" ? 999 : 10,
    transform: hovered && !disabled ? "translateY(-0.5px)" : "translateY(0)",
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
      {size !== "compact" && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 4,
            borderRadius: 8,
            border: `0.5px solid ${strokeColor}`,
            opacity: 0.8,
            pointerEvents: "none",
          }}
        />
      )}

      <span className="relative z-[1] inline-flex items-center justify-center gap-3">
        {size === "compact" ? (
          icon ? <span className="text-[14px]">{icon}</span> : null
        ) : (
          <>
            {icon ? (
              <span className="text-[10px] relative top-[1px] mr-[4px]">
                {icon}
              </span>
            ) : null}
            <span className="text-[10px]">{label}</span>
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
