import React from "react";
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
  const sizeMap = {
    xs: 24,
    sm: 32,
    md: 48,
  } as const;

  const pixelSize = sizeMap[size] ?? 40;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onClick?.();
  };

  const ringInset = size === "xs" ? 2.5 : 3;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={handleClick}
      className={`group relative flex items-center justify-center
        cursor-pointer select-none shrink-0 p-0 aspect-square rounded-full active:scale-95
        transition-all duration-200 ${className}`}
      style={{
        width: pixelSize,
        minWidth: pixelSize,
        maxWidth: pixelSize,
        height: pixelSize,
        minHeight: pixelSize,
        maxHeight: pixelSize,
        border: "none",
        outline: "none",
        background: "transparent",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        <circle
          cx="50"
          cy="50"
          r={50 - ringInset}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-[#3a3a3a] transition-colors duration-200 group-hover:text-[#AC8E66]"
        />
      </svg>
      <FontAwesomeIcon
        icon={icon ?? faCircleQuestion}
        className="text-[14px] z-10 text-[#AC8E66] pointer-events-none transition-colors group-hover:text-[#d0cbb8]"
      />
    </button>
  );
};
