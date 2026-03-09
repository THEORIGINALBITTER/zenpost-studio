import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolder, faGlobe, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { ZenModal } from '../components/ZenModal';
import {
  canUseDirectoryPicker,
  createVirtualProject,
  openDirectoryProject,
  type WebProject,
} from '../../../../services/webProjectService';

const mono = 'IBM Plex Mono, monospace';
const gold = '#AC8E66';

interface ZenWebProjectPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (project: WebProject) => void;
}

export function ZenWebProjectPickerModal({
  isOpen,
  onClose,
  onCreated,
}: ZenWebProjectPickerModalProps) {
  const [virtualName, setVirtualName] = useState('');
  const [showVirtualInput, setShowVirtualInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasDirPicker = canUseDirectoryPicker();

  async function handleOpenFolder() {
    setLoading(true);
    setError(null);
    try {
      const project = await openDirectoryProject();
      if (project) {
        onCreated(project);
        onClose();
      }
    } catch {
      setError('Ordner konnte nicht geöffnet werden.');
    } finally {
      setLoading(false);
    }
  }

  function handleCreateVirtual() {
    const trimmed = virtualName.trim();
    if (!trimmed) return;
    const project = createVirtualProject(trimmed);
    onCreated(project);
    onClose();
    setVirtualName('');
    setShowVirtualInput(false);
  }

  function handleClose() {
    setVirtualName('');
    setShowVirtualInput(false);
    setError(null);
    onClose();
  }

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={handleClose}
      size="sm"
      theme="paper"
      title="Neues Projekt"
      subtitle={
        <span style={{ fontFamily: mono, fontSize: 10, color: `${gold}99` }}>
          Web-Version
        </span>
      }
    >
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* ── Ordner öffnen ── */}
        {hasDirPicker && (
          <button
            type="button"
            disabled={loading}
            onClick={handleOpenFolder}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px', borderRadius: 8,
              cursor: loading ? 'default' : 'pointer',
              border: `1px solid rgba(172,142,102,0.45)`,
              background: 'rgba(172,142,102,0.07)',
              textAlign: 'left', opacity: loading ? 0.75 : 1,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'rgba(172,142,102,0.13)'; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = 'rgba(172,142,102,0.07)'; }}
          >
            <FontAwesomeIcon
              icon={loading ? faSpinner : faFolder}
              spin={loading}
              style={{ color: gold, fontSize: 20, flexShrink: 0 }}
            />
            <div>
              <div style={{ fontFamily: mono, fontSize: 11, color: '#222', fontWeight: 600, marginBottom: 3 }}>
                {loading ? 'Ordner wird geöffnet …' : 'Ordner öffnen'}
              </div>
              <div style={{ fontFamily: mono, fontSize: 9, color: '#777', lineHeight: 1.6 }}>
                Echten Ordner vom Dateisystem wählen.<br />
                Markdown-Dateien werden direkt gelesen.
              </div>
            </div>
          </button>
        )}

        {/* ── Virtuelles Projekt ── */}
        {!showVirtualInput ? (
          <button
            type="button"
            onClick={() => setShowVirtualInput(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px', borderRadius: 8, cursor: 'pointer',
              border: '1px solid rgba(172,142,102,0.25)',
              background: 'transparent', textAlign: 'left',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(172,142,102,0.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <FontAwesomeIcon icon={faGlobe} style={{ color: '#999', fontSize: 20, flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: mono, fontSize: 11, color: '#444', fontWeight: 600, marginBottom: 3 }}>
                Virtuelles Projekt
              </div>
              <div style={{ fontFamily: mono, fontSize: 9, color: '#888', lineHeight: 1.6 }}>
                Projekt ohne Ordner — Dokumente<br />
                per Drag & Drop oder Upload hinzufügen.
              </div>
            </div>
          </button>
        ) : (
          <div style={{
            padding: '14px 16px', borderRadius: 8,
            border: `1px solid rgba(172,142,102,0.4)`,
            background: 'rgba(172,142,102,0.06)',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <label style={{ fontFamily: mono, fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>
              Projektname
            </label>
            <input
              autoFocus
              type="text"
              value={virtualName}
              onChange={(e) => setVirtualName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateVirtual()}
              placeholder="Mein Blog 2026"
              style={{
                fontFamily: mono, fontSize: 11, padding: '8px 12px',
                border: '1px solid rgba(172,142,102,0.4)', borderRadius: 6,
                background: 'rgba(255,255,255,0.6)', color: '#222',
                outline: 'none', width: '100%', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => { setShowVirtualInput(false); setVirtualName(''); }}
                style={{
                  fontFamily: mono, fontSize: 9, padding: '5px 12px',
                  border: '1px solid rgba(172,142,102,0.3)', borderRadius: 5,
                  background: 'transparent', cursor: 'pointer', color: '#888',
                }}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleCreateVirtual}
                disabled={!virtualName.trim()}
                style={{
                  fontFamily: mono, fontSize: 9, padding: '5px 14px',
                  border: `1px solid ${gold}`, borderRadius: 5,
                  background: `rgba(172,142,102,0.12)`,
                  cursor: virtualName.trim() ? 'pointer' : 'not-allowed',
                  color: gold, opacity: virtualName.trim() ? 1 : 0.45,
                }}
              >
                Erstellen
              </button>
            </div>
          </div>
        )}

        {/* ── Browser hint ── */}
        {!hasDirPicker && (
          <p style={{ fontFamily: mono, fontSize: 9, color: '#aaa', margin: 0, lineHeight: 1.7 }}>
            Dein Browser unterstützt keinen Ordner-Picker.<br />
            Bitte Chrome oder Edge für diese Funktion verwenden.
          </p>
        )}

        {error && (
          <p style={{ fontFamily: mono, fontSize: 9, color: '#e05c5c', margin: 0 }}>{error}</p>
        )}
      </div>
    </ZenModal>
  );
}
