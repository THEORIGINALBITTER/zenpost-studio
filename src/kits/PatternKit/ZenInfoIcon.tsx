import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfo, faCog } from "@fortawesome/free-solid-svg-icons";

interface ZenInfoIconProps {
  onClick?: () => void;
  iconType?: "info" | "settings";
  pulseSpeed?: number;
}

export const ZenInfoIcon = ({
  onClick,
  iconType = "info",
  pulseSpeed = 1,
}: ZenInfoIconProps) => {
  const icon = iconType === "settings" ? faCog : faInfo;
  const label = iconType === "settings" ? "Einstellungen" : "Info";
  const pulseDuration = `${Math.max(1.2, 2 / Math.max(pulseSpeed, 0.25))}s`;
  const ringInset = 8;

  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="group relative flex items-center justify-center w-12 h-12 min-w-12 min-h-12 max-w-12 max-h-12
      shrink-0 p-0 aspect-square
      rounded-full cursor-pointer text-[#AC8E66]
      bg-transparent transition-all duration-300 active:scale-95
      outline-none focus:outline-none focus-visible:ring-0 border-none select-none"
      style={{
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {iconType === "settings" && (
        <span
          aria-hidden="true"
          className="absolute inset-[-8px] rounded-full border border-[#AC8E66] opacity-50 animate-ping"
          style={{ animationDuration: pulseDuration }}
        />
      )}

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
          className="text-[#3a3a3a] transition-colors duration-300 group-hover:text-[#AC8E66]"
        />
      </svg>
      <FontAwesomeIcon
        icon={icon}
        className="w-[10px] h-[10px] z-10 pointer-events-none transition-colors duration-300 group-hover:text-[#d0cbb8]"
      />
    </button>
  );
};
