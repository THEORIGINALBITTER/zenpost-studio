import React, { useEffect, useRef } from "react";
import rough from "roughjs/bin/rough";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

interface ZenAddButtonProps {
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
}

export const ZenAddButton: React.FC<ZenAddButtonProps> = ({
  onClick,
  size = "md",
  className = "",
  disabled = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixelSize = size === "sm" ? 32 : size === "lg" ? 48 : 40;

  /** Zeichnet den Kreis mit gewünschter Farbe */
  const drawCircle = (strokeColor: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rc = rough.canvas(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, pixelSize, pixelSize);
    rc.circle(pixelSize / 2, pixelSize / 2, pixelSize - 4, {
      stroke: strokeColor,
      roughness: 0.5,
      strokeWidth: 1.2,
    });
  };

  useEffect(() => {
    drawCircle(disabled ? "#555" : "#AC8E66");
  }, [pixelSize, disabled]);

  /** Hover-Status */
  const handleMouseEnter = () => {
    if (!disabled) drawCircle("#d8b27c");
  };
  const handleMouseLeave = () => {
    if (!disabled) drawCircle("#AC8E66");
  };

  /** Klick */
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!disabled) {
      onClick?.();
    }
  };

  return (
    <button
      type="button"
      aria-label="Add"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      className={`group relative flex items-center justify-center rounded-full
        select-none active:scale-95
        transition-all duration-200 ${className}
        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      style={{
        width: pixelSize,
        height: pixelSize,
        border: "none",
        outline: "none",
        background: "transparent",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Canvas liegt ganz unten → blockiert nichts */}
      <canvas
        ref={canvasRef}
        width={pixelSize}
        height={pixelSize}
        className="absolute top-0 left-0 z-0 pointer-events-none"
      />
      {/* Icon bleibt oben */}
      <FontAwesomeIcon
        icon={faPlus}
        className={`z-10 pointer-events-none ${
          disabled
            ? 'text-[#555]'
            : 'text-[#AC8E66] group-hover:text-[#d8b27c]'
        }`}
        style={{ fontSize: size === "sm" ? 12 : size === "lg" ? 18 : 14 }}
      />
    </button>
  );
};
