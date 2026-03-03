import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faArrowLeft, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { SupportedFormat, getFileExtension } from '../../utils/fileConverter';

interface Step4ResultProps {
  activeFormat: SupportedFormat;
  availableFormats: SupportedFormat[];
  outputByFormat: Record<string, string>;
  showImageControls?: boolean;
  imageQuality?: number;
  imageRasterSize?: number;
  imageSmoothEdges?: boolean;
  activeImagePreset?: 'logo' | 'illustration' | 'photo' | 'custom';
  isPreviewRefreshing?: boolean;
  onActiveFormatChange: (format: SupportedFormat) => void;
  onImageQualityChange?: (value: number) => void;
  onImageRasterSizeChange?: (value: number) => void;
  onImageSmoothEdgesChange?: (value: boolean) => void;
  onImagePresetSelect?: (preset: 'logo' | 'illustration' | 'photo') => void;
  copyFeedback?: string | null;
  onCopyImageDataUrl?: () => void;
  onCopyImageBase64?: () => void;
  onSaveDataUrlTxt?: () => void;
  onSaveBase64Txt?: () => void;
  onDownload: (format: SupportedFormat) => void;
  onDownloadAll?: () => void;
  onStartOver: () => void;
  onOpenInContentStudio?: () => void;
  showOpenInContentStudio?: boolean;
}

export const Step4Result = ({
  activeFormat,
  availableFormats,
  outputByFormat,
  showImageControls = false,
  imageQuality = 86,
  imageRasterSize = 160,
  imageSmoothEdges = true,
  activeImagePreset = 'custom',
  isPreviewRefreshing = false,
  onActiveFormatChange,
  onImageQualityChange,
  onImageRasterSizeChange,
  onImageSmoothEdgesChange,
  onImagePresetSelect,
  copyFeedback = null,
  onCopyImageDataUrl,
  onCopyImageBase64,
  onSaveDataUrlTxt,
  onSaveBase64Txt,
  onDownload,
  onDownloadAll,
  onStartOver,
  onOpenInContentStudio,
  showOpenInContentStudio = false,
}: Step4ResultProps) => {
  const outputContent = outputByFormat[activeFormat] ?? '';
  const isImageFormat = activeFormat === 'png' || activeFormat === 'jpg' || activeFormat === 'jpeg' || activeFormat === 'webp' || activeFormat === 'svg';
  const isRasterDataUrl = outputContent.startsWith('data:image/');
  const svgDataUrl =
    activeFormat === 'svg' && outputContent
      ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(outputContent)}`
      : '';
  const imagePreviewSrc = isRasterDataUrl ? outputContent : svgDataUrl;
  const canCopyBase64 = outputContent.startsWith('data:') || activeFormat === 'svg';
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const imageBytes = useMemo(() => {
    if (!isImageFormat) return 0;
    if (outputContent.startsWith('data:')) {
      const base64Part = outputContent.split(',')[1] ?? '';
      const padding = (base64Part.match(/=*$/)?.[0].length ?? 0);
      return Math.max(0, Math.floor((base64Part.length * 3) / 4) - padding);
    }
    return new Blob([outputContent]).size;
  }, [isImageFormat, outputContent]);
  const imageKb = (imageBytes / 1024).toFixed(1);
  const pureBase64Length = outputContent.startsWith('data:')
    ? (outputContent.split(',')[1] ?? '').length
    : 0;
  const charCount = outputContent.length;

  useEffect(() => {
    if (!isImageFormat || !imagePreviewSrc) {
      setImageDimensions(null);
      return;
    }
    let disposed = false;
    const image = new Image();
    image.onload = () => {
      if (disposed) return;
      setImageDimensions({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      });
    };
    image.onerror = () => {
      if (!disposed) setImageDimensions(null);
    };
    image.src = imagePreviewSrc;
    return () => {
      disposed = true;
    };
  }, [isImageFormat, imagePreviewSrc]);

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
        <p
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 'clamp(16px, 2.5vw, 12px)',
            fontWeight: 400,
            margin: '0 0 4px',
          }}
        >
        
          <span style={{ color: '#dcc8b7' }}> Konvertierung abgeschlossen</span>
        </p>
        <p style={{ margin: 0, fontSize: '10px', color: '#777', fontFamily: 'IBM Plex Mono, monospace' }}>
          {isImageFormat && imageDimensions
            ? `${imageDimensions.width}x${imageDimensions.height} px · ${imageKb} KB`
            : `${charCount.toLocaleString('de-DE')} Zeichen`} ·{' '}
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
          {isImageFormat ? (
            <div
              style={{
                width: '100%',
                minHeight: '320px',
                background: 'rgba(255,255,255,0.35)',
                border: '1px solid rgba(172,142,102,0.3)',
                borderRadius: '8px',
                padding: '12px',
                boxSizing: 'border-box',
                display: 'flex',
                gap: '12px',
              }}
            >
              <div
                style={{
                  flex: 1,
                  minHeight: '296px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {imagePreviewSrc ? (
                  <img
                    src={imagePreviewSrc}
                    alt={`Preview ${activeFormat}`}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '440px',
                      objectFit: 'contain',
                      borderRadius: '6px',
                      border: '1px solid rgba(172,142,102,0.25)',
                      background: '#fff',
                    }}
                  />
                ) : (
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#7a7060' }}>
                    Keine Bildvorschau verfügbar
                  </span>
                )}
              </div>
              {showImageControls && (
                <div
                  style={{
                    width: '260px',
                    borderRadius: '8px',
                    border: '1px solid rgba(172,142,102,0.35)',
                    background: 'rgba(255,255,255,0.45)',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: '10px',
                      color: '#6b5a40',
                      fontFamily: 'IBM Plex Mono, monospace',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}
                  >
                    Live Preview
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {[
                      { id: 'logo', label: 'Logo' },
                      { id: 'illustration', label: 'Illustration' },
                      { id: 'photo', label: 'Foto' },
                    ].map((preset) => {
                      const active = activeImagePreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => onImagePresetSelect?.(preset.id as 'logo' | 'illustration' | 'photo')}
                          style={{
                            borderRadius: '6px',
                            border: active ? '1px solid rgba(172,142,102,0.8)' : '1px solid rgba(90,80,60,0.3)',
                            background: active ? '#AC8E66' : 'rgba(255,255,255,0.35)',
                            color: active ? '#fff' : '#5a5040',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '10px',
                            padding: '5px 6px',
                            cursor: 'pointer',
                          }}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '10px', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace' }}>
                      Qualität: {imageQuality}%
                    </span>
                    <input
                      type="range"
                      min={35}
                      max={100}
                      step={1}
                      value={imageQuality}
                      onChange={(event) => onImageQualityChange?.(Number(event.target.value))}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '10px', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace' }}>
                      Raster/Detail (SVG): {imageRasterSize}px
                    </span>
                    <input
                      type="range"
                      min={48}
                      max={320}
                      step={8}
                      value={imageRasterSize}
                      onChange={(event) => onImageRasterSizeChange?.(Number(event.target.value))}
                    />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={imageSmoothEdges}
                      onChange={(event) => onImageSmoothEdgesChange?.(event.target.checked)}
                    />
                    <span style={{ fontSize: '10px', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace' }}>
                      Kanten glätten
                    </span>
                  </label>
                  <span style={{ fontSize: '10px', color: '#7a7060', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {isPreviewRefreshing ? 'Aktualisiere Vorschau…' : 'Vorschau ist live aktiv'}
                  </span>
                  <div style={{ borderTop: '1px solid rgba(172,142,102,0.25)', marginTop: '2px', paddingTop: '8px' }}>
                    <p
                      style={{
                        margin: '0 0 6px',
                        fontSize: '10px',
                        color: '#6b5a40',
                        fontFamily: 'IBM Plex Mono, monospace',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                      }}
                    >
                      Export/Info
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '10px', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace' }}>
                        Größe: {imageKb} KB
                      </span>
                      {imageDimensions && (
                        <span style={{ fontSize: '10px', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace' }}>
                          Pixel: {imageDimensions.width}x{imageDimensions.height}
                        </span>
                      )}
                      {outputContent.startsWith('data:') && (
                        <span style={{ fontSize: '10px', color: '#5a5040', fontFamily: 'IBM Plex Mono, monospace' }}>
                          Base64: {pureBase64Length.toLocaleString('de-DE')} Zeichen
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', marginTop: '8px' }}>
                      <button
                        type="button"
                        onClick={onCopyImageDataUrl}
                        style={{
                          borderRadius: '6px',
                          border: '1px solid rgba(90,80,60,0.35)',
                          background: 'rgba(255,255,255,0.45)',
                          color: '#5a5040',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '10px',
                          padding: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        Data URL kopieren
                      </button>
                      <button
                        type="button"
                        onClick={onCopyImageBase64}
                        disabled={!canCopyBase64}
                        style={{
                          borderRadius: '6px',
                          border: '1px solid rgba(90,80,60,0.35)',
                          background: canCopyBase64 ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)',
                          color: canCopyBase64 ? '#5a5040' : '#8f887b',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '10px',
                          padding: '6px',
                          cursor: canCopyBase64 ? 'pointer' : 'not-allowed',
                        }}
                      >
                        Base64 kopieren
                      </button>
                      <button
                        type="button"
                        onClick={onSaveDataUrlTxt}
                        style={{
                          borderRadius: '6px',
                          border: '1px solid rgba(90,80,60,0.35)',
                          background: 'rgba(255,255,255,0.45)',
                          color: '#5a5040',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '10px',
                          padding: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        Data URL als TXT
                      </button>
                      <button
                        type="button"
                        onClick={onSaveBase64Txt}
                        disabled={!canCopyBase64}
                        style={{
                          borderRadius: '6px',
                          border: '1px solid rgba(90,80,60,0.35)',
                          background: canCopyBase64 ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)',
                          color: canCopyBase64 ? '#5a5040' : '#8f887b',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '10px',
                          padding: '6px',
                          cursor: canCopyBase64 ? 'pointer' : 'not-allowed',
                        }}
                      >
                        Base64 als TXT
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
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
          )}
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
            onClick={onDownloadAll}
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

        {copyFeedback && (
          <span
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '11px',
              color: '#9fd2ad',
              background: 'rgba(60,120,80,0.22)',
              border: '1px solid rgba(100,170,120,0.45)',
              borderRadius: '8px',
              padding: '7px 10px',
            }}
          >
            {copyFeedback}
          </span>
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
