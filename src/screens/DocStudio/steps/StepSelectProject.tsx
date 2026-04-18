import { useRef, useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBookOpen,
  faChartSimple,
  faDesktop,
  faFilePen,
  faFolderOpen,
  faGlobe,
  faMagnifyingGlass,
  faPlus,
  faCloudArrowUp,
  faLinkSlash,
} from '@fortawesome/free-solid-svg-icons';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import type { DocStudioRuntime } from '../types';
import { GitHubDocsWizard } from '../components/GitHubDocsWizard';
import { DocsSiteWizard } from '../components/DocsSiteWizard';
import { DocsServerWizard, loadDocsServerConfig, loadDocsSyncTimestamp, type DocsServerConfig } from '../components/DocsServerWizard';
import type { DocsPushSummary, GeneratedTemplate } from '../../../services/githubDocsService';
import type { DocsSiteConfig } from '../../../services/docsSiteService';

export function StepSelectProject({
  runtime,
  projectPath,
  recentProjectPaths = [],
  recentDocuments = [],
  hasExistingAnalysis,
  onSelect,
  onRescan,
  onContinueToEditor,
  onOpenDashboard,
  onEditInputFields,
  onOpenRecentDocument,
  onRemoveProject,
  onPushDocsToGitHub,
  githubDocsFileCount,
  onWebFolderPick,
  onOpenGitHubSettings,
  generatedTemplates = [],
  onPushTemplates,
  docFiles = [],
  onSaveDocsSiteLocally,
  onPushDocsSiteToGitHub,
  initialWizard,
}: {
  runtime: DocStudioRuntime;
  projectPath: string | null;
  recentProjectPaths?: string[];
  recentDocuments?: Array<{ path: string; name: string; modifiedAt?: number; projectPath: string }>;
  hasExistingAnalysis?: boolean;
  onSelect: (path: string) => void;
  onRescan?: () => void;
  onContinueToEditor?: () => void;
  onOpenDashboard?: () => void;
  onEditInputFields?: () => void;
  onWebFolderPick?: () => void;
  onOpenRecentDocument?: (path: string) => void;
  onRemoveProject?: (path: string) => void;
  onPushDocsToGitHub?: () => Promise<DocsPushSummary>;
  githubDocsFileCount?: number;
  onOpenGitHubSettings?: () => void;
  generatedTemplates?: GeneratedTemplate[];
  onPushTemplates?: (templates: GeneratedTemplate[]) => Promise<DocsPushSummary>;
  docFiles?: Array<{ name: string; path: string }>;
  onSaveDocsSiteLocally?: (config: DocsSiteConfig) => Promise<void>;
  onPushDocsSiteToGitHub?: (config: DocsSiteConfig) => Promise<DocsPushSummary>;
  initialWizard?: 'github' | 'docs-site';
}) {
  const visibleRecentProjects = recentProjectPaths.slice(0, 6);

  // Stable tab order: freeze on first render, only add new paths at the end
  const stableOrderRef = useRef<string[]>([]);
  const seen = new Set(stableOrderRef.current);
  const newPaths = visibleRecentProjects.filter((p) => !seen.has(p));
  if (newPaths.length > 0) {
    stableOrderRef.current = [...stableOrderRef.current, ...newPaths];
  }
  stableOrderRef.current = stableOrderRef.current.filter((p) => visibleRecentProjects.includes(p));
  const allProjects = stableOrderRef.current;

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [cardHovered, setCardHovered] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [cardTab, setCardTab] = useState<'local' | 'server'>('local');
  const [serverDocs, setServerDocs] = useState<Array<{ slug: string; title: string; date?: string }>>([]);
  const [serverDocsLoading, setServerDocsLoading] = useState(false);
  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const [inlinePathInput, setInlinePathInput] = useState('');
  const [showGitHubWizard, setShowGitHubWizard] = useState(() => initialWizard === 'github');
  const [showDocsSiteWizard, setShowDocsSiteWizard] = useState(() => initialWizard === 'docs-site');
  const [showDocsServerWizard, setShowDocsServerWizard] = useState(false);
  const activeProjectPath = selectedPath ?? projectPath ?? allProjects[0] ?? null;

  const [docsServerConfig, setDocsServerConfig] = useState<DocsServerConfig | null>(
    activeProjectPath ? loadDocsServerConfig(activeProjectPath) : null,
  );
  const desktopDisabled = runtime === 'web';

  // Load manifest.json when Server tab is selected
  useEffect(() => {
    if (cardTab !== 'server' || !activeProjectPath) { setServerDocs([]); return; }
    setServerDocsLoading(true);
    import('@tauri-apps/plugin-fs').then(async ({ readTextFile, exists }) => {
      try {
        const { join } = await import('@tauri-apps/api/path');
        const manifestPath = await join(activeProjectPath, 'manifest.json');
        if (!(await exists(manifestPath))) { setServerDocs([]); return; }
        const raw = JSON.parse(await readTextFile(manifestPath));
        const posts = Array.isArray(raw?.posts) ? raw.posts : [];
        setServerDocs(posts.map((p: Record<string, unknown>) => ({
          slug: String(p.slug ?? ''),
          title: String(p.title ?? p.slug ?? ''),
          date: p.date ? String(p.date) : undefined,
        })));
      } catch { setServerDocs([]); }
      finally { setServerDocsLoading(false); }
    });
  }, [cardTab, activeProjectPath]);
  const isWebFolderPath = (p: string | null) => p?.startsWith('@web-folder:') ?? false;
  const activeProjectName = activeProjectPath
    ? isWebFolderPath(activeProjectPath)
      ? activeProjectPath.replace('@web-folder:', '')
      : activeProjectPath.split(/[\\/]/).filter(Boolean).pop() || 'Projekt'
    : 'Projekt';

  const openNativeFolderPicker = async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({ directory: true, multiple: false, title: 'Projektordner wählen' });
      if (selected && typeof selected === 'string') {
        onSelect(selected);
        setShowInlineAdd(false);
        setInlinePathInput('');
      }
    } catch {
      // picker failed — stay on inline card, user can type manually
    }
  };

  const ensureProjectSelected = () => {
    const targetPath = projectPath ?? activeProjectPath;
    if (targetPath && targetPath !== projectPath) {
      onSelect(targetPath);
    }
    return targetPath;
  };
  const formatDate = (value?: number) =>
    value ? new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

  return (
    <div className="flex items-center bg-[#1a1a1a] justify-center mt-[50px] mb-[24px] px-[12px]">
      <div
        style={{
          width: '100%',
          maxWidth: '1020px',
          borderRadius: '14px',
          border: '0.5px solid #2F2F2F',
          background: 'transparent',
          padding: 'clamp(18px, 4vw, 40px)',
          textAlign: 'left',
        }}
      >
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <FontAwesomeIcon icon={faFolderOpen} style={{ fontSize: '24px', color: '#AC8E66' }} />
          <h2
            style={{
              fontSize: '18px',
            
              color: '#AC8E66',
              margin: 0,
              fontFamily: 'IBM Plex Mono, monospace',
              letterSpacing: '0.3px',
            }}
          >
            Doc Studio starten
          </h2>
        </div>
        <p
          style={{
            color: '#b0ac9b',
            marginBottom: '24px',
            maxWidth: '760px',
            fontSize: '11px',
            fontFamily: 'monospace',
         
          }}
        >
          Öffne ein bestehendes Projekt oder wähle einen neuen Ordner, um Analyse und Dokumentation fortzusetzen.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '18px',
            marginBottom: '20px',
            alignItems: 'start',
          }}
        >
          {/* Left: Tab-reiter card + action buttons */}
          <div style={{ display: 'flex', alignItems: 'stretch', position: 'relative' }}>

            {/* Left side: vertical tab-reiters */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                paddingTop: '12px',
                marginRight: '-1px',
                position: 'relative',
                zIndex: 5,
              }}
            >
              {allProjects.map((path) => {
                const tabName = path.split(/[\\/]/).filter(Boolean).pop() || path;
                const tabLabel = tabName.length > 6 ? tabName.slice(0, 5) + '…' : tabName;
                const isActive = path === activeProjectPath;
                const isHovered = hoveredTab === path;
                return (
                  <button
                    key={path}
                    onClick={() => {
                      setSelectedPath(path);
                      onSelect(path);
                    }}
                    title={path}
                    onMouseEnter={() => setHoveredTab(path)}
                    onMouseLeave={() => setHoveredTab(null)}
                    style={{
                      width: '36px',
                      height: '80px',
                      borderRadius: '10px 0 0 10px',
                      borderTop: isActive ? '1px solid #b8b0a0' : '0.5px solid #3A3A3A',
                      borderBottom: isActive ? '1px solid #b8b0a0' : '0.5px solid #3A3A3A',
                      borderLeft: isActive ? '1px solid #b8b0a0' : '0.5px solid #3A3A3A',
                      borderRight: 'none',
                      background: isActive ? '#d0cbb8' : isHovered ? '#2a2a2a' : '#1a1a1a',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      transition: 'background 0.2s',
                      position: 'relative',
                      zIndex: isActive ? 20 : 10,
                      overflow: 'hidden',
                    }}
                  >
                    {isHovered && onRemoveProject && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveProject(path);
                          if (selectedPath === path) setSelectedPath(null);
                        }}
                        title="Projekt entfernen"
                        style={{
                          position: 'absolute',
                          top: '4px',
                          fontSize: '11px',
                          lineHeight: 1,
                          color: isActive ? '#5a4a30' : '#AC8E66',
                          cursor: 'pointer',
                          zIndex: 30,
                        }}
                      >
                        ×
                      </span>
                    )}
                    <span
                      style={{
                        writingMode: 'vertical-rl',
                        textOrientation: 'mixed',
                        transform: 'rotate(180deg)',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '9px',
                        color: isActive ? '#1a1a1a' : '#8E8E8E',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        maxHeight: '70px',
                        letterSpacing: '0.3px',
                        marginTop: isHovered ? '10px' : '0',
                        transition: 'margin-top 0.15s',
                      }}
                    >
                      {tabLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active card (beige) with hover overlay */}
            {showInlineAdd ? (
              <div style={{ position: 'relative', width: '280px', minHeight: '320px', zIndex: 15 }}>
                <div
                  style={{
                    width: '100%',
                    minHeight: '320px',
                    borderRadius: '0 12px 12px 0',
                    padding: '18px',
                    textAlign: 'left',
                    borderTop: '1px solid #b8b0a0',
                    borderRight: '1px solid #b8b0a0',
                    borderBottom: '1px solid #b8b0a0',
                    borderLeft: 'none',
                    background: '#d0cbb8',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxShadow: '4px 4px 20px rgba(0,0,0,0.25)',
                  }}
                >
                  <div>
                    <p style={{ fontSize: '9px', color: '#7a7060', fontFamily: 'IBM Plex Mono, monospace', margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Neues Projekt
                    </p>
                    <p style={{ fontSize: '12px', color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', margin: 0, fontWeight: 500 }}>
                      Pfad eingeben
                    </p>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(172,142,102,0.3)', paddingTop: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {runtime === 'web' ? (
                      <>
                        <button
                          onClick={() => { onWebFolderPick?.(); setShowInlineAdd(false); }}
                          style={{
                            padding: '9px 12px',
                            borderRadius: '6px',
                            border: '1px solid rgba(172,142,102,0.6)',
                            background: '#AC8E66',
                            color: '#fff',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <FontAwesomeIcon icon={faGlobe} style={{ fontSize: '11px' }} />
                          Browser-Ordner öffnen
                        </button>
                        {onContinueToEditor && (
                          <button
                            onClick={() => { onContinueToEditor?.(); setShowInlineAdd(false); }}
                            style={{
                              padding: '9px 12px',
                              borderRadius: '6px',
                              border: '1px solid rgba(90,80,64,0.3)',
                              background: 'transparent',
                              color: '#5a5040',
                              fontFamily: 'IBM Plex Mono, monospace',
                              fontSize: '10px',
                              cursor: 'pointer',
                              textAlign: 'center' as const,
                            }}
                          >
                            Ohne Ordner fortfahren
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          onClick={openNativeFolderPicker}
                          style={{
                            padding: '9px 12px',
                            borderRadius: '6px',
                            border: '1px solid rgba(172,142,102,0.6)',
                            background: '#AC8E66',
                            color: '#fff',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <FontAwesomeIcon icon={faFolderOpen} style={{ fontSize: '11px' }} />
                          Finder öffnen
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '2px 0' }}>
                          <div style={{ flex: 1, height: '1px', background: 'rgba(172,142,102,0.2)' }} />
                          <span style={{ fontSize: '9px', color: '#9a9080', fontFamily: 'IBM Plex Mono, monospace' }}>oder manuell</span>
                          <div style={{ flex: 1, height: '1px', background: 'rgba(172,142,102,0.2)' }} />
                        </div>
                    <input
                      type="text"
                      placeholder="/Users/dein/projekt"
                      value={inlinePathInput}
                      onChange={(e) => setInlinePathInput(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && inlinePathInput.trim()) {
                          onSelect(inlinePathInput.trim());
                          setShowInlineAdd(false);
                          setInlinePathInput('');
                        }
                        if (e.key === 'Escape') {
                          setShowInlineAdd(false);
                          setInlinePathInput('');
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(172,142,102,0.5)',
                        background: 'rgba(255,255,255,0.55)',
                        color: '#1a1a1a',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '11px',
                        outline: 'none',
                        boxSizing: 'border-box' as const,
                      }}
                    />
                    <button
                      onClick={() => {
                        if (!inlinePathInput.trim()) return;
                        onSelect(inlinePathInput.trim());
                        setShowInlineAdd(false);
                        setInlinePathInput('');
                      }}
                      style={{
                        padding: '9px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(172,142,102,0.6)',
                        background: '#AC8E66',
                        color: '#fff',
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '11px',
                        cursor: inlinePathInput.trim() ? 'pointer' : 'not-allowed',
                        opacity: inlinePathInput.trim() ? 1 : 0.6,
                        textAlign: 'center' as const,
                      }}
                    >
                      Übernehmen →
                    </button>
                    {onContinueToEditor && (
                      <button
                        onClick={() => {
                          onContinueToEditor?.();
                          setShowInlineAdd(false);
                        }}
                        style={{
                          padding: '9px 12px',
                          borderRadius: '6px',
                          border: '1px solid rgba(90,80,64,0.3)',
                          background: 'transparent',
                          color: '#5a5040',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '10px',
                          cursor: 'pointer',
                          textAlign: 'center' as const,
                        }}
                      >
                        Ohne Ordner fortfahren
                      </button>
                    )}
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => { setShowInlineAdd(false); setInlinePathInput(''); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontSize: '9px',
                      color: '#AC8E66',
                      fontFamily: 'IBM Plex Mono, monospace',
                      cursor: 'pointer',
                      textAlign: 'right' as const,
                      opacity: 0.7,
                    }}
                  >
                    ← abbrechen
                  </button>
                </div>
              </div>
            ) : (() => {
              const projectDocs = recentDocuments.filter(
                (doc) => activeProjectPath && doc.projectPath === activeProjectPath,
              );
              const hasDocs = projectDocs.length > 0;
              return (
                <div
                  style={{ position: 'relative', width: '280px', minHeight: '320px', zIndex: 15 }}
                  onMouseEnter={() => setCardHovered(true)}
                  onMouseLeave={() => setCardHovered(false)}
                >
                  <button
                    onClick={() => { if (activeProjectPath) onSelect(activeProjectPath); }}
                    disabled={!activeProjectPath}
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      minHeight: '320px',
                      borderRadius: '0 12px 12px 0',
                      padding: '18px 18px',
                      textAlign: 'left',
                      borderTop: '1px solid #b8b0a0',
                      borderRight: '1px solid #b8b0a0',
                      borderBottom: '1px solid #b8b0a0',
                      borderLeft: 'none',
                      background: '#d0cbb8',
                      cursor: activeProjectPath ? 'pointer' : 'not-allowed',
                      opacity: activeProjectPath ? 1 : 0.6,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-start',
                      gap: '16px',
                      boxShadow: '4px 4px 20px rgba(0,0,0,0.25)',
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: '9px',
                          color: '#7a7060',
                          fontFamily: 'IBM Plex Mono, monospace',
                          margin: '0 0 2px 0',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                        }}
                      >
                        Aktuelles Projekt
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <FontAwesomeIcon icon={isWebFolderPath(activeProjectPath) ? faGlobe : faFolderOpen} style={{ color: '#AC8E66', fontSize: '16px' }} />
                        <span
                          style={{
                            fontSize: '15px',
                            color: '#1a1a1a',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontWeight: '500',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {activeProjectName}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        borderTop: '1px solid rgba(172, 142, 102, 0.3)',
                        paddingTop: '12px',
                        flex: 1,
                      }}
                    >
                      <p
                        style={{
                          fontSize: '10px',
                          color: '#5a5040',
                          fontFamily: 'IBM Plex Mono, monospace',
                          margin: 0,
                          lineHeight: 1.5,
                          wordBreak: 'break-all',
                        }}
                      >
                        {activeProjectPath || 'Noch kein Projekt ausgewählt'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {activeProjectPath && runtime !== 'web' ? (
                        <button
                          title="Im Finder öffnen"
                          onClick={(e) => { e.stopPropagation(); revealItemInDir(activeProjectPath); }}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '2px 4px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '8px',
                            color: '#AC8E66',
                            opacity: 0.7,
                            borderRadius: '4px',
                          }}
                          onMouseEnter={(e) => { e.stopPropagation(); e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(172,142,102,0.12)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.background = 'none'; }}
                        >
                          <FontAwesomeIcon icon={faFolderOpen} style={{ fontSize: '9px' }} />
                          Im Finder
                        </button>
                      ) : <span />}
                      <div style={{ fontSize: '9px', color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', opacity: 0.7 }}>
                        Klicken zum Öffnen →
                      </div>
                    </div>
                  </button>

                  {/* Tab panel: Lokal / Server */}
                  {cardHovered && (
                    <div
                      style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        borderRadius: '0 12px 12px 0',
                        background: 'linear-gradient(180deg, #EDE6D8 0%, #E7DFD0 100%)',
                        borderTop: '1px solid #b8b0a0', borderRight: '1px solid #b8b0a0',
                        borderBottom: '1px solid #b8b0a0', borderLeft: 'none',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 25,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Tab bar */}
                      <div style={{ display: 'flex', borderBottom: '1px solid rgba(172,142,102,0.3)', padding: '10px 14px 0' }}>
                        {(['local', 'server'] as const).map((tab) => {
                          const isServer = tab === 'server';
                          const label = isServer ? '● Server' : 'Lokal';
                          const hasServer = !!docsServerConfig;
                          if (isServer && !hasServer) return null;
                          return (
                            <button
                              key={tab}
                              onClick={() => setCardTab(tab)}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px',
                                padding: '4px 10px 6px',
                                marginRight: '4px',
                                color: cardTab === tab ? (isServer ? '#3a873d' : '#1a1a1a') : '#9a8a72',
                                borderBottom: cardTab === tab ? `2px solid ${isServer ? '#3a873d' : '#AC8E66'}` : '2px solid transparent',
                                fontWeight: cardTab === tab ? '600' : '400',
                              }}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {cardTab === 'local' ? (
                          hasDocs ? projectDocs.slice(0, 8).map((doc) => (
                            <div
                              key={doc.path}
                              onClick={() => onOpenRecentDocument?.(doc.path)}
                              style={{ borderRadius: '6px', border: '0.5px solid rgba(172,142,102,0.3)', background: 'rgba(255,255,255,0.4)', padding: '7px 10px', cursor: 'pointer' }}
                            >
                              <p style={{ margin: 0, fontSize: '10px', color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</p>
                              <p style={{ margin: '2px 0 0', fontSize: '8px', color: '#7a7060', fontFamily: 'IBM Plex Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.path.split('/').slice(-2).join('/')}</p>
                            </div>
                          )) : (
                            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#9a8a72' }}>Noch keine Dokumente</p>
                          )
                        ) : (
                          serverDocsLoading ? (
                            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#9a8a72' }}>Lade…</p>
                          ) : serverDocs.length === 0 ? (
                            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#9a8a72' }}>Kein manifest.json gefunden — noch nie synchronisiert.</p>
                          ) : serverDocs.map((doc) => (
                            <div
                              key={doc.slug}
                              style={{ borderRadius: '6px', border: '0.5px solid rgba(58,135,61,0.3)', background: 'rgba(58,135,61,0.06)', padding: '7px 10px' }}
                            >
                              <p style={{ margin: 0, fontSize: '10px', color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span style={{ color: '#3a873d', marginRight: '5px' }}>●</span>{doc.title}
                              </p>
                              {doc.date && <p style={{ margin: '2px 0 0', fontSize: '8px', color: '#7a7060', fontFamily: 'IBM Plex Mono, monospace' }}>{doc.date}</p>}
                            </div>
                          ))
                        )}
                      </div>

                      {/* Footer */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderTop: '1px solid rgba(172,142,102,0.2)' }}>
                        {activeProjectPath && runtime !== 'web' ? (
                          <button onClick={(e) => { e.stopPropagation(); revealItemInDir(activeProjectPath); }}
                            style={{ background: 'none', border: 'none', padding: '2px 4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px', color: '#AC8E66', opacity: 0.7, borderRadius: '4px' }}
                            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                          >
                            <FontAwesomeIcon icon={faFolderOpen} style={{ fontSize: '9px' }} /> Im Finder lokal
                          </button>
                        ) : <span />}
                        {cardTab === 'server' && docsServerConfig && (
                          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px', color: '#3a873d' }}>
                            ● {serverDocs.length} Server on
                          </span>
                        )}
                        {cardTab === 'local' && (
                          <div style={{ fontSize: '9px', color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', opacity: 0.7 }} onClick={() => activeProjectPath && onSelect(activeProjectPath)}>
                            Klicken zum Öffnen →
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* + Tab on the right side */}
            <button
              onClick={() => {
                if (showInlineAdd) {
                  setShowInlineAdd(false);
                  setInlinePathInput('');
                } else {
                  setShowInlineAdd(true);
                }
              }}
              style={{
                width: '36px',
                height: '40px',
                borderRadius: '0 10px 10px 0',
                borderTop: showInlineAdd ? '1px solid #AC8E66' : '1px dashed #AC8E66',
                borderRight: showInlineAdd ? '1px solid #AC8E66' : '1px dashed #AC8E66',
                borderBottom: showInlineAdd ? '1px solid #AC8E66' : '1px dashed #AC8E66',
                borderLeft: 'none',
                background: showInlineAdd ? 'rgba(172,142,102,0.15)' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                alignSelf: 'flex-start',
                marginLeft: '-1px',
                marginTop: '12px',
              }}
            >
              {showInlineAdd
                ? <span style={{ color: '#AC8E66', fontSize: '16px', lineHeight: 1 }}>×</span>
                : <FontAwesomeIcon icon={faPlus} style={{ color: '#AC8E66', fontSize: '12px' }} />
              }
            </button>
          </div>

          {/* Right: Action tiles or GitHub Wizard — always visible, locked when no project */}
          <>
            <div
              style={{
                display: (showGitHubWizard || showDocsSiteWizard || showDocsServerWizard) ? 'none' : 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '12px',
              }}
            >
              <div style={{ gridColumn: '1 / -1', height: '30px', visibility: 'hidden' }} aria-hidden="true">
                Projekt wählen
              </div>
              <ActionTile
                title="Projekt neu scannen"
                description="Scan aktualisieren und Projektstruktur neu einlesen"
                icon={faMagnifyingGlass}
                disabled={desktopDisabled}
                desktopOnly={desktopDisabled}
                locked={!activeProjectPath}
                onClick={() => {
                  const targetPath = ensureProjectSelected();
                  if (!targetPath && runtime !== 'web') return;
                  onRescan?.();
                }}
              />
              <ActionTile
                title="Einfach direkt starten"
                description={hasExistingAnalysis ? 'Direkt im Editor arbeiten' : 'Zum Editor wechseln und weiter schreiben'}
                icon={faFilePen}
                locked={!activeProjectPath}
                onClick={() => {
                  const targetPath = ensureProjectSelected();
                  if (!targetPath && runtime !== 'web') return;
                  onContinueToEditor?.();
                }}
              />
              <ActionTile
                title="Projekt Mappe öffnen"
                description="Zu Templates und Dokument-Dashboard wechseln"
                icon={faChartSimple}
                locked={!activeProjectPath}
                onClick={() => {
                  const targetPath = ensureProjectSelected();
                  if (!targetPath && runtime !== 'web') return;
                  onOpenDashboard?.();
                }}
              />
              <ActionTile
                title="Datenfelder ergänzen"
                description="Produktinfos, Setup und Metadaten im Dashboard pflegen"
                icon={faBookOpen}
                locked={!activeProjectPath}
                onClick={() => {
                  const targetPath = ensureProjectSelected();
                  if (!targetPath && runtime !== 'web') return;
                  onEditInputFields?.();
                }}
              />
              <ActionTile
                title="Docs → GitHub"
                description="Markdown-Dateien in ein GitHub Repository pushen"
                icon={faCloudArrowUp}
                locked={!activeProjectPath}
                onClick={() => {
                  if (!activeProjectPath) return;
                  ensureProjectSelected();
                  setShowGitHubWizard(true);
                }}
              />
              <ActionTile
                title="Docs-Website"
                description="Statische index.html für GitHub Pages generieren"
                icon={faGlobe}
                locked={!activeProjectPath}
                onClick={() => {
                  if (!activeProjectPath) return;
                  ensureProjectSelected();
                  setShowDocsSiteWizard(true);
                }}
              />
              <div style={{ position: 'relative' }}>
                <ActionTile
                  title="Docs → Server"
                  description={(() => {
                    if (!docsServerConfig) return 'Docs via FTP/SFTP auf deinen Server hochladen';
                    const ts = activeProjectPath ? loadDocsSyncTimestamp(activeProjectPath) : null;
                    if (!ts) return 'FTP-Sync konfiguriert · Noch nie synchronisiert';
                    const now = new Date();
                    const diffMin = Math.round((now.getTime() - ts.getTime()) / 60000);
                    const label = diffMin < 1 ? 'gerade eben' : diffMin < 60 ? `vor ${diffMin} Min.` : diffMin < 1440 ? `vor ${Math.round(diffMin / 60)} Std.` : ts.toLocaleDateString('de-DE');
                    return `● Letzter Sync: ${label}`;
                  })()}
                  icon={faCloudArrowUp}
                  locked={!activeProjectPath}
                  onClick={() => {
                    if (!activeProjectPath) return;
                    ensureProjectSelected();
                    setShowDocsServerWizard(true);
                  }}
                />
                {docsServerConfig && activeProjectPath && (
                  <button
                    title="Verbindung trennen"
                    onClick={(e) => {
                      e.stopPropagation();
                      localStorage.removeItem(`zenpost_docs_server:${activeProjectPath}`);
                      setDocsServerConfig(null);
                    }}
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      background: 'rgba(179,38,30,0.08)', border: '1px solid rgba(179,38,30,0.3)',
                      borderRadius: 6, color: '#B3261E', cursor: 'pointer',
                      padding: '3px 8px', fontSize: 10,
                      fontFamily: 'IBM Plex Mono, monospace',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(179,38,30,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(179,38,30,0.08)'; }}
                  >
                    <FontAwesomeIcon icon={faLinkSlash} style={{ fontSize: 9 }} />
                    Trennen
                  </button>
                )}
              </div>
            </div>

              {showDocsServerWizard && activeProjectPath && (
                <div style={{ marginTop: '16px' }}>
                  <DocsServerWizard
                    projectPath={activeProjectPath}
                    projectName={activeProjectName}
                    onBack={() => setShowDocsServerWizard(false)}
                    onConfigSaved={(cfg) => {
                      setDocsServerConfig(cfg);
                      setShowDocsServerWizard(false);
                    }}
                  />
                </div>
              )}

              {showDocsSiteWizard && onSaveDocsSiteLocally && (
                <div style={{ marginTop: '16px' }}>
                  <DocsSiteWizard
                    projectPath={activeProjectPath}
                    projectName={activeProjectName}
                    docFiles={docFiles}
                    onBack={() => setShowDocsSiteWizard(false)}
                    onSaveLocally={onSaveDocsSiteLocally}
                    onPushToGitHub={onPushDocsSiteToGitHub}
                    onOpenSettings={() => {
                      setShowDocsSiteWizard(false);
                      onOpenGitHubSettings?.();
                    }}
                  />
                </div>
              )}

              {showGitHubWizard && onPushDocsToGitHub && (
                <div style={{ marginTop: '16px' }}>
                  <GitHubDocsWizard
                    projectPath={activeProjectPath}
                    fileCount={githubDocsFileCount ?? 0}
                    onBack={() => setShowGitHubWizard(false)}
                    onPush={onPushDocsToGitHub}
                    onOpenSettings={() => {
                      setShowGitHubWizard(false);
                      onOpenGitHubSettings?.();
                    }}
                    generatedTemplates={generatedTemplates}
                    onPushTemplates={onPushTemplates}
                  />
                </div>
              )}
          </>
        </div>

        {/* Recent documents */}
        <div style={{ marginBottom: activeProjectPath ? '18px' : 0 }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#BEBEBE', fontFamily: 'IBM Plex Mono, monospace' }}>
            Letzte Dokumente
          </p>
          {recentDocuments.length === 0 ? (
            <div
              style={{
                borderRadius: '10px',
                border: '0.5px solid #2F2F2F',
                padding: '12px',
                color: '#7E7E7E',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '10px',
              }}
            >
              Noch keine letzten Dokumente.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentDocuments.map((doc) => (
                <button
                  key={doc.path}
                  onClick={() => onOpenRecentDocument?.(doc.path)}
                  style={{
                    borderRadius: '10px',
                    border: '0.5px solid #3A3A3A',
                    background: 'rgba(255,255,255,0.01)',
                    padding: '10px 12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#E7CCAA', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.name}
                    </div>
                    <div style={{ color: '#8E8E8E', fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.path}
                    </div>
                  </div>
                  <div style={{ color: '#7E7E7E', fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', flexShrink: 0 }}>
                    {formatDate(doc.modifiedAt)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

const ActionTile = ({
  title,
  description,
  icon,
  onClick,
  disabled,
  desktopOnly,
  locked,
}: {
  title: string;
  description: string;
  icon: any;
  onClick?: () => void;
  disabled?: boolean;
  desktopOnly?: boolean;
  locked?: boolean;
}) => {
  const [hovered, setHovered] = useState(false);
  // locked = no project selected — show paper but dimmed + hint on hover
  // disabled = desktop-only in web mode
  const active = hovered && !disabled && !locked;
  const lockedHovered = hovered && locked && !disabled;

  return (
    <button
      onClick={() => { if (disabled || locked) return; onClick?.(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: '16px',
        border: `0.5px solid ${
          disabled ? 'rgba(172,142,102,0.08)'
          : locked ? (lockedHovered ? 'rgba(172,142,102,0.35)' : 'rgba(172,142,102,0.14)')
          : active ? '#AC8E66'
          : 'rgba(172,142,102,0.22)'
        }`,
        background: disabled
          ? 'rgba(255,255,255,0.02)'
          : active
            ? 'linear-gradient(160deg, #EAE0CF 0%, #DDD3C0 100%)'
            : locked
              ? 'linear-gradient(160deg, #D8D2C6 0%, #CEC8BC 100%)'
              : 'linear-gradient(160deg, #EDE6D8 0%, #E5DDD0 100%)',
        color: disabled ? '#888' : '#2a2318',
        textAlign: 'left',
        padding: '14px 14px',
        minHeight: '92px',
        cursor: disabled ? 'not-allowed' : locked ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        boxShadow: active
          ? 'inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.07), 0 6px 20px rgba(0,0,0,0.22)'
          : disabled
            ? 'none'
            : 'inset 0 1px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.12)',
        transition: 'border-color 0.2s ease, background 0.25s ease, box-shadow 0.25s ease',
        opacity: disabled ? 0.45 : locked ? 0.4 : 1,
        overflow: 'hidden',
      }}
    >
      {/* Locked overlay hint */}
      {locked && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(209,203,184,1)',
          borderRadius: '16px',
          opacity: lockedHovered ? 1 : 0,
          transition: 'opacity 0.05s ease',
          pointerEvents: 'none',
          zIndex: 2,
        }}>
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '12px',
            color: '#1a1a1a',
            letterSpacing: '0.06em',
            textAlign: 'center',
            padding: '0 12px',
            lineHeight: 1.5,
          }}>
            ← Zuerst Projekt in der Karte anlegen
          </span>
        </div>
      )}

      <FontAwesomeIcon icon={icon} style={{ color: disabled ? '#888' : '#8A6F4A', marginTop: '2px', flexShrink: 0 }} />
      <div style={{ overflow: 'hidden', flex: 1 }}>
        {/* Title — zen slide-up on hover */}
        <div style={{ position: 'relative', overflow: 'hidden', height: '18px', marginBottom: '5px' }}>
          <p style={{
            margin: 0, fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace',
            whiteSpace: 'nowrap', position: 'absolute', top: 0, left: 0,
            color: disabled ? '#888' : '#2a2318',
            transform: active ? 'translateY(-100%)' : 'translateY(0)',
            opacity: active ? 0 : 1,
            transition: 'transform 0.22s ease, opacity 0.18s ease',
          }}>{title}</p>
          <p style={{
            margin: 0, fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace',
            whiteSpace: 'nowrap', color: '#8A6F4A', position: 'absolute', top: 0, left: 0,
            transform: active ? 'translateY(0)' : 'translateY(100%)',
            opacity: active ? 1 : 0,
            transition: 'transform 0.22s ease, opacity 0.18s ease',
          }}>Öffnen →</p>
        </div>
        <p style={{
          margin: 0, fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace',
          color: disabled ? '#666' : '#7a6a58',
          opacity: active ? 0.6 : 1,
          transition: 'opacity 0.2s ease',
        }}>{description}</p>
      </div>
      {desktopOnly && !locked && (
        <div style={{
          position: 'absolute', top: '7px', right: '8px',
          display: 'flex', alignItems: 'center', gap: '3px',
          padding: '2px 6px', borderRadius: '4px',
          background: 'rgba(172,142,102,0.10)',
          border: '0.5px solid rgba(172,142,102,0.3)',
        }}>
          <FontAwesomeIcon icon={faDesktop} style={{ fontSize: '7px', color: '#8A6F4A' }} />
          <span style={{ fontSize: '7px', fontFamily: 'IBM Plex Mono, monospace', color: '#8A6F4A', letterSpacing: '0.3px' }}>Desktop</span>
        </div>
      )}
    </button>
  );
};
