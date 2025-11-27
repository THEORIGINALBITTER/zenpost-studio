import { useState, useEffect, useRef, type ReactNode } from "react";
import rough from "roughjs/bin/rough";

interface ZenRoughButtonProps {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  variant?: "default" | "active";
  href?: string;
  target?: string;
  rel?: string;
  disabled?: boolean;
  title?: string; // Tooltip text for hover
}

export const ZenRoughButton = ({
  label,
  icon,
  onClick,
  variant = "default",
  href,
  target,
  rel,
  disabled = false,
  title,
}: ZenRoughButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tooltipTimerRef = useRef<number | null>(null);
  const width = 320;
  const height = 56;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rc = rough.canvas(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Canvas vorher löschen
    ctx.clearRect(0, 0, width, height);

    // 🔄 Browser-Repaint erzwingen
    canvas.style.transform = "translateZ(0)";

    // Immer einen Rahmen zeichnen
    const radius = 8;

    // Farbe abhängig von Hover und Variant
    let strokeColor = "#555555"; // gray-500 default

    if (variant === "active") {
      strokeColor = "#AC8E66"; // gold für active
    } else if (isHovered) {
      strokeColor = "#AC8E66"; // gold für hover
    }

    // Rounded rectangle path
    const pathStr = `
      M ${4 + radius} 4
      L ${width - 4 - radius} 4
      Q ${width - 4} 4, ${width - 4} ${4 + radius}
      L ${width - 4} ${height - 4 - radius}
      Q ${width - 4} ${height - 4}, ${width - 4 - radius} ${height - 4}
      L ${4 + radius} ${height - 4}
      Q 4 ${height - 4}, 4 ${height - 4 - radius}
      L 4 ${4 + radius}
      Q 4 4, ${4 + radius} 4
    `;

    rc.path(pathStr, {
      roughness: 0.1,
      bowing: 1,
      stroke: strokeColor,
      strokeWidth: 1,
    });
  }, [isHovered, variant]);

  const baseClasses =
    "relative px-6 py-3 rounded-lg font-mono text-[10px] transition-all duration-200 flex items-center justify-center gap-2 min-w-[280px] border-0 outline-none focus:outline-none focus:border-0 focus:ring-0 active:outline-none active:border-0 no-underline cursor-pointer hover:text-[#AC8E66]";

  const variantClasses = {
    default: "bg-transparent text-[#e5e5e5]",
    active: "bg-[#AC8E66]/10 text-[#AC8E66]",
  };

  const handleMouseEnter = () => {
    if (!disabled) {
      setIsHovered(true);
      if (title) {
        tooltipTimerRef.current = window.setTimeout(() => setShowTooltip(true), 500); // Show tooltip after 500ms delay
      }
    }
  };

  const handleMouseLeave = () => {
    if (!disabled) {
      setIsHovered(false);
      setShowTooltip(false);
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
        tooltipTimerRef.current = null;
      }
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current);
      }
    };
  }, []);

  const commonProps = {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    className: `${baseClasses} ${variantClasses[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    style: {
      width,
      height,
      outline: "none",
      border: "none",
      boxShadow: "none",
      WebkitTapHighlightColor: "transparent",
    },
  };

  const content = (
    <>
      {/* 🧩 Optionales key-Attribut für erzwungenen Repaint */}
      <canvas
        key={isHovered ? "hover" : "idle"}
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
        }}
      />
      <span
        style={{ position: "relative", zIndex: 1 }}
        className="inline-flex items-center justify-center gap-3"
      >
        {icon && (
          <span className="inline-block text-[12px] text-[#AC8E66] relative top-[1px] mr-[4px]">
            {icon}
          </span>
        )}
        <span className="text-[11px]">{label}</span>
      </span>
    </>
  );

  const buttonElement = href ? (
    <a href={href} target={target} rel={rel} {...commonProps}>
      {content}
    </a>
  ) : (
    <button onClick={onClick} {...commonProps} disabled={disabled}>
      {content}
    </button>
  );

  // Wrap with tooltip container if title is provided
  if (title) {
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {buttonElement}
        {showTooltip && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%) translateY(-8px)',
              backgroundColor: '#2A2A2A',
              color: '#e5e5e5',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              zIndex: 1000,
              border: '1px solid #AC8E66',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              pointerEvents: 'none',
              animation: 'fadeIn 0.2s ease-in',
            }}
          >
            {title}
            {/* Tooltip arrow */}
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '6px solid #AC8E66',
              }}
            />
          </div>
        )}
        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateX(-50%) translateY(-4px);
            }
            to {
              opacity: 1;
              transform: translateX(-50%) translateY(-8px);
            }
          }
        `}</style>
      </div>
    );
  }

  return buttonElement;
};
