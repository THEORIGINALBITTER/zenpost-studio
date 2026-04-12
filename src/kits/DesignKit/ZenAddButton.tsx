import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

interface ZenAddButtonProps {
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
}

export const ZenAddButton: React.FC<ZenAddButtonProps> = ({
  onClick,
  size = "md",
  className = "",
  disabled = false,
}) => {
  const pixelSize = size === "sm" ? 32 : size === "lg" ? 48 : 40;
  const iconSize = size === "sm" ? 12 : size === "lg" ? 18 : 14;
  const ringInset = size === "lg" ? 2.5 : 3;
  const ringColor = disabled ? "#555" : "#AC8E66";
  const hoverRingColor = disabled ? "#555" : "#d8b27c";
  const iconColor = disabled ? "#555" : "#1a1a1a";
  const hoverIconColor = disabled ? "#555" : "#d8b27c";

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!disabled) onClick?.();
  };

  return (
    <button
      type="button"
      aria-label="Add"
      onClick={handleClick}
      disabled={disabled}
      className={`group relative flex items-center justify-center rounded-full
        zen-add-button
        select-none shrink-0 p-0 aspect-square active:scale-95
        transition-all duration-200 ${className}
        ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
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
          className="transition-colors duration-200"
          style={{ color: ringColor }}
        />
      </svg>
      {!disabled && <style>{`.zen-add-button:hover svg circle { color: ${hoverRingColor}; } .zen-add-button:hover .zen-add-icon { color: ${hoverIconColor}; }`}</style>}
      <FontAwesomeIcon
        icon={faPlus}
        className="zen-add-icon z-10 pointer-events-none transition-colors duration-200"
        style={{ fontSize: iconSize, color: iconColor }}
      />
    </button>
  );
};
