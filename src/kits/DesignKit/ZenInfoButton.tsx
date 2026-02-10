import React, { useEffect, useRef } from "react";
import rough from "roughjs/bin/rough";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleQuestion } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";

interface ZenInfoButtonProps {
  onClick?: () => void;
  size?: "sm" | "md" | "xs";
  className?: string;
  icon?: IconDefinition;
  ariaLabel?: string;
}

export const ZenInfoButton: React.FC<ZenInfoButtonProps> = ({
  onClick,
  size = "md",
  className = "",
  icon,
  ariaLabel = "Info",
}) => {
const canvasRef = useRef<HTMLCanvasElement>(null);
const sizeMap = {
  xs: 24,
  sm: 32,
  md: 48,
} as const;

const pixelSize = sizeMap[size] ?? 40;

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
    drawCircle("#3a3a3a");
  }, [pixelSize]);

  const handleMouseEnter = () => drawCircle("#AC8E66");
  const handleMouseLeave = () => drawCircle("#3a3a3a");

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onClick?.();
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group relative flex items-center justify-center 
        cursor-pointer select-none active:scale-95
        transition-all duration-200 ${className}`}
      style={{
        width: pixelSize,
        height: pixelSize,
        border: "none",
        outline: "none",
        background: "transparent",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <canvas
        ref={canvasRef}
        width={pixelSize}
        height={pixelSize}
        className="absolute top-0 left-0 z-0 pointer-events-none"
      />
      <FontAwesomeIcon
        icon={icon ?? faCircleQuestion}
        className="text-[14px] z-10 text-[#AC8E66] pointer-events-none group-hover:text-[#dbd9d5]"
      />
    </button>
  );
};
