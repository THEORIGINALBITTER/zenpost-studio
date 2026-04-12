import React from "react";
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
  const pixelSize = size === "sm" ? 32 : 40;
  const ringInset = 3;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onClick?.();
  };

  return (
    <button
      type="button"
      aria-label="Zuruck"
      onClick={handleClick}
      className={`group relative flex items-center justify-center rounded-full
        cursor-pointer select-none shrink-0 p-0 aspect-square active:scale-95
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
        icon={faArrowLeft}
        className="text-[14px] text-[#1a1a1a] z-10 pointer-events-none transition-colors group-hover:text-[#a1a1a1]"
      />
    </button>
  );
};
