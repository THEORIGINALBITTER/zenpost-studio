import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { PREVIEW_THEME_OPTIONS, type PreviewThemeId, getPreviewThemeVisual } from '../../../kits/PatternKit/zenMarkdownPreviewTypes';

interface Step1StyleThemeQuickMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  previewTheme: PreviewThemeId;
  onPreviewThemeChange?: (theme: PreviewThemeId) => void;
}

export function Step1StyleThemeQuickMenu({
  isOpen,
  onToggle,
  previewTheme,
  onPreviewThemeChange,
}: Step1StyleThemeQuickMenuProps) {
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onToggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onToggle]);

  return (
    <>
      <button
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'absolute',
          left: -28,
          top: 603,
          transform: 'rotate(-90deg)',
          transformOrigin: 'left top',
          padding: '10px 10px',
          borderRadius: '8px 8px 0px 0px',
          cursor: 'pointer',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '10px',
          color: isOpen ? '#1a1a1a' : '#aaaaaa',
          letterSpacing: '0.03em',
          whiteSpace: 'nowrap',
          zIndex: 1,
          overflow: 'hidden',
          minWidth: '80px',
          transition: 'background 0.2s ease',
          backgroundColor: isOpen ? '#d0cbb8' : '#1a1a1a',
          border: '0.5px solid rgba(208, 203, 184, 0.45)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: hovered ? 0 : 1,
            transition: 'opacity 0.18s ease',
            padding: '0 10px',
          }}
        >
          Style Menu
        </span>
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: hovered ? 1 : 0,
            color: '#d0cbb8',
            transition: 'opacity 0.18s ease',
            padding: '0 10px',
          }}
        >
          {isOpen ? 'Schließen ×' : 'Öffnen →'}
        </span>
        <span style={{ visibility: 'hidden' }}>Style Themen Schnellmenü</span>
      </button>

      {isOpen && (
        <div
          style={{
            width: 248,
            position: 'absolute',
            top: 90,
            left: -260,
            padding: '12px',
            borderRadius: 10,
            background: '#151515',
            border: '1px solid rgba(172, 142, 102, 0.25)',
            boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxHeight: 'calc(100vh - 320px)',
            overflowY: 'auto',
            zIndex: 6,
            transform: 'translateX(120px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div className="font-mono text-[10px] text-[#AC8E66] tracking-wide">
              Style Themen · ESC Closed
            </div>
            <button
              type="button"
              onClick={onToggle}
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                border: '1px solid rgba(208, 203, 184, 0.16)',
                background: 'rgba(255,255,255,0.03)',
                color: '#d0cbb8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              title="Schnellmenü schließen"
            >
              <FontAwesomeIcon icon={faXmark} style={{ fontSize: 11 }} />
            </button>
          </div>
          <div className="font-mono text-[10px] text-[#999] leading-relaxed">
            Wählt direkt den visuellen Stil für Editor und Preview.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            {PREVIEW_THEME_OPTIONS.map((theme) => {
              const isActive = previewTheme === theme.id;
              const visual = getPreviewThemeVisual(theme.id);
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => onPreviewThemeChange?.(theme.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: isActive ? `1px solid ${visual.activeBorder}` : '1px solid rgba(208, 203, 184, 0.16)',
                    background: isActive ? visual.activeBg : 'rgba(255,255,255,0.02)',
                    color: isActive ? visual.text : '#d0cbb8',
                    cursor: 'pointer',
                    fontFamily: 'IBM Plex Mono, monospace',
                    textAlign: 'left',
                  }}
                  title={theme.label}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: visual.accent,
                        boxShadow: theme.group === 'mono' ? 'none' : `0 0 8px ${visual.accent}33`,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: 10,
                          letterSpacing: theme.group === 'mono' ? '0.04em' : '0.02em',
                          color: isActive ? visual.text : theme.group === 'mono' ? '#e5decf' : visual.accent,
                        }}
                      >
                        {theme.label}
                      </span>
                      <span style={{ fontSize: 9, color: '#8f887a' }}>
                        {theme.group === 'mono' ? 'Monochromer Schreibmodus' : 'Warmer Farbmodus'}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: 9, color: isActive ? visual.text : '#777' }}>
                    {isActive ? 'Aktiv' : 'Wählen'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
