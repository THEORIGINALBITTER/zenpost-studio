// ./kits/PatternKit/ZenInfoFooter.tsx
import React from "react";
import { ZenInfoIcon } from "./ZenInfoIcon";

interface ZenInfoFooterProps {
  onClick?: () => void;
  fixed?: boolean;
  className?: string;
  offsetY?: number; // optional: Abstand von unten (z. B. 40)
  iconType?: 'info' | 'settings'; // Typ des Icons: Info oder Einstellungen
  pulseSpeed?: number; // Animation speed multiplier (default: 1, higher = faster)
}

export const ZenInfoFooter: React.FC<ZenInfoFooterProps> = ({
  onClick,
  fixed = true,
  className = "",
  offsetY = 48, // Default: 48px Abstand
  iconType = 'info', // Default: Info-Icon
  pulseSpeed = 1, // Default: normal speed
}) => {
  const style = fixed
    ? { position: "fixed" as const, bottom: `${offsetY}px`, left: 0, width: "100%" }
    : { marginBottom: `${offsetY}px` };

  return (
    <div style={style} className={`flex justify-center ${className}`}>
      <ZenInfoIcon onClick={onClick} iconType={iconType} pulseSpeed={pulseSpeed} />
    </div>
  );
};
