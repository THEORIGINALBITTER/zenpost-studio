import React, { useEffect, useRef } from "react";
import rough from "roughjs/bin/rough";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

interface ZenBackButtonProps {
  onClick?: () => void;
  size?: "sm" | "md";
  className?: string;
}

export const ZenBackButton: React.FC<ZenBackButtonProps> = ({
  onClick,
  size = "md",
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixelSize = size === "sm" ? 32 : 40;

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
    drawCircle("#3a3a3a");
  }, [pixelSize]);

  /** Hover-Status */
  const handleMouseEnter = () => drawCircle("#AC8E66");
  const handleMouseLeave = () => drawCircle("#3a3a3a");

  /** Klick */
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onClick?.();
  };

  return (
    <button
      type="button"
      aria-label="Zurück"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group relative flex items-center justify-center rounded-full
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
      {/* Canvas liegt ganz unten → blockiert nichts */}
      <canvas
        ref={canvasRef}
        width={pixelSize}
        height={pixelSize}
        className="absolute top-0 left-0 z-0 pointer-events-none"
      />
      {/* Icon bleibt oben */}
      <FontAwesomeIcon
        icon={faArrowLeft}
        className="text-[14px] text-[#fffbeb] z-10 pointer-events-none group-hover:text-[#dbd9d5]"
      />
    </button>
  );
};
