import { useState, type DragEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFile, faFolderOpen, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import type { SupportedFormat } from '../../utils/fileConverter';

interface FormatOption {
  value: SupportedFormat;
  label: string;
}

interface Step1FormatSelectionProps {
  detectedFormatLabel: string;
  fileName: string;
  hasInputContent: boolean;
  selectedFormats: SupportedFormat[];
  formatOptions: FormatOption[];
  recentConversions: Array<{
    id: string;
    fileName: string;
    fromFormat: SupportedFormat;
    targetFormats: SupportedFormat[];
    createdAt: number;
  }>;
  error: string | null;
  isPreparingInput: boolean;
  isConverting: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onToggleFormat: (format: SupportedFormat) => void;
  onUploadFile: (file: File) => void;
  onConvert: () => void;
}

export const Step1FormatSelection = ({
  detectedFormatLabel,
  fileName,
  hasInputContent,
  selectedFormats,
  formatOptions,
  recentConversions,
  error,
  isPreparingInput,
  isConverting,
  fileInputRef,
  onToggleFormat,
  onUploadFile,
  onConvert,
}: Step1FormatSelectionProps) => {
  const [isDropActive, setIsDropActive] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDropActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onUploadFile(file);
  };

  const canConvert = hasInputContent && selectedFormats.length > 0 && !isPreparingInput && !isConverting;

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'clamp(24px, 4vw, 48px) clamp(12px, 3vw, 32px)',
        gap: '24px',
        maxWidth: '1080px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* ─── Left: upload + format + convert ─── */}
      <div style={{ flex: '1.2', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Header */}
       

        {/* Beige card */}
        <div
          style={{
            borderRadius: '12px',
            border: '1px solid #b8b0a0',
            background: '#d0cbb8',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '4px 4px 20px rgba(0,0,0,0.28)',
          }}
        >
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDropActive(true); }}
            onDragEnter={(e) => { e.preventDefault(); setIsDropActive(true); }}
            onDragLeave={() => setIsDropActive(false)}
            onDrop={handleDrop}
            onClick={() => !isPreparingInput && fileInputRef.current?.click()}
            style={{
              borderRadius: '10px',
              border: isDropActive
                ? '1.5px dashed #AC8E66'
                : hasInputContent
                ? '1px solid rgba(172,142,102,0.55)'
                : '1px dashed rgba(172,142,102,0.45)',
              background: isDropActive
                ? 'rgba(172,142,102,0.13)'
                : hasInputContent
                ? 'rgba(172,142,102,0.07)'
                : 'rgba(255,255,255,0.28)',
              padding: '20px 14px',
              minHeight: '86px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              cursor: isPreparingInput ? 'wait' : 'pointer',
              transition: 'border-color 0.2s, background 0.2s',
            }}
          >
            <FontAwesomeIcon
              icon={isDropActive ? faFolderOpen : faFile}
              style={{
                fontSize: '16px',
                color: isDropActive ? '#AC8E66' : hasInputContent ? '#AC8E66' : '#b0a898',
                transition: 'color 0.2s',
              }}
            />
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'IBM Plex Mono, monospace',
                color: isDropActive ? '#7a5c30' : '#6b5a40',
                textAlign: 'center',
                fontWeight: isDropActive ? 500 : 400,
              }}
            >
              {isPreparingInput
                ? 'Datei wird vorbereitet…'
                : isDropActive
                ? 'Loslassen zum Importieren'
                : hasInputContent
                ? fileName
                : 'Datei hier ablegen'}
            </span>
            <span style={{ fontSize: '9px', color: '#9a8870', fontFamily: 'IBM Plex Mono, monospace', textAlign: 'center' }}>
              {isPreparingInput
                ? ''
                : isDropActive
                ? ''
                : hasInputContent
                ? `${detectedFormatLabel} erkannt · klicken zum Wechseln`
                : 'oder klicken zum Auswählen · .md .txt .json .html .pdf .docx .pages'}
            </span>
          </div>

          {/* Format selection */}
          <div>
            <p
              style={{
                fontSize: '9px',
                color: '#7a7060',
                fontFamily: 'IBM Plex Mono, monospace',
                margin: '0 0 8px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Ausgabeformate — Mehrfachwahl
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {formatOptions.map((opt) => {
                const isSel = selectedFormats.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onToggleFormat(opt.value)}
                    style={{
                      padding: '6px 4px',
                      borderRadius: '6px',
                      border: isSel ? '1px solid rgba(172,142,102,0.7)' : '1px solid rgba(90,80,60,0.3)',
                      background: isSel ? '#AC8E66' : 'rgba(255,255,255,0.3)',
                      color: isSel ? '#fff' : '#5a5040',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '10px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s',
                      fontWeight: isSel ? 500 : 400,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(172,142,102,0.25)' }} />

          {/* Convert button */}
          <button
            onClick={onConvert}
            disabled={!canConvert}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: canConvert ? '1px solid rgba(172,142,102,0.65)' : '1px solid rgba(172,142,102,0.2)',
              background: canConvert ? '#AC8E66' : 'rgba(172,142,102,0.12)',
              color: canConvert ? '#fff' : '#9a8870',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
              cursor: canConvert ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              fontWeight: 500,
            }}
          >
            <FontAwesomeIcon icon={faArrowRight} />
            {isPreparingInput ? 'Datei wird vorbereitet…' : 'Jetzt konvertieren'}
          </button>

          {error && (
            <div
              style={{
                borderRadius: '6px',
                border: '1px solid rgba(180,80,80,0.45)',
                background: 'rgba(180,80,80,0.08)',
                padding: '8px 10px',
                fontSize: '10px',
                color: '#8b3a3a',
                fontFamily: 'IBM Plex Mono, monospace',
              }}
            >
              {error}
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,.txt,.json,.html,.htm,.pdf,.docx,.doc,.pages,.js,.jsx,.ts,.tsx,.py,.rs,.go,.java,.c,.cpp,.h,.hpp,.cs,.php,.rb,.swift,.kt,.scala"
          style={{ display: 'none' }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUploadFile(file);
            event.currentTarget.value = '';
          }}
        />
      </div>

      {/* ─── Right: recent conversions ─── */}
      <div
        style={{
          flex: '0.8',
          minWidth: 0,
          borderRadius: '14px',
          border: '0.5px solid #2F2F2F',
          padding: '20px',
          marginTop: '46px',
        }}
      >
        <p
          style={{
            margin: '0 0 12px',
            fontSize: '9px',
            color: '#AC8E66',
            fontFamily: 'IBM Plex Mono, monospace',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          Letzte Konvertierungen
        </p>
        {recentConversions.length === 0 ? (
          <div
            style={{
              borderRadius: '8px',
              border: '0.5px solid #2F2F2F',
              padding: '12px',
              fontSize: '10px',
              color: '#555',
              fontFamily: 'IBM Plex Mono, monospace',
            }}
          >
            Noch keine Konvertierungen vorhanden.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '420px', overflow: 'auto' }}>
            {recentConversions.map((item) => (
              <div
                key={item.id}
                style={{
                  borderRadius: '8px',
                  border: '0.5px solid #3A3A3A',
                  background: 'rgba(255,255,255,0.01)',
                  padding: '8px 10px',
                }}
              >
                <div
                  style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '11px',
                    color: '#E7CCAA',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: '3px',
                  }}
                >
                  {item.fileName}
                </div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#8E8E8E' }}>
                  {item.fromFormat.toUpperCase()} → {item.targetFormats.map((f) => f.toUpperCase()).join(', ')}
                </div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px', color: '#555', marginTop: '2px' }}>
                  {formatDate(item.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
