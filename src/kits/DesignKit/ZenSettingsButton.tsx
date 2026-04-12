import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCog } from "@fortawesome/free-solid-svg-icons";

interface ZenSettingsButtonProps {
  onClick?: () => void;
  size?: "sm" | "md";
  className?: string;
}

export const ZenSettingsButton: React.FC<ZenSettingsButtonProps> = ({
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
      aria-label="Settings"
      onClick={handleClick}
      className={`group relative flex items-center justify-center rounded-full
        cursor-pointer select-none shrink-0 p-0 aspect-square active:scale-95 transition-transform duration-200 ${className}`}
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
        icon={faCog}
        className="z-10 text-[14px] text-[#AC8E66] pointer-events-none transition-colors duration-200 group-hover:text-[#d0cbb8]"
      />
    </button>
  );
};
