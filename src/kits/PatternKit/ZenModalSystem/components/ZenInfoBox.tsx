import { InfoBoxConfig } from '../config/ZenModalConfig';

interface ZenInfoBoxProps extends InfoBoxConfig {
  className?: string;
}

/**
 * ZenInfoBox - Wiederverwendbare Info-Box Komponente
 *
 * Features:
 * - Verschiedene Typen (info, warning, success, error)
 * - Konfigurierbare Links
 * - Konsistentes Styling
 * - Zen-Design konform
 */
export const ZenInfoBox = ({
  title,
  description,
  links = [],
  type = 'info',
  className = '',
}: ZenInfoBoxProps) => {
  // Type-basierte Farben
  const typeColors = {
    info: {
      bg: 'bg-[#AC8E66]/10',
      border: 'border-[#AC8E66]/30',
      text: 'text-[#AC8E66]',
      hover: 'hover:text-[#D4AF78]',
    },
    warning: {
      bg: 'bg-[#FFA726]/10',
      border: 'border-[#FFA726]/30',
      text: 'text-[#FFA726]',
      hover: 'hover:text-[#FFB74D]',
    },
    success: {
      bg: 'bg-[#4CAF50]/10',
      border: 'border-[#4CAF50]/30',
      text: 'text-[#4CAF50]',
      hover: 'hover:text-[#66BB6A]',
    },
    error: {
      bg: 'bg-[#FF6B6B]/10',
      border: 'border-[#FF6B6B]/30',
      text: 'text-[#FF6B6B]',
      hover: 'hover:text-[#FF8787]',
    },
  };

  const colors = typeColors[type];

  return (
    <div className="flex flex-col items-center w-full">
      <div
        className={`w-full max-w-[300px] p-3 ${colors.bg} border ${colors.border} rounded-lg ${className}`}
      >
        <div className={`${colors.text} text-[11px] leading-relaxed text-center`}>
          {/* Title */}
          <p className="mb-2">
            <strong>{title}:</strong> {description}
          </p>

          {/* Links */}
          {links.length > 0 && (
            <div className="flex flex-col gap-1 mt-2">
              {links.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`underline ${colors.hover} block transition-colors duration-200`}
                >
                  → {link.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
