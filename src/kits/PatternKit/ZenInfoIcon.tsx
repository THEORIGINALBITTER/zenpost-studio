import { useEffect, useRef } from "react";
import rough from "roughjs/bin/rough";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfo, faCog } from "@fortawesome/free-solid-svg-icons";

interface ZenInfoIconProps {
  onClick?: () => void;
  iconType?: 'info' | 'settings';
}

export const ZenInfoIcon = ({ onClick, iconType = 'info' }: ZenInfoIconProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = 40;

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
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="absolute top-0 left-0 pointer-events-none"
      />
      <FontAwesomeIcon
        icon={icon}
        className="w-[10px] h-[10px] z-10 pointer-events-none"
      />
    </button>
  );
};
