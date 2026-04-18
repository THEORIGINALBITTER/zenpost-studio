import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faXmark } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

type ZenImagePreviewModalProps = {
  title: string;
  subtitle?: string;
  images: Array<{
    src: string;
    fileName: string;
    format?: string;
  }>;
  actions?: Array<{
    label: string;
    onClick: () => void | Promise<void>;
    icon?: IconDefinition;
    variant?: 'default' | 'accent' | 'success';
    disabled?: boolean;
  }>;
  hideInlineDownload?: boolean;
  onClose: () => void;
};

const fontMono = 'IBM Plex Mono, monospace';

export function ZenImagePreviewModal({
  title,
  subtitle,
  images,
  actions = [],
  hideInlineDownload = false,
  onClose,
}: ZenImagePreviewModalProps) {
  const handleDownload = async (src: string, fileName: string) => {
    const response = await fetch(src);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1200);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.74)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '24px',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(920px, 100%)',
          maxHeight: '82vh',
          overflow: 'auto',
          borderRadius: '14px',
          border: '1px solid rgba(208,203,184,0.28)',
          background: '#e8e3d8',
          boxShadow: '0 18px 60px rgba(0,0,0,0.45)',
          padding: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '14px',
            gap: '12px',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: '#3e362c',
                fontFamily: fontMono,
                fontSize: '10px',
                wordBreak: 'break-word',
              }}
            >
              {subtitle}
            </div>
            {subtitle ? (
              <div
                style={{
                  color: '#3e362c',
                  fontFamily: fontMono,
                  fontSize: '10px',
                  marginTop: '4px',
                }}
              >
                {title}
              </div>
            ) : null}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {actions.map((action) => {
              const variant = action.variant ?? 'default';
              const borderColor =
                variant === 'success'
                  ? 'rgba(94,163,111,0.36)'
                  : variant === 'accent'
                    ? 'rgba(172,142,102,0.36)'
                    : 'rgba(208,203,184,0.32)';
              const background =
                variant === 'success'
                  ? 'rgba(94,163,111,0.10)'
                  : variant === 'accent'
                    ? 'rgba(172,142,102,0.08)'
                    : 'rgba(255,255,255,0.02)';
              const color =
                variant === 'success'
                  ? '#3e362c'
                  : '#3e362c';

              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => { void action.onClick(); }}
                  disabled={action.disabled}
                  style={{
                    borderRadius: '8px',
                    border: `1px solid ${borderColor}`,
                    background,
                    color,
                    minHeight: '40px',
                    padding: '0 14px',
                    cursor: action.disabled ? 'not-allowed' : 'pointer',
                    fontFamily: fontMono,
                    fontSize: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: action.disabled ? 0.55 : 1,
                  }}
                >
                  {action.icon ? <FontAwesomeIcon icon={action.icon} /> : null}
                  <span>{action.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={onClose}
              style={{
                borderRadius: '8px',
                border: '1px solid rgba(30, 24, 16, 0.22)',
                background: 'rgba(255,255,255,0.02)',
                color: '#3e362c',
                minHeight: '40px',
                minWidth: '40px',
                padding: '0 12px',
                cursor: 'pointer',
                fontFamily: fontMono,
                fontSize: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <FontAwesomeIcon icon={faXmark} />
              <span>Schließen</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {images.map((image) => (
            <div
              key={`${image.fileName}-${image.src}`}
              style={{
                borderRadius: '10px',
                border: '1px solid #2f2f2f',
                background: '#252525',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '10px',
                  borderBottom: '1px solid #222',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      color: '#E7CCAA',
                      fontFamily: fontMono,
                      fontSize: '10px',
                      wordBreak: 'break-word',
                    }}
                  >
                    {image.fileName}
                  </div>
              
                </div>
                {!hideInlineDownload ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleDownload(image.src, image.fileName);
                    }}
                    style={{
                      borderRadius: '7px',
                      border: '1px solid rgba(172,142,102,0.32)',
                      background: 'rgba(172,142,102,0.08)',
                      color: '#E7CCAA',
                      minHeight: '30px',
                      minWidth: '30px',
                      padding: '0 9px',
                      cursor: 'pointer',
                      fontFamily: fontMono,
                      fontSize: '10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '7px',
                      flexShrink: 0,
                    }}
                    title="Bild speichern"
                  >
                    <FontAwesomeIcon icon={faDownload} />
                  </button>
                ) : null}
              </div>
              <div
                style={{
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '220px',
                  background: '#1a1a1a',
                }}
              >
                <img
                  src={image.src}
                  alt={image.fileName}
                  style={{ maxWidth: '100%', maxHeight: '320px', objectFit: 'contain', display: 'block' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
