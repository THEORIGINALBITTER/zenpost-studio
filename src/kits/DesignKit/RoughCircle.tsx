// ./kits/DesignKit/RoughCircle.tsx
import { useEffect, useRef, type ReactNode } from "react";
import rough from "roughjs/bin/rough";

interface RoughCircleProps {
  size?: number;
  stroke?: string;
  strokeWidth?: number;
  roughness?: number;
  bowing?: number;
  goldTone?: boolean;
  children?: ReactNode;
}

const RoughCircle = ({
  size = 150,
  stroke = "#AC8E66",
  strokeWidth = 2,
  roughness = 0.5,
  bowing = 1,
  goldTone = true,
  children,
}: RoughCircleProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rc = rough.canvas(canvas);
    const strokeColor = goldTone ? "#AC8E66" : stroke;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = (size - 10) / 2;

    rc.circle(centerX, centerY, radius * 2, {
      roughness,
      bowing,
      stroke: strokeColor,
      strokeWidth,
    });
  }, [size, stroke, strokeWidth, roughness, bowing, goldTone]);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
      }}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default RoughCircle;
