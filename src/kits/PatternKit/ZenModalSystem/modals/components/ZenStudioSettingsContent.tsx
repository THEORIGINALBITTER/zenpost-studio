import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { open } from '@tauri-apps/plugin-dialog';
import { exists, readTextFile } from '@tauri-apps/plugin-fs';
import { isTauri } from '@tauri-apps/api/core';
import {
  loadZenStudioSettings,
  patchZenStudioSettings,
  parseZenThoughtsFromEditor,
  serializeZenThoughtsForEditor,
  type ZenStudioSettings,
} from '../../../../../services/zenStudioSettingsService';
import { getLastProjectPath } from '../../../../../utils/projectHistory';

interface ZenStudioSettingsContentProps {
  onOpenZenThoughtsEditor?: (content: string, filePath?: string) => void;
}

export const ZenStudioSettingsContent = ({ onOpenZenThoughtsEditor }: ZenStudioSettingsContentProps) => {
  const [settings, setSettings] = useState<ZenStudioSettings>(() => loadZenStudioSettings());
  const [isThoughtsFileLoaded, setIsThoughtsFileLoaded] = useState(false);
  const [thoughtsFileStatusMessage, setThoughtsFileStatusMessage] = useState('Datei wird geprueft...');

  const update = (patch: Partial<ZenStudioSettings>): ZenStudioSettings => {
    const next = patchZenStudioSettings(patch);
    setSettings(next);
    return next;
  };

  const resolvedThoughtsFilePath = useMemo(() => {
    if (settings.thoughtsFilePath) return settings.thoughtsFilePath;
    const lastProjectPath = getLastProjectPath();
    if (!lastProjectPath) return null;
    return `${lastProjectPath}/ZEN_GEDANKEN.md`;
  }, [settings.thoughtsFilePath]);

  useEffect(() => {
    const checkThoughtsFile = async () => {
      if (!isTauri()) {
        setIsThoughtsFileLoaded(false);
        setThoughtsFileStatusMessage('Datei-Check nur in der Desktop-App verfuegbar');
        return;
      }
      if (!resolvedThoughtsFilePath) {
        setIsThoughtsFileLoaded(false);
        setThoughtsFileStatusMessage('Kein Pfad hinterlegt');
        return;
      }
      try {
        const fileExists = await exists(resolvedThoughtsFilePath);
        if (!fileExists) {
          setIsThoughtsFileLoaded(false);
          setThoughtsFileStatusMessage('ZEN_GEDANKEN.md nicht gefunden');
          return;
        }
        const raw = await readTextFile(resolvedThoughtsFilePath);
        const parsedThoughts = parseZenThoughtsFromEditor(raw);
        if (parsedThoughts.length === 0) {
          setIsThoughtsFileLoaded(false);
          setThoughtsFileStatusMessage('ZEN_GEDANKEN.md ist leer');
          return;
        }
        setIsThoughtsFileLoaded(true);
        setThoughtsFileStatusMessage('ZEN Gedanken geladen');
      } catch {
        setIsThoughtsFileLoaded(false);
        setThoughtsFileStatusMessage('ZEN_GEDANKEN.md konnte nicht geladen werden');
      }
    };
    void checkThoughtsFile();
  }, [resolvedThoughtsFilePath]);

  const handleSelectThoughtsFolder = async () => {
    if (!isTauri()) return;
    try {
      const result = await open({
        directory: false,
        multiple: false,
        title: 'ZEN Gedanken Datei waehlen',
        filters: [
          { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
          { name: 'Alle Dateien', extensions: ['*'] },
        ],
      });
      if (typeof result !== 'string') return;
      update({ thoughtsFilePath: result });
    } catch (error) {
      console.error('[ZenStudioSettings] Dateiauswahl fehlgeschlagen:', error);
    }
  };



  return (
    <div className="w-full flex justify-center" style={{ padding: "32px 32px" }}>
      <div className="w-full max-w-[860px] rounded-[10px] bg-[#E8E1D2] border border-[#AC8E66]/60 shadow-2xl overflow-hidden">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '24px 32px' }}>
          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#555' }}>
            ZEN Gedanken anzeigen in:
          </div>

          <label style={toggleStyle}>
            <ZenCheckbox
              checked={settings.showInGettingStarted}
              onChange={(val) => update({ showInGettingStarted: val })}
            />
            Getting Started
          </label>

          <label style={toggleStyle}>
            <ZenCheckbox
              checked={settings.showInDocStudio}
              onChange={(val) => update({ showInDocStudio: val })}
            />
            Doc Studio
          </label>

          <label style={toggleStyle}>
            <ZenCheckbox
              checked={settings.showInContentAIStudio}
              onChange={(val) => update({ showInContentAIStudio: val })}
            />
            Content AI Studio
          </label>

          <div className="border-b border-[0.7px] border-[#AC8E66]" />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px' }}>
              <FontAwesomeIcon icon={faCheck} style={{ color: isThoughtsFileLoaded ? '#1F8A41' : '#B3261E' }} />
              <span style={{ color: '#555' }}>{thoughtsFileStatusMessage}</span>
            </div>
          </div>

          <div style={pathRowStyle}>
            <div style={pathTextStyle}>
              {resolvedThoughtsFilePath ?? 'Kein Dateipfad hinterlegt'}
            </div>
            <button
              type="button"
              onClick={handleSelectThoughtsFolder}
              title="Datei auswaehlen"
              style={pathButtonStyle}
            >
             
             Zen auswaehlen
            </button>
          </div>

          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#666' }}>
            Aktueller Gedanke:
          </div>
          <div
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '11px',
              color: '#151515',
              border: '1px solid #3A3A3A',
              borderRadius: '8px',
              padding: '10px 12px',
              backgroundColor: 'rgba(255,255,255,0.35)',
            }}
          >
            {settings.thoughts[0] ?? 'Kein Gedanke vorhanden'}
          </div>

          <button
            onClick={() => {
              const content = serializeZenThoughtsForEditor(settings.thoughts);
              onOpenZenThoughtsEditor?.(content, resolvedThoughtsFilePath ?? undefined);
            }}
            style={{
              border: '1px solid #3A3A3A',
              borderRadius: '8px',
              padding: '10px 14px',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '9px',
              color: '#AC8E66',
              backgroundColor: 'transparent',
              cursor: 'pointer',
            }}
          >
            ZEN Gedanken oeffnen
          </button>

       

        

        

        </div>
      </div>
    </div>
  );
};

const toggleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 10px',
  backgroundColor: 'transparent',
  border: '1px solid #3A3A3A',
  borderRadius: '6px',
  cursor: 'pointer',
  fontFamily: 'monospace',
  fontSize: '11px',
  color: '#555',
};


const ZenCheckbox = ({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) => (
  <div
    role="checkbox"
    aria-checked={checked}
    tabIndex={0}
    onClick={() => onChange(!checked)}
    onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && onChange(!checked)}
    style={{
      width: 16,
      height: 16,
      borderRadius: 4,
      border: checked ? '1.5px solid #AC8E66' : '1.5px solid #4A4A4A',
      backgroundColor: checked ? 'rgba(172,142,102,0.18)' : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      flexShrink: 0,
      transition: 'border-color 0.15s, background-color 0.15s',
    }}
  >
    {checked && (
      <FontAwesomeIcon icon={faCheck} style={{ fontSize: 8, color: '#AC8E66' }} />
    )}
  </div>
);

const pathRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  border: '1px solid #3A3A3A',
  borderRadius: '8px',
  padding: '8px 10px',
  backgroundColor: 'rgba(255,255,255,0.2)',
};

const pathTextStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: '11px',
  color: '#555',
};

const pathButtonStyle: React.CSSProperties = {
  border: '1px solid #3A3A3A',
  borderRadius: '6px',
  width: 'auto',
  height: '28px',
  background: 'transparent',
  color: '#1a1a1a',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '10px',
  
};
