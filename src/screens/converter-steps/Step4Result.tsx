import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faArrowLeft, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { SupportedFormat, getFileExtension } from '../../utils/fileConverter';

interface Step4ResultProps {
  activeFormat: SupportedFormat;
  availableFormats: SupportedFormat[];
  outputByFormat: Record<string, string>;
  onActiveFormatChange: (format: SupportedFormat) => void;
  onDownload: (format: SupportedFormat) => void;
  onStartOver: () => void;
  onOpenInContentStudio?: () => void;
  showOpenInContentStudio?: boolean;
}

export const Step4Result = ({
  activeFormat,
  availableFormats,
  outputByFormat,
  onActiveFormatChange,
  onDownload,
  onStartOver,
  onOpenInContentStudio,
  showOpenInContentStudio = false,
}: Step4ResultProps) => {
  const outputContent = outputByFormat[activeFormat] ?? '';
  const charCount = outputContent.length;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'clamp(24px, 4vw, 48px) clamp(12px, 3vw, 32px)',
        maxWidth: '1080px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        gap: '16px',
      }}
    >
      {/* Header */}
      <div style={{ width: '100%' }}>
        <h2
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 'clamp(16px, 2.5vw, 22px)',
            fontWeight: 400,
            margin: '0 0 4px',
          }}
        >
          <span style={{ color: '#AC8E66' }}>Step02:</span>
          <span style={{ color: '#e5e5e5' }}> Konvertierung abgeschlossen</span>
        </h2>
        <p style={{ margin: 0, fontSize: '10px', color: '#777', fontFamily: 'IBM Plex Mono, monospace' }}>
          {charCount.toLocaleString('de-DE')} Zeichen ·{' '}
          {availableFormats.length} Format{availableFormats.length !== 1 ? 'e' : ''}
        </p>
      </div>

      {/* Output card — full width, beige */}
      <div
        style={{
          width: '100%',
          borderRadius: '12px',
          border: '1px solid #b8b0a0',
          background: '#d0cbb8',
          boxShadow: '4px 4px 20px rgba(0,0,0,0.28)',
          overflow: 'hidden',
        }}
      >
        {/* Format tab bar */}
        {availableFormats.length > 1 && (
          <div
            style={{
              display: 'flex',
              gap: '2px',
              padding: '10px 12px 0',
              borderBottom: '1px solid rgba(172,142,102,0.25)',
            }}
          >
            {availableFormats.map((fmt) => {
              const isActive = fmt === activeFormat;
              return (
                <button
                  key={fmt}
                  onClick={() => onActiveFormatChange(fmt)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px 6px 0 0',
                    border: isActive ? '1px solid rgba(172,142,102,0.55)' : '1px solid transparent',
                    borderBottom: isActive ? '1px solid #d0cbb8' : '1px solid transparent',
                    background: isActive ? '#d0cbb8' : 'rgba(0,0,0,0.06)',
                    color: isActive ? '#1a1a1a' : '#7a7060',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '10px',
                    cursor: 'pointer',
                    fontWeight: isActive ? 500 : 400,
                    marginBottom: '-1px',
                    position: 'relative',
                    zIndex: isActive ? 2 : 1,
                  }}
                >
                  {fmt.toUpperCase()}
                </button>
              );
            })}
          </div>
        )}

        {/* Output viewer */}
        <div style={{ padding: availableFormats.length > 1 ? '16px' : '16px' }}>
          {availableFormats.length === 1 && (
            <p
              style={{
                margin: '0 0 8px',
                fontSize: '9px',
                color: '#7a7060',
                fontFamily: 'IBM Plex Mono, monospace',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              {activeFormat.toUpperCase()} · Ergebnis
            </p>
          )}
          <textarea
            value={outputContent}
            readOnly
            style={{
              width: '100%',
              height: '320px',
              background: 'rgba(255,255,255,0.35)',
              border: '1px solid rgba(172,142,102,0.3)',
              borderRadius: '8px',
              padding: '12px',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '11px',
              color: '#2a2010',
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Action row */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
        }}
      >
        {/* Download active format */}
        {activeFormat !== 'pdf' && (
          <button
            onClick={() => onDownload(activeFormat)}
            style={{
              padding: '9px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(172,142,102,0.6)',
              background: '#AC8E66',
              color: '#fff',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              fontWeight: 500,
            }}
          >
            <FontAwesomeIcon icon={faDownload} />
            {activeFormat.toUpperCase()} speichern
          </button>
        )}

        {/* Download all (if multiple) */}
        {availableFormats.length > 1 && (
          <button
            onClick={() => {
              availableFormats.forEach((fmt) => {
                if (fmt !== 'pdf' && outputByFormat[fmt]) onDownload(fmt);
              });
            }}
            style={{
              padding: '9px 16px',
              borderRadius: '8px',
              border: '0.5px solid #3A3A3A',
              background: 'transparent',
              color: '#e5e5e5',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
            }}
          >
            <FontAwesomeIcon icon={faDownload} />
            Alle speichern
          </button>
        )}

        {/* Open in Content Studio */}
        {showOpenInContentStudio && (
          <button
            onClick={onOpenInContentStudio}
            style={{
              padding: '9px 16px',
              borderRadius: '8px',
              border: '0.5px solid #3A3A3A',
              background: 'transparent',
              color: '#AC8E66',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
            }}
          >
            <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
            Im Content Studio öffnen{' '}
            <span style={{ opacity: 0.6, fontSize: '9px' }}>
              ({getFileExtension(activeFormat).replace('.', '').toUpperCase()})
            </span>
          </button>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Start over */}
        <button
          onClick={onStartOver}
          style={{
            padding: '9px 16px',
            borderRadius: '8px',
            border: '0.5px solid #3A3A3A',
            background: 'transparent',
            color: '#777',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
          }}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Neue Konvertierung
        </button>
      </div>
    </div>
  );
};
