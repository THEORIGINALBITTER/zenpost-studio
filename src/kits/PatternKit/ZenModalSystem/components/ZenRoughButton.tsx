import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import rough from "roughjs/bin/rough";

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

function drawRoughBorder(opts: {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  size: Size;
  stroke: string;
}) {
  const { canvas, width, height, size, stroke } = opts;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Clear
  ctx.clearRect(0, 0, width, height);

  const rc = rough.canvas(canvas);
  const radius = 8;

  if (size === "compact") {
    const centerX = width / 2;
    const centerY = height / 2;
    const circleRadius = (width - 8) / 2;

    rc.circle(centerX, centerY, circleRadius * 2, {
      roughness: 0.12,
      bowing: 1,
      stroke,
      strokeWidth: 1,
    });
    return;
  }

  const pad = 4;
  const pathStr = `
    M ${pad + radius} ${pad}
    L ${width - pad - radius} ${pad}
    Q ${width - pad} ${pad}, ${width - pad} ${pad + radius}
    L ${width - pad} ${height - pad - radius}
    Q ${width - pad} ${height - pad}, ${width - pad - radius} ${height - pad}
    L ${pad + radius} ${height - pad}
    Q ${pad} ${height - pad}, ${pad} ${height - pad - radius}
    L ${pad} ${pad + radius}
    Q ${pad} ${pad}, ${pad + radius} ${pad}
  `;

  rc.path(pathStr, {
    roughness: 0.02,
    bowing: 0.3,
    stroke,
    strokeWidth: 0.7,
  });
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const dims = useMemo(() => {
    const defaultWidth = size === "compact" ? 40 : size === "small" ? 220 : 320;
    const defaultHeight = size === "compact" ? 40 : size === "small" ? 46 : 56;
    return {
      w: width ?? defaultWidth,
      h: height ?? defaultHeight,
    };
  }, [size, width, height]);

  const strokeColor = useMemo(() => {
    if (variant === "active") return "#AC8E66";
    if (hovered) return "#AC8E66";
    return "#555555";
  }, [variant, hovered]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Draw in next frame (keeps hover silky)
    const id = requestAnimationFrame(() => {
      drawRoughBorder({
        canvas,
        width: dims.w,
        height: dims.h,
        size,
        stroke: strokeColor,
      });
    });

    return () => cancelAnimationFrame(id);
  }, [dims.w, dims.h, size, strokeColor]);

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
  const hover = disabled ? "" : "cursor-pointer hover:text-[#AC8E66]";
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
      <canvas
        ref={canvasRef}
        width={dims.w}
        height={dims.h}
        className="absolute inset-0 pointer-events-none"
      />

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
