import { InfoBoxConfig } from '../config/ZenModalConfig';
import { openUrl } from '@tauri-apps/plugin-opener';

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
  const handleLinkClick = async (url: string) => {
    try {
      await openUrl(url);
    } catch (error) {
      console.error('Failed to open URL:', error);
    }
  };
  // Type-basierte Farben für style={{}}
  const colorStyles = {
    info: {
      bg: 'rgba(172, 142, 102, 0.1)',
      border: 'rgba(172, 142, 102, 0.3)',
      text: '#AC8E66',
      hover: '#D4AF78',
    },
    warning: {
      bg: 'rgba(255, 167, 38, 0.1)',
      border: 'rgba(255, 167, 38, 0.3)',
      text: '#FFA726',
      hover: '#FFB74D',
    },
    success: {
      bg: 'rgba(76, 175, 80, 0.1)',
      border: 'rgba(76, 175, 80, 0.3)',
      text: '#4CAF50',
      hover: '#66BB6A',
    },
    error: {
      bg: 'rgba(255, 107, 107, 0.1)',
      border: 'rgba(255, 107, 107, 0.3)',
      text: '#FF6B6B',
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
          maxWidth: '400px',
          padding: '20px 24px',
          backgroundColor: colorStyle.bg,
          border: `2px solid ${colorStyle.border}`,
          borderRadius: '12px',
        }}
      >
        <div
          style={{
            color: colorStyle.text,
            fontSize: '13px',
            lineHeight: '1.6',
            textAlign: 'center',
          }}
        >
          {/* Title */}
          <p style={{ marginBottom: '12px' }}>
            <strong>{title}:</strong> {description}
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
                    padding: 0,
                    font: 'inherit',
                    textAlign: 'center',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    color: colorStyle.text,
                    fontSize: '13px',
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
