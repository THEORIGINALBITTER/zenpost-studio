import { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolder, faFolderOpen, faXmark, faImage, faFile } from '@fortawesome/free-solid-svg-icons';
import { isTauri } from '@tauri-apps/api/core';
import {
  loadZenStudioSettings,
  patchZenStudioSettings,
  type ConverterConfig,
} from '../../../../../services/zenStudioSettingsService';
import {
  canUseDirectoryPicker,
  canUseOpfs,
  pickConverterFolder,
  pickConverterFolderTauri,
  clearConverterHandle,
  type ConverterFolderType,
} from '../../../../../services/converterStorageService';

const SIZE_PRESETS: { label: string; value: number | null }[] = [
  { label: 'Original', value: null },
  { label: '800', value: 800 },
  { label: '1280', value: 1280 },
  { label: '1920', value: 1920 },
  { label: '2560', value: 2560 },
  { label: '3840 (4K)', value: 3840 },
];

const mono: React.CSSProperties = { fontFamily: 'IBM Plex Mono, monospace' };

const sectionLabel: React.CSSProperties = {
  ...mono, fontSize: 9, color: '#7a7060', textTransform: 'uppercase',
  letterSpacing: '1px', marginBottom: 8,
};

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.45)',
  border: '1px solid rgba(172,142,102,0.3)',
  borderRadius: 10,
  padding: '14px 16px',
  marginBottom: 12,
};

const btnBase: React.CSSProperties = {
  ...mono, fontSize: 10, borderRadius: 6, cursor: 'pointer',
  padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 6,
  transition: 'all 0.15s',
};

export const ZenConverterSettingsContent = () => {
  const [config, setConfig] = useState<ConverterConfig>(() => loadZenStudioSettings().converter);
  const [picking, setPicking] = useState<ConverterFolderType | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [customSizeInput, setCustomSizeInput] = useState('');
  const customSizeRef = useRef<HTMLInputElement>(null);

  const showMsg = (text: string) => {
    setMsg(text);
    window.setTimeout(() => setMsg(null), 3000);
  };

  const reload = () => setConfig(loadZenStudioSettings().converter);

  const handlePick = async (type: ConverterFolderType) => {
    setPicking(type);
    try {
      const name = isTauri()
        ? await pickConverterFolderTauri(type)
        : await pickConverterFolder(type);
      if (name) {
        reload();
        showMsg(`Ordner gesetzt: ${name}`);
      }
    } catch (err) {
      showMsg(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`);
    } finally {
      setPicking(null);
    }
  };

  const handleClear = async (type: ConverterFolderType) => {
    await clearConverterHandle(type);
    const current = loadZenStudioSettings().converter;
    const patch = type === 'images'
      ? { converter: { ...current, imagesFolderName: null, imagesFolderPath: null } }
      : { converter: { ...current, archiveFolderName: null, archiveFolderPath: null } };
    patchZenStudioSettings(patch);
    reload();
    showMsg('Ordner entfernt');
  };

  const handleAutoSave = (val: boolean) => {
    const next = patchZenStudioSettings({ converter: { ...config, autoSave: val } });
    setConfig(next.converter);
  };

  const handleOpfsToggle = (val: boolean) => {
    const next = patchZenStudioSettings({ converter: { ...config, useOpfsInWeb: val } });
    setConfig(next.converter);
  };

  const handleMaxSize = (val: number | null) => {
    const next = patchZenStudioSettings({ converter: { ...config, maxImageOutputSize: val } });
    setConfig(next.converter);
    setCustomSizeInput('');
  };

  const handleCustomSize = () => {
    const val = parseInt(customSizeInput, 10);
    if (!isNaN(val) && val >= 100 && val <= 16000) {
      handleMaxSize(val);
    }
  };

  const isWeb = !isTauri();
  const opfsAvailable = isWeb && canUseOpfs();
  const opfsEnabled = isWeb && config.useOpfsInWeb;
  const canPick = isTauri() || (!opfsEnabled && canUseDirectoryPicker());
  const imagesFolderName = config.imagesFolderName;
  const archiveFolderName = config.archiveFolderName;

  return (
    <div style={{ padding: '28px 28px 40px', maxWidth: 560 }}>
      <div style={{ ...mono, fontSize: 13, fontWeight: 600, color: '#2a2010', marginBottom: 4 }}>
        Zen Converter Studio
      </div>
      <div style={{ ...mono, fontSize: 10, color: '#8a7a60', marginBottom: 24 }}>
        Zielordner für automatisch gespeicherte Konvertierungen
      </div>

      {isWeb && opfsEnabled && (
        <div style={{ ...card, background: 'rgba(120,140,120,0.1)', border: '1px solid rgba(120,140,120,0.35)', marginBottom: 16 }}>
          <div style={{ ...mono, fontSize: 10, color: '#5a6a5a', lineHeight: 1.6 }}>
            Browser-Speicher (OPFS) ist aktiv.<br />
            Auto-Save speichert in den internen Browser-Speicher, nicht in Finder-Ordner.
          </div>
        </div>
      )}

      {isWeb && !opfsEnabled && !canUseDirectoryPicker() && (
        <div style={{ ...card, background: 'rgba(180,140,80,0.1)', border: '1px solid rgba(172,142,102,0.4)', marginBottom: 16 }}>
          <div style={{ ...mono, fontSize: 10, color: '#7a5a20', lineHeight: 1.6 }}>
            Ordner-Picker in diesem Browser nicht verfügbar.<br />
            Chrome oder Edge wird benötigt.
          </div>
        </div>
      )}

      {isWeb && (
        <div style={card}>
          <p style={sectionLabel}>Browser-Speicher (OPFS)</p>
          <div style={{ ...mono, fontSize: 10, color: '#6a5a40', marginBottom: 10 }}>
            Speichert Auto-Save in den internen Browser-Speicher (kein echter Ordner).
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => handleOpfsToggle(!config.useOpfsInWeb)}
              disabled={!opfsAvailable}
              style={{
                ...btnBase,
                background: config.useOpfsInWeb ? '#AC8E66' : 'rgba(172,142,102,0.12)',
                border: config.useOpfsInWeb ? '1px solid rgba(172,142,102,0.7)' : '1px solid rgba(172,142,102,0.3)',
                color: config.useOpfsInWeb ? '#fff' : '#7a6a50',
                minWidth: 120,
                justifyContent: 'center',
                opacity: opfsAvailable ? 1 : 0.5,
                cursor: opfsAvailable ? 'pointer' : 'not-allowed',
              }}
            >
              {config.useOpfsInWeb ? 'Aktiv' : 'Inaktiv'}
            </button>
            <span style={{ ...mono, fontSize: 10, color: '#8a7a60' }}>
              {opfsAvailable ? 'Empfohlen für Web-Auto-Save' : 'Nicht verfügbar in diesem Browser'}
            </span>
          </div>
        </div>
      )}

      {/* ─── Bilder-Ordner ─── */}
      <div style={card}>
        <p style={sectionLabel}>
          <FontAwesomeIcon icon={faImage} style={{ marginRight: 6 }} />
          Bilder-Ordner
        </p>
        <div style={{ ...mono, fontSize: 10, color: '#6a5a40', marginBottom: 10 }}>
          PNG, JPG, WEBP, SVG werden hier automatisch abgelegt.
        </div>
        <FolderRow
          name={imagesFolderName}
          isLoading={picking === 'images'}
          canPick={canPick}
          onPick={() => void handlePick('images')}
          onClear={() => void handleClear('images')}
        />
      </div>

      {/* ─── Ablage-Ordner ─── */}
      <div style={card}>
        <p style={sectionLabel}>
          <FontAwesomeIcon icon={faFile} style={{ marginRight: 6 }} />
          Ablage-Ordner
        </p>
        <div style={{ ...mono, fontSize: 10, color: '#6a5a40', marginBottom: 10 }}>
          MD, DOCX, HTML, JSON, TXT — alle Text-Konvertierungen.
        </div>
        <FolderRow
          name={archiveFolderName}
          isLoading={picking === 'archive'}
          canPick={canPick}
          onPick={() => void handlePick('archive')}
          onClear={() => void handleClear('archive')}
        />
      </div>

      {/* ─── Auto-Save ─── */}
      <div style={card}>
        <p style={sectionLabel}>Auto-Save</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={() => handleAutoSave(!config.autoSave)}
            style={{
              ...btnBase,
              background: config.autoSave ? '#AC8E66' : 'rgba(172,142,102,0.12)',
              border: config.autoSave ? '1px solid rgba(172,142,102,0.7)' : '1px solid rgba(172,142,102,0.3)',
              color: config.autoSave ? '#fff' : '#7a6a50',
              minWidth: 80,
              justifyContent: 'center',
            }}
          >
            {config.autoSave ? 'An' : 'Aus'}
          </button>
          <span style={{ ...mono, fontSize: 10, color: '#8a7a60' }}>
            {config.autoSave
              ? 'Nach Konvertierung wird automatisch gespeichert'
              : 'Manueller Download-Klick nötig'}
          </span>
        </div>
      </div>

      {/* ─── Max. Bildgröße ─── */}
      <div style={card}>
        <p style={sectionLabel}>Max. Ausgabegröße (Bilder)</p>
        <div style={{ ...mono, fontSize: 10, color: '#6a5a40', marginBottom: 10 }}>
          Längste Seite wird auf diesen Wert skaliert. Gilt für PNG, JPG, WEBP.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {SIZE_PRESETS.map((opt) => {
            const isActive = config.maxImageOutputSize === opt.value && !customSizeInput;
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => handleMaxSize(opt.value)}
                style={{
                  ...btnBase,
                  background: isActive ? '#AC8E66' : 'rgba(255,255,255,0.5)',
                  border: isActive ? '1px solid rgba(172,142,102,0.7)' : '1px solid rgba(90,80,60,0.3)',
                  color: isActive ? '#fff' : '#5a5040',
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            ref={customSizeRef}
            type="number"
            min={100}
            max={16000}
            placeholder="Eigener Wert px"
            value={customSizeInput}
            onChange={(e) => setCustomSizeInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCustomSize(); }}
            style={{
              ...mono, fontSize: 10, width: 130,
              padding: '6px 10px', borderRadius: 6,
              border: '1px solid rgba(90,80,60,0.35)',
              background: 'rgba(255,255,255,0.6)',
              color: '#3a2a10', outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={handleCustomSize}
            disabled={!customSizeInput}
            style={{
              ...btnBase,
              background: customSizeInput ? '#AC8E66' : 'rgba(172,142,102,0.12)',
              border: '1px solid rgba(172,142,102,0.5)',
              color: customSizeInput ? '#fff' : '#9a8870',
              cursor: customSizeInput ? 'pointer' : 'not-allowed',
            }}
          >
            Setzen
          </button>
          {config.maxImageOutputSize && !SIZE_PRESETS.find(p => p.value === config.maxImageOutputSize) && (
            <span style={{ ...mono, fontSize: 10, color: '#AC8E66' }}>
              Aktiv: {config.maxImageOutputSize} px
            </span>
          )}
        </div>
      </div>

      {/* ─── Status ─── */}
      {msg && (
        <div style={{
          ...mono, fontSize: 10, color: '#5a4020',
          background: 'rgba(172,142,102,0.15)',
          border: '1px solid rgba(172,142,102,0.4)',
          borderRadius: 6, padding: '8px 12px', marginTop: 4,
        }}>
          {msg}
        </div>
      )}
    </div>
  );
};

// ─── FolderRow ────────────────────────────────────────────────────────────────

interface FolderRowProps {
  name: string | null;
  isLoading: boolean;
  canPick: boolean;
  onPick: () => void;
  onClear: () => void;
}

const FolderRow = ({ name, isLoading, canPick, onPick, onClear }: FolderRowProps) => {
  const mono: React.CSSProperties = { fontFamily: 'IBM Plex Mono, monospace' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        disabled={!canPick || isLoading}
        onClick={onPick}
        style={{
          ...mono, fontSize: 10, borderRadius: 6, cursor: canPick ? 'pointer' : 'not-allowed',
          padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 6,
          background: name ? 'rgba(172,142,102,0.15)' : '#AC8E66',
          border: name ? '1px solid rgba(172,142,102,0.4)' : '1px solid rgba(172,142,102,0.7)',
          color: name ? '#7a5a20' : '#fff',
          opacity: canPick ? 1 : 0.5,
          minWidth: 120,
          transition: 'all 0.15s',
        }}
      >
        <FontAwesomeIcon icon={name ? faFolderOpen : faFolder} />
        {isLoading ? 'Wählen…' : name ? name : 'Ordner wählen'}
      </button>
      {name && (
        <button
          type="button"
          onClick={onClear}
          style={{
            ...mono, fontSize: 10, borderRadius: 6, cursor: 'pointer',
            padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(180,80,80,0.08)',
            border: '1px solid rgba(180,80,80,0.35)',
            color: '#9a4040',
            transition: 'all 0.15s',
          }}
        >
          <FontAwesomeIcon icon={faXmark} />
          Entfernen
        </button>
      )}
    </div>
  );
};
