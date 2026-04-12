import { InfoBoxConfig } from "../config/ZenModalConfig";
import { useOpenExternal } from "../../../../hooks/useOpenExternal";

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
 * - Tauri-kompatible URL-Öffnung
 */
export const ZenInfoBox = ({
  title,
  description,
  links = [],
  type = 'info',
  className = '',
}: ZenInfoBoxProps) => {
  const { openExternal } = useOpenExternal();

  const handleLinkClick = async (url: string) => {
    try {
      await openExternal(url);
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  };
  // Type-basierte Farben für style={{}}
  const colorStyles = {
    info: {
      bg: "transparent",
      border: 'rgba(11, 11, 11, 0.3)',
      text: '#555',
      hover: '#AC8E66',
    },
    warning: {
      bg: 'rgba(239, 235, 220, 0.01)',
      border: 'rgba(11, 11, 11, 0.3)',
      text: '#555',
      hover: '#111',
    },
    success: {
      bg: 'transparent',
      border: 'rgba(11, 11, 11, 0.3)',
      text: '#555',
      hover: '#1a1a1a',
    },
    error: {
      bg: 'rgba(255, 107, 107, 0.1)',
      border: 'rgba(11, 11, 11, 0.3)',
      text: '#555',
      hover: '#FF8787',
    },
  };

  const colorStyle = colorStyles[type];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <div
        className={className}
        style={{
          width: '100%',
          maxWidth: 'auto',
          padding: '20px 24px',
          backgroundColor: colorStyle.bg,
          border: `1px dotted ${colorStyle.border}`,
          borderRadius: '12px',
        }}
      >
        <div
          style={{
            color: colorStyle.text,
            fontSize: '11px',
            lineHeight: '1.6',
            textAlign: 'center',
          }}
        >
          {/* Title */}
          <p style={{ marginBottom: '12px' }}>
            <p>{title}:</p> {description}
          </p>

          {/* Links */}
          {links.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginTop: '16px',
                alignItems: 'center',
                padding: '12px',
              }}
            >
              {links.map((link, index) => (
                <button
                  key={index}
                  onClick={() => handleLinkClick(link.url)}
                  className={`transition-colors duration-200`}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = colorStyle.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = colorStyle.text;
                  }}
                  style={{
                    padding: '12px',
                    font: 'inherit',
                    textAlign: 'center',
                    backgroundColor: 'transparent',
                    
                    cursor: 'pointer',
                     boxShadow: 'none',
                    border: '0.5px solid #1a1a1a',
                    color: colorStyle.text,
                    fontSize: '10px',
                   
                  }}
                >
                  → {link.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
