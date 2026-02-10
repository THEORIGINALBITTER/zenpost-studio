/**
 * TemplateHintBanner
 * Zeigt einen dezenten Hinweis an, warum ein Template geladen wurde
 */
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLightbulb } from '@fortawesome/free-solid-svg-icons';

interface TemplateHintBannerProps {
  message: string;
  detectedType?: string;
  onDismiss: () => void;
}

export function TemplateHintBanner({ message, detectedType, onDismiss }: TemplateHintBannerProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        marginBottom: '12px',
        backgroundColor: 'transparent',
        border: '1px solid rgba(172, 142, 102, 0.25)',
        borderRadius: '8px',
        fontFamily: 'IBM Plex Mono, monospace',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
       <span>
  <FontAwesomeIcon icon={faLightbulb} style={{ fontSize: '14px' }} />
</span>
        <div>
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: '#AC8E66',
              lineHeight: 1.4,
            }}
          >
            {message}
          </p>
          {detectedType && (
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: '11px',
                color: '#777',
              }}
            >
              {detectedType}
            </p>
          )}
        </div>
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 8px',
          fontSize: '16px',
          color: '#666',
          borderRadius: '4px',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(172, 142, 102, 0.15)';
          e.currentTarget.style.color = '#AC8E66';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#666';
        }}
        title="Hinweis schließen"
      >
        ×
      </button>
    </div>
  );
}
