import { useEffect, useMemo, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear, faXmark } from '@fortawesome/free-solid-svg-icons';
import {
  PREVIEW_THEME_OPTIONS,
  type PreviewThemeId,
  getPreviewThemeVisual,
} from '../../../kits/PatternKit/zenMarkdownPreviewTypes';
import {
  EDITOR_MARGIN_PRESETS,
  detectEditorMarginPreset,
  type DraftAutosaveRecord,
  type EditorSettings,
} from '../../../services/editorSettingsService';

interface Step1StyleThemeQuickMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  previewTheme: PreviewThemeId;
  onPreviewThemeChange?: (theme: PreviewThemeId) => void;
  editorSettings?: EditorSettings;
  onEditorSettingsChange?: (patch: Partial<EditorSettings>) => void;
  autosaveStatusText?: string | null;
  autosaveHistory?: DraftAutosaveRecord[];
  onOpenEditorSettings?: () => void;
  onAutosaveHistoryRestore?: (record: DraftAutosaveRecord) => void;
  onAutosaveHistoryCompare?: (record: DraftAutosaveRecord) => void;
  onOpenComparison?: () => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function Step1StyleThemeQuickMenu({
  isOpen,
  onToggle,
  previewTheme,
  onPreviewThemeChange,
  editorSettings,
  onEditorSettingsChange,
  autosaveStatusText = null,
  autosaveHistory = [],
  onOpenEditorSettings,
  onAutosaveHistoryRestore,
  onAutosaveHistoryCompare,
  onOpenComparison,
}: Step1StyleThemeQuickMenuProps) {
  const [hovered, setHovered] = useState(false);
  const [showAutosaveHistory, setShowAutosaveHistory] = useState(false);
  const [autosaveHovered, setAutosaveHovered] = useState(false);
  const autosaveHistoryRef = useRef<HTMLDivElement | null>(null);

  const marginPreset = useMemo(
    () => editorSettings
      ? detectEditorMarginPreset({
          marginTop: editorSettings.marginTop,
          marginBottom: editorSettings.marginBottom,
          marginLeft: editorSettings.marginLeft,
          marginRight: editorSettings.marginRight,
        })
      : 'custom',
    [editorSettings]
  );

  const autosaveLabel = autosaveStatusText
    ?? `Autosave · ${editorSettings?.autoSaveEnabled ? 'on' : 'off'}`;

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

  useEffect(() => {
    if (!showAutosaveHistory) return;
    const handler = (event: MouseEvent) => {
      if (!autosaveHistoryRef.current) return;
      if (!autosaveHistoryRef.current.contains(event.target as Node)) {
        setShowAutosaveHistory(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAutosaveHistory]);

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
          Quick Menu
        </span>
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: hovered ? 1 : 0,
            color: hovered ? '#d0cbb8' : '#d0cbb8',
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
            width: 300,
            position: 'absolute',
            top: 90,
            left: -250,
            padding: '12px',
            borderRadius: 10,
            background: '#d0cbb8',
            border: '1px solid rgba(21, 21, 21, 0.35)',
            boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            maxHeight: 'calc(100vh - 320px)',
            overflowY: 'auto',
            zIndex: 6,
            transform: 'translateX(120px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div className="font-mono text-[10px] text-[#1a1a1a] tracking-wide">
              Quick Menu · ESC Closed
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
                color: '#1a1a1a',
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

          <div
            style={{
                border: '1px solid rgba(21, 21, 21, 0.35)',
              borderRadius: 8,
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div className="font-mono text-[10px] text-[#1a1a1a] tracking-wide">Style Themen</div>
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
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: isActive ? `1px solid #252525` : '1px solid rgba(208, 203, 184, 0.16)',
                    background: isActive ? '#252525' : 'transparent',
                   
                    cursor: 'pointer',
                    fontFamily: 'IBM Plex Mono, monospace',
                    textAlign: 'left',
                  }}
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
                      <span style={{ 
                        fontSize: 10, 
                        color: isActive ? '#d2cabd' : '#252525',
                        }}>
                        {theme.label}
                      </span>
                      <span style={{ fontSize: 10, 
                         color: isActive ? '#d2cabd' : '#252525',
                        }}>
                        {theme.group === 'mono' ? 'Monochromer Schreibmodus' : 'Warmer Farbmodus'}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: 9, color: isActive ? '#57ab0d': '#151515' }}>
                    {isActive ? 'Aktiv' : 'Wählen'}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            style={{
               border: '1px solid rgba(21, 21, 21, 0.35)',
              borderRadius: 8,
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div className="font-mono text-[10px] text-[#1a1a1a] tracking-wide">Editor</div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div className="font-mono text-[9px] text-[#252525]">Schriftgröße</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => onEditorSettingsChange?.({ fontSize: clamp((editorSettings?.fontSize ?? 12) - 1, 10, 28) })}
                  style={{
                    border: '1px solid #3A3A3A',
                    borderRadius: 4,
                    background: 'transparent',
                    color: '#1a1a1a',
                    fontSize: 10,
                    padding: '2px 6px',
                    cursor: 'pointer',
                    fontFamily: 'IBM Plex Mono, monospace',
                  }}
                >
                  −
                </button>
                <span 
                className="font-mono text-[9px] text-[#1a1a1a]" 
                style={{ minWidth: 42, textAlign: 'center' }}>
                  {editorSettings?.fontSize ?? 12}px
                </span>

                <button
                  type="button"
                  onClick={() => onEditorSettingsChange?.({ fontSize: clamp((editorSettings?.fontSize ?? 12) + 1, 10, 28) })}
                  style={{
                    border: '1px solid #3A3A3A',
                    borderRadius: 4,
                    background: 'transparent',
                    color: '#1a1a1a',
                    fontSize: 10,
                    padding: '2px 6px',
                    cursor: 'pointer',
                    fontFamily: 'IBM Plex Mono, monospace',
                  }}
                >
                  +
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="font-mono text-[9px] text-[#252525]">Seitenabstand</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {EDITOR_MARGIN_PRESETS.map((preset) => {
                  const active = marginPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onEditorSettingsChange?.({ ...preset.margins })}
                      style={{
                        border: active ? '1px solid #1a1a1a' : '1px solid #3A3A3A',
                        borderRadius: 5,
                        background: active ? '#252525' : 'transparent',
                        color: active ? '#d2cabd' : '#252525',
                        fontSize: 9,
                        padding: '3px 7px',
                        cursor: 'pointer',
                        fontFamily: 'IBM Plex Mono, monospace',
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <div className="font-mono text-[9px] text-[#1a1a1a]">
                Oben {editorSettings?.marginTop ?? 0}px · Unten {editorSettings?.marginBottom ?? 0}px · Links {editorSettings?.marginLeft ?? 0}px · Rechts {editorSettings?.marginRight ?? 0}px
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => onEditorSettingsChange?.({ wrapLines: !(editorSettings?.wrapLines ?? true) })}
                style={{
                  border: '1px solid #3A3A3A',
                  borderRadius: 5,
                  background: editorSettings?.wrapLines ? '#252525' : 'transparent',
                  color: editorSettings?.wrapLines ? '#d2cabd' : '#d0cbb8',
                  fontSize: 9,
                  padding: '3px 7px',
                  cursor: 'pointer',
                  fontFamily: 'IBM Plex Mono, monospace',
                }}
              >
                Umbruch {editorSettings?.wrapLines ? 'an' : 'aus'}
              </button>
              <button
                type="button"
                onClick={() => onEditorSettingsChange?.({ showLineNumbers: !(editorSettings?.showLineNumbers ?? true) })}
                style={{
                  border: '1px solid #3A3A3A',
                  borderRadius: 5,
                  background: editorSettings?.showLineNumbers ? '#252525' : 'transparent',
                  color: editorSettings?.showLineNumbers ? '#d2cabd' : '#d0cbb8',
                  fontSize: 9,
                  padding: '3px 7px',
                  cursor: 'pointer',
                  fontFamily: 'IBM Plex Mono, monospace',
                }}
              >
                Zeilennummern {editorSettings?.showLineNumbers ? 'an' : 'aus'}
              </button>
            </div>
          </div>

          <div
            style={{
                border: '1px solid rgba(21, 21, 21, 0.35)',
              borderRadius: 8,
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div ref={autosaveHistoryRef} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, position: 'relative' }}>
              <button
                type="button"
                onClick={() => autosaveHistory.length > 0 && setShowAutosaveHistory((prev) => !prev)}
                onMouseEnter={() => autosaveHistory.length > 0 && setAutosaveHovered(true)}
                onMouseLeave={() => setAutosaveHovered(false)}
                title={autosaveHistory.length > 0 ? `${autosaveHistory.length} Autosave-Versionen` : autosaveLabel}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: autosaveHistory.length > 0 ? 'pointer' : 'default',
                  minWidth: 200,
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    height: 14,
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 10,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      color: '#1a1a1a',
                      transform: autosaveHovered ? 'translateY(-100%)' : 'translateY(0)',
                      opacity: autosaveHovered ? 0 : 1,
                      transition: 'transform 0.22s ease, opacity 0.18s ease',
                    }}
                  >
                    {autosaveLabel}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      color: '#1a1a1a',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      whiteSpace: 'nowrap',
                      transform: autosaveHovered ? 'translateY(0)' : 'translateY(100%)',
                      opacity: autosaveHovered ? 1 : 0,
                      transition: 'transform 0.22s ease, opacity 0.18s ease',
                    }}
                  >
                    {autosaveHistory.length > 0 ? 'Verlauf ansehen →' : ''}
                  </span>
                </div>
              </button>

              {showAutosaveHistory && autosaveHistory.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    width: 248,
                    maxHeight: 280,
                    overflowY: 'auto',
                    background: '#d0cbb8',
                    border: '1px solid #3A3A3A',
                    borderRadius: 8,
                    zIndex: 40,
                    boxShadow: '0 4px 24px rgba(0,0,0,0.55)',
                  }}
                >
                  <div style={{ padding: '8px 10px', fontSize: 9, color: '#1a1a1a', borderBottom: '1px solid rgba(28,28,28,0.2)', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Autosave-Verlauf
                  </div>
                  {autosaveHistory.map((record, index) => (
                    <div
                      key={record.meta.updatedAt}
                      style={{
                        padding: '8px 10px',
                        borderBottom: index < autosaveHistory.length - 1 ? '1px solid rgba(28,28,28,0.15)' : 'none',
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 9, color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace' }}>
                          {new Date(record.meta.updatedAt).toLocaleString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div style={{ fontSize: 9, color: '#555', fontFamily: 'IBM Plex Mono, monospace', marginTop: 2 }}>
                          {record.meta.contentLength.toLocaleString('de-DE')} Zeichen
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <button
                          type="button"
                          onClick={() => {
                            onAutosaveHistoryRestore?.(record);
                            setShowAutosaveHistory(false);
                          }}
                          style={{
                            background: 'transparent',
                            border: '1px solid #1a1a1a',
                            borderRadius: 4,
                            color: '#1a1a1a',
                            fontSize: 9,
                            padding: '2px 6px',
                            cursor: 'pointer',
                            fontFamily: 'IBM Plex Mono, monospace',
                          }}
                        >
                          Laden
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onAutosaveHistoryCompare?.(record);
                            onOpenComparison?.();
                            setShowAutosaveHistory(false);
                          }}
                          style={{
                            background: 'transparent',
                            border: '1px solid #3A3A3A',
                            borderRadius: 4,
                            color: '#1a1a1a',
                            fontSize: 9,
                            padding: '2px 6px',
                            cursor: 'pointer',
                            fontFamily: 'IBM Plex Mono, monospace',
                          }}
                        >
                          Diff
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <button
                type="button"
                onClick={() => onEditorSettingsChange?.({ autoSaveEnabled: !(editorSettings?.autoSaveEnabled ?? false) })}
                style={{
                  border: '1px solid #3A3A3A',
                  borderRadius: 5,
                  background: editorSettings?.autoSaveEnabled ? '#252525' : 'transparent',
                  color: editorSettings?.autoSaveEnabled ? '#d2cabd' : '#252525',
                  fontSize: 9,
                  padding: '3px 7px',
                  cursor: 'pointer',
                  fontFamily: 'IBM Plex Mono, monospace',
                }}
              >
                Autosave {editorSettings?.autoSaveEnabled ? 'an' : 'aus'}
              </button>

            

            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="font-mono text-[9px] text-[#1a1a1a]">
                Intervall: {editorSettings?.autoSaveIntervalSec ?? 30}s
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {[10, 30, 60, 120].map((seconds) => {
                  const active = (editorSettings?.autoSaveIntervalSec ?? 30) === seconds;
                  return (
                    <button
                      key={seconds}
                      type="button"
                      onClick={() => onEditorSettingsChange?.({ autoSaveIntervalSec: seconds })}
                      style={{
                        border: active ? '1px solid #1a1a1a' : '1px solid #3A3A3A',
                        borderRadius: 5,
                        background: active ? '#252525' : 'transparent',
                        color: active ? '#d2cabd' : '#252525',
                        fontSize: 9,
                        padding: '3px 7px',
                        cursor: 'pointer',
                        fontFamily: 'IBM Plex Mono, monospace',
                      }}
                    >
                      {seconds}s
                    </button>
                  );
                })}
              </div>
            </div>

          
          </div>
        </div>
      )}
    </>
  );
}
