import { useEffect, useState } from 'react';
import { exists } from '@tauri-apps/plugin-fs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { isTauri } from '@tauri-apps/api/core';

import { ZenSlider } from '../../components/ZenSlider';
import {
  defaultEditorSettings,
  getEditorSettingsPath,
  loadEditorSettings,
  saveEditorSettings,
  type EditorSettings,
} from '../../../../../services/editorSettingsService';
import { EDITOR_SETTINGS_STORAGE_KEY } from '../../../../../constants/settingsKeys';
import { getLastProjectPath } from '../../../../../utils/projectHistory';

const loadSettingsFromStorage = (): EditorSettings | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(EDITOR_SETTINGS_STORAGE_KEY);
  if (!raw) return null;
  try {
    return { ...defaultEditorSettings, ...JSON.parse(raw) };
  } catch {
    return null;
  }
};

const SectionLabel = ({ children }: { children: string }) => (
  <div
    style={{
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: '0.12em',
      color: '#AC8E66',
      textTransform: 'uppercase',
      marginBottom: 14,
    }}
  >
    {children}
  </div>
);

const Divider = () => (
  <div style={{ borderTop: '1px solid rgba(172,142,102,0.25)', margin: '4px 0' }} />
);

const CheckboxOption = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
}) => (
  <label
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '9px 12px',
      backgroundColor: 'transparent',
      border: '1px solid rgba(172,142,102,0.35)',
      borderRadius: 6,
      cursor: 'pointer',
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: 11,
      color: '#555',
      userSelect: 'none',
    }}
  >
    <div
      style={{
        width: 16,
        height: 16,
        borderRadius: 4,
        border: checked ? '1.5px solid #AC8E66' : '1.5px solid #4A4A4A',
        backgroundColor: checked ? 'rgba(172,142,102,0.18)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'border-color 0.15s, background-color 0.15s',
      }}
      onClick={() => onChange(!checked)}
    >
      {checked && <FontAwesomeIcon icon={faCheck} style={{ fontSize: 8, color: '#AC8E66' }} />}
    </div>
    {label}
  </label>
);

export const ZenEditorSettingsContent = () => {
  const projectPath = getLastProjectPath();
  const [settings, setSettings] = useState<EditorSettings>(
    loadSettingsFromStorage() ?? { ...defaultEditorSettings }
  );

  useEffect(() => {
    if (!projectPath) return;
    let isMounted = true;
    const loadSettings = async () => {
      const settingsPath = await getEditorSettingsPath(projectPath);
      const hasSettingsFile = await exists(settingsPath);
      if (!hasSettingsFile) return;
      const loaded = await loadEditorSettings(projectPath);
      if (isMounted) setSettings(loaded);
    };
    loadSettings();
    return () => { isMounted = false; };
  }, [projectPath]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(EDITOR_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      window.dispatchEvent(new CustomEvent('zen-editor-settings-updated', { detail: settings }));
    }
    if (!projectPath) return;
    const timeout = setTimeout(() => {
      saveEditorSettings(projectPath, settings).catch((error) => {
        console.error('[EditorSettings] Failed to save settings:', error);
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [settings, projectPath]);

  const handleAutoSaveToggle = (enabled: boolean) => {
    setSettings((prev) => ({ ...prev, autoSaveEnabled: enabled }));
  };

  return (
    <div className="w-full flex justify-center" style={{ padding: "32px 32px" }}>
      <div className="w-full max-w-[860px] rounded-[10px] bg-[#E8E1D2] border border-[#AC8E66]/60 shadow-2xl overflow-hidden">

        {/* Panel Header */}
        <div
          style={{
            borderBottom: '1px solid rgba(172,142,102,0.35)',
            padding: '16px 24px',
            textAlign: 'center',
          
          }}
        >
          <div
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 12,
              fontWeight: 600,
              color: '#3A3A3A',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Editor-Preview Einstellungen 
          </div>
          <div
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 10,
              color: '#888',
              marginTop: 4,
            }}
          >
            Verhalten und Darstellung anpassen
          </div>
        </div>

        {/* Panel Body */}
        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* TEXT */}
          <div>
            <SectionLabel>Editor Text</SectionLabel>
            <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>

              {/* Live Mini-Vorschau */}
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 120, height: 120,
                  background: '#EDE6D8',
                  border: '1px solid rgba(172,142,102,0.4)',
                  borderRadius: 3,
                  position: 'relative',
                  boxShadow: '2px 4px 12px rgba(0,0,0,0.18)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '12px 14px',
                }}>
                  <div style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: Math.round(settings.fontSize * 1.1),
                    color: '#3A3A3A',
                    lineHeight: 1,
                    letterSpacing: '0.02em',
                    flexShrink: 0,
                  }}>
                    Aa
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: Math.max(2, settings.fontSize * 0.18), width: '100%' }}>
                    {[100, 78, 90, 55].map((w, i) => (
                      <div key={i} style={{
                        width: `${w}%`,
                        height: Math.max(1.5, settings.fontSize * 0.13),
                        background: 'rgba(60,50,40,0.18)',
                        borderRadius: 1,
                      }} />
                    ))}
                  </div>
                </div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: '#888', letterSpacing: '0.05em' }}>
                  Live-Vorschau
                </div>
              </div>

              {/* Slider */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 8 }}>
                <ZenSlider
                  label="Schriftgroesse"
                  value={settings.fontSize}
                  min={10}
                  max={20}
                  step={1}
                  valueFormatter={(value) => `${value}px`}
                  onChange={(value) => setSettings((prev) => ({ ...prev, fontSize: value }))}
                />
              </div>

            </div>
          </div>

          <Divider />

          {/* SEITENRÄNDER */}
          <div>
            <SectionLabel>Seitenränder</SectionLabel>
            <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>

              {/* Live Mini-Vorschau */}
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                {(() => {
                  const W = 120; const H = 170;
                  const scaleX = W / 800; const scaleY = H / 1100;
                  const top    = settings.marginTop    * scaleY;
                  const bottom = settings.marginBottom * scaleY;
                  const left   = settings.marginLeft   * scaleX;
                  const right  = settings.marginRight  * scaleX;
                  return (
                    <div style={{
                      width: W, height: H,
                      background: '#EDE6D8',
                      border: '1px solid rgba(172,142,102,0.4)',
                      borderRadius: 3,
                      position: 'relative',
                      boxShadow: '2px 4px 12px rgba(0,0,0,0.18)',
                      overflow: 'hidden',
                    }}>
                      {/* Inhaltsfläche */}
                      <div style={{
                        position: 'absolute',
                        top, left, right, bottom,
                        background: 'rgba(172,142,102,0.07)',
                      }} />
                      {/* Rand-Guides */}
                      <div style={{ position: 'absolute', top, left: 0, right: 0, borderTop: '1px dashed rgba(172,142,102,0.6)', pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', bottom, left: 0, right: 0, borderTop: '1px dashed rgba(172,142,102,0.6)', pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left, borderLeft: '1px dashed rgba(172,142,102,0.6)', pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', top: 0, bottom: 0, right, borderLeft: '1px dashed rgba(172,142,102,0.6)', pointerEvents: 'none' }} />
                      {/* Textzeilen-Simulation */}
                      {[0,1,2,3,4,5].map(i => (
                        <div key={i} style={{
                          position: 'absolute',
                          top: top + 6 + i * 8,
                          left: left + 4,
                          right: right + (i % 3 === 2 ? 20 : i % 3 === 1 ? 8 : 4),
                          height: 2,
                          background: 'rgba(60,50,40,0.15)',
                          borderRadius: 1,
                        }} />
                      ))}
                    </div>
                  );
                })()}
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 8, color: '#888', letterSpacing: '0.05em' }}>
                  Live-Vorschau
                </div>
              </div>

              {/* Slider */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <ZenSlider
                  label="Oben"
                  value={settings.marginTop}
                  min={0} max={120} step={4}
                  valueFormatter={(v) => `${v}px`}
                  onChange={(v) => setSettings((prev) => ({ ...prev, marginTop: v }))}
                />
                <ZenSlider
                  label="Unten"
                  value={settings.marginBottom}
                  min={0} max={120} step={4}
                  valueFormatter={(v) => `${v}px`}
                  onChange={(v) => setSettings((prev) => ({ ...prev, marginBottom: v }))}
                />
                <ZenSlider
                  label="Links"
                  value={settings.marginLeft}
                  min={0} max={160} step={4}
                  valueFormatter={(v) => `${v}px`}
                  onChange={(v) => setSettings((prev) => ({ ...prev, marginLeft: v }))}
                />
                <ZenSlider
                  label="Rechts"
                  value={settings.marginRight}
                  min={0} max={160} step={4}
                  valueFormatter={(v) => `${v}px`}
                  onChange={(v) => setSettings((prev) => ({ ...prev, marginRight: v }))}
                />
              </div>
            </div>
          </div>

          <Divider />

          {/* DARSTELLUNG */}
          <div>
            <SectionLabel>Darstellung</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <CheckboxOption
                checked={settings.wrapLines}
                onChange={(val) => setSettings((prev) => ({ ...prev, wrapLines: val }))}
                label="Automatischer Zeilenumbruch"
              />
              <CheckboxOption
                checked={settings.showLineNumbers}
                onChange={(val) => setSettings((prev) => ({ ...prev, showLineNumbers: val }))}
                label="Zeilennummern anzeigen"
              />
              <CheckboxOption
                checked={settings.autoSaveEnabled}
                onChange={handleAutoSaveToggle}
                label="Automatisch speichern"
              />
              {settings.autoSaveEnabled && (
                <div style={{ paddingLeft: 28, paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <ZenSlider
                    label="Intervall"
                    value={settings.autoSaveIntervalSec}
                    min={5}
                    max={120}
                    step={5}
                    valueFormatter={(value) => `${value} Sekunden`}
                    onChange={(value) =>
                      setSettings((prev) => ({ ...prev, autoSaveIntervalSec: value }))
                    }
                  />
                  {isTauri() && (
                    <div>
                      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 9, color: '#AC8E66', marginBottom: 6 }}>
                        AUTOSAVE-ORDNER
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          flex: 1, fontFamily: 'IBM Plex Mono, monospace', fontSize: 9,
                          color: settings.autoSaveCustomPath ? '#1a1a1a' : '#1a1a1a',
                          background: 'transparent', border: '1px solid rgba(172,142,102,0.25)',
                          borderRadius: 4, padding: '4px 8px', overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {settings.autoSaveCustomPath ?? 'Standard (Projektordner)'}
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            const selected = await openDialog({ directory: true, multiple: false });
                            if (typeof selected === 'string' && selected) {
                              setSettings((prev) => ({ ...prev, autoSaveCustomPath: selected }));
                            }
                          }}
                          style={{
                            fontFamily: 'IBM Plex Mono, monospace', fontSize: 9,
                            background: 'rgba(172,142,102,0.12)', border: '1px solid rgba(172,142,102,0.4)',
                            borderRadius: 4, color: '#AC8E66', padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap',
                          }}
                        >
                          Ordner wählen
                        </button>
                        {settings.autoSaveCustomPath && (
                          <button
                            type="button"
                            onClick={() => setSettings((prev) => ({ ...prev, autoSaveCustomPath: undefined }))}
                            style={{
                              fontFamily: 'IBM Plex Mono, monospace', fontSize: 9,
                              background: 'transparent', border: '1px solid rgba(172,142,102,0.25)',
                              borderRadius: 4, color: '#666', padding: '4px 8px', cursor: 'pointer',
                            }}
                          >
                            Zurücksetzen
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
