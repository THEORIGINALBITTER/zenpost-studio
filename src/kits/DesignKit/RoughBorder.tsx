// ./kits/DesignKit/RoughBorder.tsx
import { useEffect, useRef, type ReactNode } from "react";
import rough from "roughjs/bin/rough";

interface RoughBorderProps {
  width?: number;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
  roughness?: number;
  bowing?: number;
  goldTone?: boolean;
  radius?: number;
  children?: ReactNode;
}

const RoughBorder = ({
  width = 200,
  height = 150,
  stroke = "#AC8E66",
  strokeWidth = 0.6,
  roughness = 0.4,
  bowing = 0.8,
  goldTone = true,
  radius = 10,
  children,
}: RoughBorderProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rc = rough.canvas(canvas);
    const ctx = canvas.getContext("2d");
    const strokeColor = goldTone ? "rgba(172,142,102,0.9)" : stroke;

    if (!ctx) return;

    // SVG-Pfad mit Rundung definieren
    const r = radius;
    const pathStr = `
      M ${4 + r} 4
      L ${width - 4 - r} 4
      Q ${width - 4} 4, ${width - 4} ${4 + r}
      L ${width - 4} ${height - 4 - r}
      Q ${width - 4} ${height - 4}, ${width - 4 - r} ${height - 4}
      L ${4 + r} ${height - 4}
      Q 4 ${height - 4}, 4 ${height - 4 - r}
      L 4 ${4 + r}
      Q 4 4, ${4 + r} 4
    `;

    // RoughJS zeichnet jetzt nur diesen Pfad (keine zweite Linie!)
    rc.path(pathStr, {
      roughness,
      bowing,
      stroke: strokeColor,
      strokeWidth,
    });
  }, [width, height, stroke, strokeWidth, roughness, bowing, goldTone, radius]);

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        borderRadius: radius,
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          borderRadius: radius,
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
          borderRadius: radius,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default RoughBorder;
