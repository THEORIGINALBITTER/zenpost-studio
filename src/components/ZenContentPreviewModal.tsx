import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faFileLines, faFolderOpen,  } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import type { ContentPreviewState } from '../services/contentPreviewService';
import { downloadPreviewAsset } from '../services/contentPreviewService';

type ZenContentPreviewModalProps = {
  preview: ContentPreviewState;
  actions?: Array<{
    label: string;
    onClick: () => void | Promise<void>;
    icon?: IconDefinition;
    variant?: 'default' | 'accent' | 'success' | 'danger';
    disabled?: boolean;
    menuItems?: Array<{
      label: string;
      onClick: () => void | Promise<void>;
      icon?: IconDefinition;
      variant?: 'default' | 'accent' | 'success' | 'danger';
      disabled?: boolean;
    }>;
  }>;
  hideInlineDownload?: boolean;
  onClose: () => void;
};

const fontMono = 'IBM Plex Mono, monospace';

export function ZenContentPreviewModal({
  preview,
  actions = [],
  hideInlineDownload = false,
  onClose,
}: ZenContentPreviewModalProps) {
  const [openMenuLabel, setOpenMenuLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!openMenuLabel) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-zen-preview-action-menu="true"]')) return;
      setOpenMenuLabel(null);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [openMenuLabel]);

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
              {preview.subtitle}
            </div>
            {preview.subtitle ? (
              <div
                style={{
                  color: '#3e362c',
                  fontFamily: fontMono,
                  fontSize: '10px',
                  marginTop: '4px',
                }}
              >
                {preview.title}
              </div>
            ) : (
              <div
                style={{
                  color: '#3e362c',
                  fontFamily: fontMono,
                  fontSize: '10px',
                }}
              >
                {preview.title}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
            {actions.map((action) => {
              const variant = action.variant ?? 'default';
              const borderColor =
                variant === 'success'
                  ? ' rgba(30, 24, 16, 0.10)'
                  : variant === 'danger'
                    ? 'rgba(179,38,30,0.36)'
                  : variant === 'accent'
                    ? 'rgba(172,142,102,0.36)'
                    : 'rgba(208,203,184,0.32)';
              const background =
                variant === 'success'
                  ? 'transparent'
                  : variant === 'danger'
                    ? 'rgba(179,38,30,0.10)'
                  : variant === 'accent'
                    ? 'rgba(172,142,102,0.08)'
                    : 'rgba(255,255,255,0.02)';
              const color = variant === 'danger' ? '#8f1d16' : '#3e362c';

              const resolvedIcon = action.icon ?? (action.label === 'Öffnen' ? faFolderOpen : undefined);
              if (action.menuItems && action.menuItems.length > 0) {
                const menuOpen = openMenuLabel === action.label;
                return (
                  <div
                    key={action.label}
                    data-zen-preview-action-menu="true"
                    style={{ position: 'relative', flexShrink: 0 }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (action.disabled) return;
                        setOpenMenuLabel((prev) => (prev === action.label ? null : action.label));
                      }}
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
            
                      <span>{action.label}</span>
                    </button>
                    {menuOpen ? (
                      <div
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 6px)',
                          right: 0,
                          minWidth: '300px',
                          borderRadius: '10px',
                          border: '1px solid rgba(208,203,184,0.32)',
                          background: '#1a1a1a',
                          boxShadow: '0 14px 26px rgba(0,0,0,0.35)',
                          padding: '6px',
                          zIndex: 15,
                        }}
                      >
                        {action.menuItems.map((item) => {
                          const itemVariant = item.variant ?? 'default';
                          const itemColor = itemVariant === 'danger' ? '#e39b94' : itemVariant === 'success' ? '#99d0a5' : '#d0cbb8';
                          return (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => {
                                setOpenMenuLabel(null);
                                void item.onClick();
                              }}
                              disabled={item.disabled}
                              style={{
                                width: '100%',
                                borderRadius: '7px',
                                border: '1px solid transparent',
                                background: 'transparent',
                                color: itemColor,
                                minHeight: '34px',
                                padding: '0 10px',
                                cursor: item.disabled ? 'not-allowed' : 'pointer',
                                fontFamily: fontMono,
                                fontSize: '10px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'flex-start',
                                gap: '8px',
                                opacity: item.disabled ? 0.55 : 1,
                              }}
                            >
                              {item.icon ? <FontAwesomeIcon icon={item.icon} /> : null}
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              }
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
                    flexShrink: 0,
                  }}
                >
                  {resolvedIcon ? <FontAwesomeIcon icon={resolvedIcon} /> : null}
                  <span>{action.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={onClose}
              style={{
                borderRadius: '8px',
                border: '1px solid rgba(30, 24, 16, 0.10)',
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
                flexShrink: 0,
              }}
            >
             
              <span>Schließen</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          {preview.items.map((item) => (
            <div
              key={`${item.kind}-${item.fileName}`}
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
                    {item.fileName}
                  </div>
                </div>
                {!hideInlineDownload && item.kind === 'image' ? (
                  <button
                    type="button"
                    onClick={() => {
                      void downloadPreviewAsset(item.src, item.fileName);
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
                {item.kind === 'image' ? (
                  <img
                    src={item.src}
                    alt={item.fileName}
                    style={{ maxWidth: '100%', maxHeight: '320px', objectFit: 'contain', display: 'block' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      maxHeight: '320px',
                      overflow: 'auto',
                      borderRadius: '10px',
                      border: '1px solid rgba(231,204,170,0.16)',
                      background: '#111',
                      padding: '14px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '10px',
                        color: '#E7CCAA',
                        fontFamily: fontMono,
                        fontSize: '10px',
                      }}
                    >
                      <FontAwesomeIcon icon={faFileLines} />
                      <span>{item.format || 'Dokument'}</span>
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: '#d8d0c2',
                        fontFamily: fontMono,
                        fontSize: '10px',
                        lineHeight: 1.6,
                      }}
                    >
                      {item.content}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
