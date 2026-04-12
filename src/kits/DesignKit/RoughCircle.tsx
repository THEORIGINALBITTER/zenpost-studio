// ./kits/DesignKit/RoughCircle.tsx
import { type ReactNode } from "react";

interface RoughCircleProps {
  size?: number;
  stroke?: string;
  strokeWidth?: number;
  roughness?: number;
  bowing?: number;
  goldTone?: boolean;
  children?: ReactNode;
  blueTone?: boolean;
}

const RoughCircle = ({
  size = 150,
  stroke = "#AC8E66",
  strokeWidth = 2,
  goldTone = true,
  blueTone = false,
  children,
}: RoughCircleProps) => {
  const strokeColor = goldTone ? "#AC8E66" : blueTone ? "#4A90E2" : stroke;
  const normalizedStroke = Math.max(1, strokeWidth);
  const radius = 50 - normalizedStroke * 2;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        <circle
          cx="50"
          cy="50"
          r={radius}
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
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default RoughCircle;
