// ./kits/DesignKit/RoughBorder.tsx
import { type ReactNode } from "react";

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
  goldTone = true,
  radius = 10,
  children,
}: RoughBorderProps) => {
  const strokeColor = goldTone ? "rgba(172,142,102,0.9)" : stroke;
  const normalizedStroke = Math.max(1, strokeWidth);
  const inset = normalizedStroke * 2;

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        borderRadius: radius,
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          borderRadius: radius,
        }}
      >
        <rect
          x={inset}
          y={inset}
          width={Math.max(0, width - inset * 2)}
          height={Math.max(0, height - inset * 2)}
          rx={Math.max(0, radius - inset / 2)}
          ry={Math.max(0, radius - inset / 2)}
          fill="none"
          stroke={strokeColor}
          strokeWidth={normalizedStroke * 2}
        />
      </svg>
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
