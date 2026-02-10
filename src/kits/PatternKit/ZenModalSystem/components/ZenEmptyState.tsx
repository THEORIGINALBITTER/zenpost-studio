import type { ReactNode } from 'react';

interface ZenEmptyStateProps {
  /** Icon als SVG oder ReactNode */
  icon?: ReactNode;
  /** Titel der Empty State Anzeige */
  title: string;
  /** Beschreibungstext */
  description?: string;
  /** Button-Label */
  buttonLabel?: string;
  /** Button-Click Handler */
  onButtonClick?: () => void;
  /** Maximale Breite der Karte */
  maxWidth?: string;
}

/**
 * ZenEmptyState - Wiederverwendbare Empty State Komponente
 *
 * Features:
 * - Zentriertes Layout mit Icon, Titel, Beschreibung
 * - Optional: Call-to-Action Button
 * - Zen-Design konform
 * - Konsistentes Styling mit dem Modal-System
 */
export function ZenEmptyState({
  icon,
  title,
  description,
  buttonLabel,
  onButtonClick,
  maxWidth = '500px',
}: ZenEmptyStateProps) {
  const defaultIcon = (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#AC8E66" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );

  return (
    <div className="flex-1 flex items-center justify-center pt-[10%]">
      <div
        style={{
          width: '100%',
          maxWidth,
          background: 'linear-gradient(180deg, #0B0B0B 0%, #171717 100%)',
          border: '.5px dotted #AC8E66',
          borderRadius: '12px',
          padding: '48px 32px',
          textAlign: 'center',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 24px',
            backgroundColor: 'transparent',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon ?? defaultIcon}
        </div>

        {/* Titel */}
        <h3
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '16px',
            fontWeight: '400',
            color: '#dbd9d5',
            marginBottom: description ? '12px' : '0',
          }}
        >
          {title}
        </h3>

        {/* Beschreibung */}
        {description && (
          <p
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
              color: '#777',
              marginBottom: buttonLabel ? '32px' : '0',
              lineHeight: '1.6',
            }}
          >
            {description}
          </p>
        )}

        {/* Button */}
        {buttonLabel && onButtonClick && (
          <button
            onClick={onButtonClick}
            style={{
              padding: '12px 24px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
              fontWeight: '500',
              color: '#1A1A1A',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#D4AF78';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#AC8E66';
            }}
          >
            {buttonLabel}
          </button>
        )}
      </div>
    </div>
  );
}
