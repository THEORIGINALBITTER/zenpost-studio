import { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faFolder } from '@fortawesome/free-solid-svg-icons';
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

  const update = (patch: Partial<ZenStudioSettings>) => {
    const next = patchZenStudioSettings(patch);
    setSettings(next);
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
            <input
              type="checkbox"
              checked={settings.showInGettingStarted}
              onChange={(e) => update({ showInGettingStarted: e.target.checked })}
              style={checkboxStyle}
            />
            Getting Started
          </label>

          <label style={toggleStyle}>
            <input
              type="checkbox"
              checked={settings.showInDocStudio}
              onChange={(e) => update({ showInDocStudio: e.target.checked })}
              style={checkboxStyle}
            />
            Doc Studio
          </label>

          <label style={toggleStyle}>
            <input
              type="checkbox"
              checked={settings.showInContentAIStudio}
              onChange={(e) => update({ showInContentAIStudio: e.target.checked })}
              style={checkboxStyle}
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
              <FontAwesomeIcon icon={faFolder} />
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
              fontSize: '11px',
              color: '#AC8E66',
              backgroundColor: '#151515',
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

const checkboxStyle: React.CSSProperties = {
  width: '16px',
  height: '16px',
  cursor: 'pointer',
  accentColor: '#AC8E66',
};

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
  width: '32px',
  height: '28px',
  background: '#151515',
  color: '#AC8E66',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
