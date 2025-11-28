import { useEffect, useRef } from "react";
import rough from "roughjs/bin/rough";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfo, faCog } from "@fortawesome/free-solid-svg-icons";

interface ZenInfoIconProps {
  onClick?: () => void;
  iconType?: 'info' | 'settings';
  pulseSpeed?: number; // Animation speed multiplier (default: 1, higher = faster)
}

export const ZenInfoIcon = ({ onClick, iconType = 'info', pulseSpeed = 1 }: ZenInfoIconProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pulseCanvasRef = useRef<HTMLCanvasElement>(null);
  const size = 40;
  const pulseSize = 60;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rc = rough.canvas(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawCircle = (strokeColor: string) => {
      ctx.clearRect(0, 0, size, size);
      rc.circle(size / 2, size / 2, size - 4, {
        stroke: strokeColor,
        roughness: 0.4,
        strokeWidth: 1.2,
      });
    };

    drawCircle("#AC8E66");

    // Hover-Effekt per Event-Listener
    const btn = canvas.parentElement;
    if (!btn) return;

    const onEnter = () => drawCircle("#AC8E66");
    const onLeave = () => drawCircle("#3a3a3a");

    btn.addEventListener("mouseenter", onEnter);
    btn.addEventListener("mouseleave", onLeave);

    return () => {
      btn.removeEventListener("mouseenter", onEnter);
      btn.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  // Pulsing rough circle animation for settings only
  useEffect(() => {
    // Early return if not settings icon
    if (iconType !== 'settings') return;

    const pulseCanvas = pulseCanvasRef.current;
    // Early return if canvas ref doesn't exist (shouldn't happen but safety check)
    if (!pulseCanvas) return;

    const rc = rough.canvas(pulseCanvas);
    const ctx = pulseCanvas.getContext("2d");
    if (!ctx) return;

    let scale = 0.95;
    let opacity = 1;
    let growing = true;

    // Calculate speed increments based on pulseSpeed prop (much slower base values)
    const scaleIncrement = 0.002 * pulseSpeed;
    const opacityIncrement = 0.005 * pulseSpeed;

    const animate = () => {
      ctx.clearRect(0, 0, pulseSize, pulseSize);

      // Animate scale and opacity
      if (growing) {
        scale += scaleIncrement;
        opacity -= opacityIncrement;
        if (scale >= 1.15) growing = false;
      } else {
        scale -= scaleIncrement;
        opacity += opacityIncrement;
        if (scale <= 0.95) growing = true;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0.3, opacity);

      const radius = (pulseSize - 10) * scale;
      rc.circle(pulseSize / 2, pulseSize / 2, radius, {
        stroke: "#AC8E66",
        roughness: 0.4,
        strokeWidth: 1.5,
      });

      ctx.restore();
      requestAnimationFrame(animate);
    };

    const animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [iconType, pulseSpeed]);

  const icon = iconType === 'settings' ? faCog : faInfo;
  const label = iconType === 'settings' ? 'Einstellungen' : 'Info';

  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="relative flex items-center justify-center w-12 h-12
      rounded-full cursor-pointer
      text-[#AC8E66] hover:text-[#AC]
      bg-transparent
      transition-all duration-300
      active:scale-95
      outline-none focus:outline-none focus-visible:ring-0 border-none
      select-none"
      style={{
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Pulsing Rough Circle Animation for Settings Icon */}
      {iconType === 'settings' && (
        <canvas
          ref={pulseCanvasRef}
          width={pulseSize}
          height={pulseSize}
          className="absolute pointer-events-none"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 0,
          }}
        />
      )}

      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ zIndex: 1 }}
      />
      <FontAwesomeIcon
        icon={icon}
        className="w-[10px] h-[10px] z-10 pointer-events-none"
        style={{ zIndex: 2 }}
      />
    </button>
  );
};
