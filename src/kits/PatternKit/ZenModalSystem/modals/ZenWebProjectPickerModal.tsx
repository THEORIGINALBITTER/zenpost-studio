import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloud, faFolder, faFolderOpen, faGlobe, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { ZenModal } from '../components/ZenModal';
import {
  canUseDirectoryPicker,
  createVirtualProject,
  openDirectoryProject,
  type WebProject,
} from '../../../../services/webProjectService';
import { createCloudProject, seedCloudProject, type CloudProject } from '../../../../services/cloudProjectService';
import { loadZenStudioSettings, patchZenStudioSettings } from '../../../../services/zenStudioSettingsService';

const mono = 'IBM Plex Mono, monospace';
const gold = '#AC8E66';

export interface WebPickerInitialDoc {
  name: string;
  content: string;
  modifiedAt: number;
}

interface ZenWebProjectPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (project: WebProject, initialDocs?: WebPickerInitialDoc[]) => void;
  onCloudSelected?: (project: CloudProject) => void;
}

export function ZenWebProjectPickerModal({
  isOpen,
  onClose,
  onCreated,
  onCloudSelected,
}: ZenWebProjectPickerModalProps) {
  const [virtualName, setVirtualName] = useState('');
  const [showVirtualInput, setShowVirtualInput] = useState(false);
  const [showCloudInput, setShowCloudInput] = useState(false);
  const [cloudName, setCloudName] = useState('');
  const [loading, setLoading] = useState(false);
  const [folderLoading, setFolderLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [cloudEnabled, setCloudEnabled] = useState(false);

  const hasDirPicker = canUseDirectoryPicker();

  useEffect(() => {
    if (!isOpen) return;
    const settings = loadZenStudioSettings();
    setCloudEnabled(!!settings.cloudAuthToken);
  }, [isOpen]);

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

  async function handleFolderInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setFolderLoading(true);
    setError(null);
    try {
      const allowed = new Set(['md', 'txt', 'markdown', 'mdx']);
      const folderName = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath?.split('/')?.[0] || 'Browser-Ordner';
      const docs: WebPickerInitialDoc[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        if (!allowed.has(ext)) continue;
        try {
          const content = await file.text();
          docs.push({ name: file.name, content, modifiedAt: file.lastModified });
        } catch { /* skip unreadable */ }
      }
      const project = createVirtualProject(folderName);
      onCreated(project, docs);
      onClose();
    } catch {
      setError('Ordner konnte nicht geladen werden.');
    } finally {
      setFolderLoading(false);
      if (folderInputRef.current) folderInputRef.current.value = '';
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
    setShowCloudInput(false);
    setCloudName('');
    setError(null);
    onClose();
  }

  async function handleCloudSeed() {
    setLoading(true);
    setError(null);
    try {
      const project = await seedCloudProject();
      if (!project) {
        setError('Cloud-Projekt konnte nicht geladen werden.');
        return;
      }
      patchZenStudioSettings({ cloudProjectId: project.id, cloudProjectName: project.name });
      onCloudSelected?.(project);
      onClose();
    } catch {
      setError('Cloud-Projekt konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCloudCreate() {
    const trimmed = cloudName.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const project = await createCloudProject(trimmed);
      if (!project) {
        setError('Cloud-Projekt konnte nicht erstellt werden.');
        return;
      }
      patchZenStudioSettings({ cloudProjectId: project.id, cloudProjectName: project.name });
      onCloudSelected?.(project);
      onClose();
    } catch {
      setError('Cloud-Projekt konnte nicht erstellt werden.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ZenModal
      isOpen={isOpen}
      onClose={handleClose}
      size="sm"
      theme="paper"
      title="Neues Projekt"
      subtitle={
        <span style={{ fontFamily: mono, fontSize: 10, color: cloudEnabled ? '#4caf50' : `${gold}99` }}>
          {cloudEnabled ? 'Cloud verfügbar · eingeloggt' : 'Nicht eingeloggt · Daten nur im Browser'}
        </span>
      }
    >
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* ── Hinweis wenn nicht eingeloggt ── */}
        {!cloudEnabled && (
          <div style={{
            padding: '8px 12px', borderRadius: 6,
            background: 'rgba(172,142,102,0.08)',
            border: '1px solid rgba(172,142,102,0.25)',
            fontFamily: mono, fontSize: 9, color: '#8a7060', lineHeight: 1.6,
          }}>
            Nicht eingeloggt — Daten werden nur im Browser gespeichert.<br />
            In ZenCloud anmelden, um Cloud-Projekte zu nutzen.
          </div>
        )}

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

        {/* ── Browser-Ordner via webkitdirectory (Safari / Firefox / alle Browser) ── */}
        {!hasDirPicker && (
          <button
            type="button"
            disabled={folderLoading}
            onClick={() => folderInputRef.current?.click()}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px', borderRadius: 8,
              cursor: folderLoading ? 'default' : 'pointer',
              border: `1px solid rgba(172,142,102,0.45)`,
              background: 'rgba(172,142,102,0.07)',
              textAlign: 'left', opacity: folderLoading ? 0.75 : 1,
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { if (!folderLoading) e.currentTarget.style.background = 'rgba(172,142,102,0.13)'; }}
            onMouseLeave={(e) => { if (!folderLoading) e.currentTarget.style.background = 'rgba(172,142,102,0.07)'; }}
          >
            <FontAwesomeIcon
              icon={folderLoading ? faSpinner : faFolderOpen}
              spin={folderLoading}
              style={{ color: gold, fontSize: 20, flexShrink: 0 }}
            />
            <div>
              <div style={{ fontFamily: mono, fontSize: 11, color: '#222', fontWeight: 600, marginBottom: 3 }}>
                {folderLoading ? 'Ordner wird geladen …' : 'Browser-Ordner öffnen'}
              </div>
              <div style={{ fontFamily: mono, fontSize: 9, color: '#777', lineHeight: 1.6 }}>
                Ordner aus dem Finder wählen.<br />
                Markdown-Dateien werden direkt eingelesen.
              </div>
            </div>
          </button>
        )}
        <input
          type="file"
          multiple
          style={{ display: 'none' }}
          ref={(el) => {
            folderInputRef.current = el;
            if (el) {
              el.setAttribute('webkitdirectory', '');
              el.setAttribute('directory', '');
            }
          }}
          onChange={handleFolderInput}
        />

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

        {/* ── Cloud Projekt ── */}
        {!showCloudInput ? (
          <button
            type="button"
            onClick={() => cloudEnabled ? setShowCloudInput(true) : setError('Bitte zuerst in der ZenCloud einloggen.')}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 16px', borderRadius: 8, cursor: 'pointer',
              border: '1px solid rgba(172,142,102,0.25)',
              background: 'transparent', textAlign: 'left',
              transition: 'background 0.15s',
              opacity: cloudEnabled ? 1 : 0.6,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(172,142,102,0.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <FontAwesomeIcon icon={faCloud} style={{ color: '#999', fontSize: 20, flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: mono, fontSize: 11, color: '#444', fontWeight: 600, marginBottom: 3 }}>
                Cloud Projekt
              </div>
              <div style={{ fontFamily: mono, fontSize: 9, color: '#888', lineHeight: 1.6 }}>
                Server-Projekt mit Upload & Sync.
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
              Projektname (Cloud)
            </label>
            <input
              autoFocus
              type="text"
              value={cloudName}
              onChange={(e) => setCloudName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCloudCreate()}
              placeholder="Mein Cloud Projekt"
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
                onClick={() => { setShowCloudInput(false); setCloudName(''); }}
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
                onClick={handleCloudSeed}
                style={{
                  fontFamily: mono, fontSize: 9, padding: '5px 12px',
                  border: '1px solid rgba(172,142,102,0.45)', borderRadius: 5,
                  background: '#d0cbb8', cursor: 'pointer', color: '#1a1a1a',
                }}
              >
                Erstes Projekt
              </button>
              <button
                type="button"
                onClick={handleCloudCreate}
                disabled={!cloudName.trim()}
                style={{
                  fontFamily: mono, fontSize: 9, padding: '5px 12px',
                  border: '1px solid rgba(172,142,102,0.45)', borderRadius: 5,
                  background: '#d0cbb8', cursor: cloudName.trim() ? 'pointer' : 'not-allowed', color: '#1a1a1a',
                  opacity: cloudName.trim() ? 1 : 0.5,
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
