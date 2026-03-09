import { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarDays,
  faClock,
  faFileLines,
  faFolderOpen,
  faGlobe,
  faPlus,
  faPenNib,
} from '@fortawesome/free-solid-svg-icons';
import { isWebProjectPath, getWebProjectName, getWebProjectType } from '../../services/webProjectService';

type DashboardDocument = {
  id: string;
  name: string;
  path?: string;
  projectPath?: string;
  subtitle?: string;
  updatedAt?: number;
};

type ContentStudioDashboardScreenProps = {
  projectPath: string | null;
  recentProjectPaths: string[];
  documents: DashboardDocument[];
  onSelectProjectPath: (path: string) => void;
  onPickProject: () => void;
  onOpenDashboardDocument?: (doc: DashboardDocument) => void;
  onStartWriting: () => void;
  onOpenDocuments: () => void;
  onOpenPlanner: () => void;
  onOpenCalendar: () => void;
  serverArticles?: unknown[];
  serverArticlesLoading?: boolean;
  serverError?: string | null;
  serverName?: string;
  serverLocalCachePath?: string | null;
  onOpenServerArticle?: (slug: string) => void;
  onDeleteServerArticle?: (slug: string) => Promise<void>;
  onOpenApiSettings?: () => void;
};

const ActionTile = ({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: any;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    style={{
      borderRadius: '12px',
      border: '0.5px solid #3A3A3A',
      background: 'rgba(255,255,255,0.01)',
      color: '#e7e7e7',
      textAlign: 'left',
      padding: '14px 14px',
      minHeight: '92px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
    }}
  >
    <FontAwesomeIcon icon={icon} style={{ color: '#AC8E66', marginTop: '2px' }} />
    <div>
      <p style={{ margin: '0 0 5px 0', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace' }}>{title}</p>
      <p style={{ margin: 0, fontSize: '10px', color: '#919191', fontFamily: 'IBM Plex Mono, monospace' }}>
        {description}
      </p>
    </div>
  </button>
);

export function ContentStudioDashboardScreen({
  projectPath,
  recentProjectPaths,
  documents,
  onSelectProjectPath,
  onPickProject,
  onOpenDashboardDocument,
  onStartWriting,
  onOpenDocuments,
  onOpenPlanner,
  onOpenCalendar,
  serverArticles,
  serverArticlesLoading,
  serverError,
  serverName,
  serverLocalCachePath,
  onOpenServerArticle,
  onDeleteServerArticle,
  onOpenApiSettings,
}: ContentStudioDashboardScreenProps) {
  const visibleRecentProjects = recentProjectPaths.slice(0, 6);
  const stableOrderRef = useRef<string[]>([]);
  const seen = new Set(stableOrderRef.current);
  const newPaths = visibleRecentProjects.filter((p) => !seen.has(p));
  if (newPaths.length > 0) {
    stableOrderRef.current = [...stableOrderRef.current, ...newPaths];
  }
  stableOrderRef.current = stableOrderRef.current.filter((p) => visibleRecentProjects.includes(p));
  const allProjects = stableOrderRef.current;
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<string | 'server'>('');
  const [confirmingDeleteSlug, setConfirmingDeleteSlug] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [deleteToast, setDeleteToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const hasServerCachePath = !!(serverLocalCachePath && serverLocalCachePath.trim().length > 0);

  const handleDelete = (slug: string) => {
    if (!onDeleteServerArticle) return;
    setDeletingSlug(slug);
    onDeleteServerArticle(slug)
      .then(() => {
        setDeleteToast({ msg: 'Artikel erfolgreich gelöscht', ok: true });
        setTimeout(() => setDeleteToast(null), 3000);
      })
      .catch((e: unknown) => {
        setDeleteToast({ msg: e instanceof Error ? e.message : 'Löschen fehlgeschlagen', ok: false });
        setTimeout(() => setDeleteToast(null), 4000);
      })
      .finally(() => { setDeletingSlug(null); setConfirmingDeleteSlug(null); });
  };
  const [cardHovered, setCardHovered] = useState(false);
  const activeProjectPath = selectedPath ?? projectPath ?? allProjects[0] ?? null;
  const activeProjectName = activeProjectPath
    ? (isWebProjectPath(activeProjectPath)
        ? (getWebProjectName(activeProjectPath) ?? 'Web-Projekt')
        : activeProjectPath.split(/[\\/]/).filter(Boolean).pop() ?? 'Projekt')
    : 'Projekt';
  const activeProjectIsWeb = activeProjectPath ? isWebProjectPath(activeProjectPath) : false;
  const activeProjectWebType = activeProjectPath ? getWebProjectType(activeProjectPath) : null;

  const recent = documents
    .slice()
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    .slice(0, 8);
  const projectDocs = recent.filter((doc) => activeProjectPath && doc.projectPath === activeProjectPath);
  const hasDocs = projectDocs.length > 0;

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
          <FontAwesomeIcon icon={faPenNib} style={{ fontSize: '24px', color: '#AC8E66' }} />
          <h2
            style={{
              fontSize: '18px',
              fontWeight: '200',
              color: '#AC8E66',
              margin: 0,
              fontFamily: 'IBM Plex Mono, monospace',
              letterSpacing: '0.3px',
            }}
          >
            Content AI Studio starten
          </h2>
        </div>

        <p
          style={{
            color: '#999',
            marginBottom: '24px',
            maxWidth: '760px',
            fontSize: '11px',
            fontFamily: 'monospace',
            fontWeight: '100',
          }}
        >
          Schreibe einmal, veröffentliche mehrfach. Starte direkt im Editor, plane Posts oder lade vorhandene Dokumente.
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
          <div style={{ display: 'flex', alignItems: 'stretch', position: 'relative' }}>
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
                const tabName = isWebProjectPath(path)
                  ? (getWebProjectName(path) ?? 'Web')
                  : (path.split(/[\\/]/).filter(Boolean).pop() || path);
                const tabLabel = tabName.length > 6 ? tabName.slice(0, 5) + '…' : tabName;
                const isActive = selectedTab !== 'server' && path === activeProjectPath;
                return (
                  <button
                    key={path}
                    onClick={() => {
                      setSelectedTab('');
                      setSelectedPath(path);
                      onSelectProjectPath(path);
                    }}
                    title={path}
                    style={{
                      width: '36px',
                      height: '80px',
                      borderRadius: '10px 0 0 10px',
                      borderTop: isActive ? '1px solid #b8b0a0' : '0.5px solid #3A3A3A',
                      borderLeft: isActive ? '1px solid #b8b0a0' : '0.5px solid #3A3A3A',
                      borderBottom: isActive ? '1px solid #b8b0a0' : '0.5px solid #3A3A3A',
                      borderRight: 'none',
                      background: isActive ? '#d0cbb8' : '#1a1a1a',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      transition: 'background 0.2s',
                      position: 'relative',
                      zIndex: isActive ? 20 : 10,
                    }}
                    onMouseEnter={(event) => {
                      if (!isActive) event.currentTarget.style.background = '#2a2a2a';
                    }}
                    onMouseLeave={(event) => {
                      if (!isActive) event.currentTarget.style.background = '#1a1a1a';
                    }}
                  >
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
                      }}
                    >
                      {tabLabel}
                    </span>
                  </button>
                );
              })}
              {onOpenServerArticle && (
                <button
                  onClick={() => setSelectedTab('server')}
                  title={serverName ? `Server Artikel · ${serverName}` : 'Server Artikel'}
                  style={{
                    width: '36px',
                    height: '80px',
                    borderRadius: '10px 0 0 10px',
                    borderTop: selectedTab === 'server' ? '1px solid #b8b0a0' : '0.5px solid #3A3A3A',
                    borderLeft: selectedTab === 'server' ? '1px solid #b8b0a0' : '0.5px solid #3A3A3A',
                    borderBottom: selectedTab === 'server' ? '1px solid #b8b0a0' : '0.5px solid #3A3A3A',
                    borderRight: 'none',
                    background: selectedTab === 'server' ? '#d0cbb8' : '#1a1a1a',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    transition: 'background 0.2s',
                    position: 'relative',
                    zIndex: selectedTab === 'server' ? 20 : 10,
                  }}
                  onMouseEnter={(event) => {
                    if (selectedTab !== 'server') event.currentTarget.style.background = '#2a2a2a';
                  }}
                  onMouseLeave={(event) => {
                    if (selectedTab !== 'server') event.currentTarget.style.background = '#1a1a1a';
                  }}
                >
                  <span
                    style={{
                      writingMode: 'vertical-rl',
                      textOrientation: 'mixed',
                      transform: 'rotate(180deg)',
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '9px',
                      color: selectedTab === 'server' ? '#1a1a1a' : '#8E8E8E',
                      whiteSpace: 'nowrap',
                      letterSpacing: '0.3px',
                    }}
                  >
                    Server
                  </span>
                </button>
              )}
            </div>

            <div
              style={{ position: 'relative', width: '280px', minHeight: '320px', zIndex: 15 }}
              onMouseEnter={() => selectedTab !== 'server' && hasDocs && setCardHovered(true)}
              onMouseLeave={() => setCardHovered(false)}
            >
              {selectedTab === 'server' ? (
                <div
                  style={{
                    width: '100%',
                    height: '320px',
                    borderRadius: '0 12px 12px 0',
                    padding: '14px 16px',
                    border: '1px solid #b8b0a0',
                    borderLeft: 'none',
                    background: 'linear-gradient(180deg, #EDE6D8 0%, #E7DFD0 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '4px 4px 20px rgba(0,0,0,0.25)',
                  }}
                >
                  <p style={{ fontSize: '9px', color: '#7a7060', fontFamily: 'IBM Plex Mono, monospace', margin: '0 0 8px 0', textTransform: 'uppercase', letterSpacing: '1px', flexShrink: 0 }}>
                    Server Artikel{serverName ? ` · ${serverName}` : ''}
                    {serverArticlesLoading && <span style={{ color: '#AC8E66', marginLeft: '6px' }}>Lädt…</span>}
                  </p>
                  <div
                    style={{
                      margin: '0 0 8px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexWrap: 'wrap',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: hasServerCachePath ? '#1F8A41' : '#B3261E',
                        boxShadow: hasServerCachePath
                          ? '0 0 0 2px rgba(31,138,65,0.18)'
                          : '0 0 0 2px rgba(179,38,30,0.18)',
                      }}
                    />
                    <span
                      title={hasServerCachePath ? (serverLocalCachePath ?? '') : 'Nicht gesetzt'}
                      style={{
                        fontSize: '8px',
                        color: hasServerCachePath ? '#5f6f5f' : '#8f1d16',
                        fontFamily: 'IBM Plex Mono, monospace',
                        maxWidth: '208px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {hasServerCachePath
                        ? `Lokaler Cache: ${serverLocalCachePath}`
                        : 'Lokaler Cache fehlt'}
                    </span>
                    {!hasServerCachePath && (
                      <button
                        onClick={() => onOpenApiSettings?.()}
                        style={{
                          border: '0.5px solid rgba(179,38,30,0.45)',
                          borderRadius: '6px',
                          background: 'rgba(179,38,30,0.08)',
                          color: '#8f1d16',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '8px',
                          padding: '3px 7px',
                          cursor: onOpenApiSettings ? 'pointer' : 'not-allowed',
                          opacity: onOpenApiSettings ? 1 : 0.6,
                          whiteSpace: 'nowrap',
                        }}
                        disabled={!onOpenApiSettings}
                      >
                        API öffnen
                      </button>
                    )}
                  </div>
                  {serverError && (
                    <div
                      style={{
                        borderRadius: '6px',
                        border: '0.5px solid rgba(179,38,30,0.35)',
                        background: 'rgba(179,38,30,0.06)',
                        padding: '8px',
                        marginBottom: '8px',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontSize: '9px', color: '#8f1d16', fontFamily: 'IBM Plex Mono, monospace', lineHeight: 1.4 }}>
                        {serverError}
                      </span>
                      <button
                        onClick={() => onOpenApiSettings?.()}
                        style={{
                          border: '0.5px solid rgba(179,38,30,0.45)',
                          borderRadius: '6px',
                          background: 'rgba(179,38,30,0.08)',
                          color: '#8f1d16',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '8px',
                          padding: '4px 8px',
                          cursor: onOpenApiSettings ? 'pointer' : 'not-allowed',
                          opacity: onOpenApiSettings ? 1 : 0.6,
                          whiteSpace: 'nowrap',
                        }}
                        disabled={!onOpenApiSettings}
                      >
                        API jetzt öffnen
                      </button>
                    </div>
                  )}
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {(!serverArticles || serverArticles.length === 0) && !serverArticlesLoading && (
                      <p style={{ fontSize: '9px', color: '#7a7060', fontFamily: 'IBM Plex Mono, monospace', margin: 0 }}>
                        Keine Artikel gefunden.
                      </p>
                    )}
                    {serverArticles && serverArticles.map((raw, i) => {
                      const slug = typeof raw === 'string' ? raw : ((raw as { slug?: string }).slug ?? '');
                      const title = typeof raw === 'string' ? raw : ((raw as { title?: string }).title || slug);
                      const isConfirming = confirmingDeleteSlug === slug;
                      const isDeleting = deletingSlug === slug;
                      return (
                        <div
                          key={slug || i}
                          style={{
                            borderRadius: '6px',
                            border: '0.5px solid rgba(172, 142, 102, 0.3)',
                            background: 'rgba(255,255,255,0.4)',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <div
                            onClick={() => onOpenServerArticle?.(slug)}
                            style={{ flex: 1, minWidth: 0, padding: '8px 10px', cursor: 'pointer' }}
                          >
                            <p style={{ margin: 0, fontSize: '10px', color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {title}
                            </p>
                          </div>
                          {onDeleteServerArticle && (
                            <button
                              disabled={isDeleting}
                              onClick={() => {
                                if (isConfirming) {
                                  handleDelete(slug);
                                } else {
                                  setConfirmingDeleteSlug(slug);
                                  setTimeout(() => setConfirmingDeleteSlug((s) => s === slug ? null : s), 3000);
                                }
                              }}
                              style={{
                                flexShrink: 0,
                                padding: '4px 8px',
                                marginRight: '6px',
                                border: isConfirming ? '0.5px solid rgba(180,30,30,0.4)' : 'none',
                                borderRadius: '4px',
                                background: isConfirming ? 'rgba(180,30,30,0.08)' : 'transparent',
                                color: isConfirming ? '#B3261E' : '#8a7a6a',
                                fontFamily: 'IBM Plex Mono, monospace',
                                fontSize: '9px',
                                cursor: isDeleting ? 'default' : 'pointer',
                              }}
                            >
                              {isDeleting ? '…' : isConfirming ? 'Löschen?' : '×'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: '9px', color: '#AC8E66', fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', opacity: 0.7, flexShrink: 0, paddingTop: '6px' }}>
                    Klicken zum Öffnen →
                  </div>
                </div>
              ) : (
              <>
              <button
                onClick={() => activeProjectPath && onSelectProjectPath(activeProjectPath)}
                disabled={!activeProjectPath}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  minHeight: '320px',
                  borderRadius: '0 12px 12px 0',
                  padding: '18px 18px',
                  textAlign: 'left',
                  border: '1px solid #b8b0a0',
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
                    <FontAwesomeIcon
                      icon={activeProjectIsWeb ? faGlobe : faFolderOpen}
                      style={{ color: '#AC8E66', fontSize: '16px' }}
                    />
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
                <div style={{ borderTop: '1px solid rgba(172, 142, 102, 0.3)', paddingTop: '12px', flex: 1 }}>
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
                    {activeProjectIsWeb
                      ? (activeProjectWebType === 'directory' ? 'Ordner-Projekt (Browser)' : 'Virtuelles Projekt (Browser)')
                      : (activeProjectPath || 'Noch kein Projekt ausgewählt')}
                  </p>
                </div>
                <div
                  style={{
                    fontSize: '9px',
                    color: '#AC8E66',
                    fontFamily: 'IBM Plex Mono, monospace',
                    textAlign: 'right',
                    opacity: 0.7,
                  }}
                >
                  Klicken zum Öffnen →
                </div>
              </button>

              {cardHovered && hasDocs && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: '0 12px 12px 0',
                    background: 'linear-gradient(180deg, #EDE6D8 0%, #E7DFD0 100%)',
                    border: '1px solid #b8b0a0',
                    borderLeft: 'none',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    overflow: 'hidden',
                    zIndex: 25,
                  }}
                >
                  <p
                    style={{
                      fontSize: '9px',
                      color: '#7a7060',
                      fontFamily: 'IBM Plex Mono, monospace',
                      margin: '0 0 4px 0',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}
                  >
                    Projekt Dokumente
                  </p>
                  <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {projectDocs.slice(0, 8).map((doc) => (
                      <div
                        key={doc.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenDashboardDocument?.(doc);
                        }}
                        style={{
                          borderRadius: '6px',
                          border: '0.5px solid rgba(172, 142, 102, 0.3)',
                          background: 'rgba(255,255,255,0.4)',
                          padding: '8px 10px',
                          cursor: 'pointer',
                        }}
                      >
                        <p style={{ margin: 0, fontSize: '10px', color: '#1a1a1a', fontFamily: 'IBM Plex Mono, monospace', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.name}
                        </p>
                        <p style={{ margin: '2px 0 0 0', fontSize: '8px', color: '#7a7060', fontFamily: 'IBM Plex Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.path ? doc.path.split(/[\\/]/).slice(-2).join('/') : (doc.subtitle || 'Dokument')}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '9px', color: '#AC8E66', fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', opacity: 0.7 }}>
                    Klicken zum Öffnen →
                  </div>
                </div>
              )}
              </>
              )}
            </div>


            <button
              onClick={onPickProject}
              style={{
                width: '36px',
                height: '40px',
                borderRadius: '0 10px 10px 0',
                border: '1px dashed #AC8E66',
                borderLeft: 'none',
                background: 'transparent',
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
              <FontAwesomeIcon icon={faPlus} style={{ color: '#AC8E66', fontSize: '12px' }} />
            </button>
          </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '12px',
              }}
            >
              <div style={{ gridColumn: '1 / -1', height: '30px', visibility: 'hidden' }} aria-hidden="true">
                Projekt wählen
              </div>
              <ActionTile
                title="Direkt schreiben"
                description="Im Editor starten und Content vorbereiten"
                icon={faFileLines}
                onClick={onStartWriting}
            />
            <ActionTile
              title="Projekt + Dokumente"
              description="Dateien laden, suchen und per Drag & Drop importieren"
              icon={faFolderOpen}
              onClick={onOpenDocuments}
            />
            <ActionTile
              title="Planen"
              description="Beiträge strukturieren und in den Planer übernehmen"
              icon={faClock}
              onClick={onOpenPlanner}
            />
            <ActionTile
              title="Kalender"
              description="Veröffentlichungen im Kalender verwalten"
              icon={faCalendarDays}
              onClick={onOpenCalendar}
            />
          </div>
        </div>

        <div>
          <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#BEBEBE', fontFamily: 'IBM Plex Mono, monospace' }}>
            Letzte Dokumente
          </p>
          {recent.length === 0 ? (
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
              {recent.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => {
                    onOpenDashboardDocument?.(doc);
                  }}
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
                      {doc.subtitle || 'Dokument öffnen'}
                    </div>
                  </div>
                  <div style={{ color: '#7E7E7E', fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', flexShrink: 0 }}>
                    {doc.updatedAt
                      ? new Date(doc.updatedAt).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                      : '—'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {onOpenServerArticle && (serverArticles === undefined || serverArticles !== null) && (
          <div style={{ marginTop: '24px' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#BEBEBE', fontFamily: 'IBM Plex Mono, monospace' }}>
              Server Artikel{serverName ? ` · ${serverName}` : ''}
              {serverArticlesLoading && <span style={{ color: '#666', marginLeft: '8px' }}>Lädt…</span>}
            </p>
            <div
              style={{
                margin: '-4px 0 10px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: hasServerCachePath ? '#1F8A41' : '#B3261E',
                  boxShadow: hasServerCachePath
                    ? '0 0 0 2px rgba(31,138,65,0.14)'
                    : '0 0 0 2px rgba(179,38,30,0.14)',
                }}
              />
              <span
                title={hasServerCachePath ? (serverLocalCachePath ?? '') : 'Nicht gesetzt'}
                style={{
                  fontSize: '9px',
                  color: hasServerCachePath ? '#8E8E8E' : '#cf6679',
                  fontFamily: 'IBM Plex Mono, monospace',
                  maxWidth: '620px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {hasServerCachePath
                  ? `Lokaler Cache: ${serverLocalCachePath}`
                  : 'Lokaler Cache fehlt – bitte in API-Einstellungen setzen.'}
              </span>
              {!hasServerCachePath && (
                <button
                  onClick={() => onOpenApiSettings?.()}
                  style={{
                    border: '0.5px solid rgba(179,38,30,0.45)',
                    borderRadius: '8px',
                    background: 'rgba(179,38,30,0.08)',
                    color: '#cf6679',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '9px',
                    padding: '4px 8px',
                    cursor: onOpenApiSettings ? 'pointer' : 'not-allowed',
                    opacity: onOpenApiSettings ? 1 : 0.6,
                  }}
                  disabled={!onOpenApiSettings}
                >
                  API öffnen
                </button>
              )}
            </div>
            {serverError && (
              <div
                style={{
                  borderRadius: '10px',
                  border: '0.5px solid rgba(179,38,30,0.35)',
                  background: 'rgba(179,38,30,0.06)',
                  padding: '12px',
                  color: '#cf6679',
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  flexWrap: 'wrap',
                  marginBottom: '8px',
                }}
              >
                <span>{serverError}</span>
                <button
                  onClick={() => onOpenApiSettings?.()}
                  style={{
                    border: '0.5px solid rgba(179,38,30,0.45)',
                    borderRadius: '8px',
                    background: 'rgba(179,38,30,0.08)',
                    color: '#cf6679',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '9px',
                    padding: '5px 9px',
                    cursor: onOpenApiSettings ? 'pointer' : 'not-allowed',
                    opacity: onOpenApiSettings ? 1 : 0.6,
                  }}
                  disabled={!onOpenApiSettings}
                >
                  API jetzt öffnen
                </button>
              </div>
            )}
            {!serverArticles && !serverArticlesLoading && !serverError && (
              <div style={{ borderRadius: '10px', border: '0.5px solid #2F2F2F', padding: '12px', color: '#7E7E7E', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px' }}>
                Keine Server-URL konfiguriert.
              </div>
            )}
            {serverArticles && serverArticles.length === 0 && !serverArticlesLoading && (
              <div style={{ borderRadius: '10px', border: '0.5px solid #2F2F2F', padding: '12px', color: '#7E7E7E', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px' }}>
                Keine Artikel gefunden.
              </div>
            )}
            {serverArticles && serverArticles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {serverArticles.map((raw, i) => {
                  const slug = typeof raw === 'string' ? raw : ((raw as { slug?: string }).slug ?? '');
                  const title = typeof raw === 'string' ? raw : ((raw as { title?: string }).title || slug);
                  const date = typeof raw === 'string' ? '' : ((raw as { date?: string }).date ?? '');
                  const isConfirming = confirmingDeleteSlug === slug;
                  const isDeleting = deletingSlug === slug;
                  return (
                    <div
                      key={slug || i}
                      style={{
                        borderRadius: '10px',
                        border: '0.5px solid #3A3A3A',
                        background: 'rgba(255,255,255,0.01)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <button
                        onClick={() => onOpenServerArticle(slug)}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          padding: '10px 12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          background: 'transparent',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: '#E7CCAA', fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {title}
                          </div>
                          {title !== slug && slug && (
                            <div style={{ color: '#8E8E8E', fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px' }}>
                              {slug}
                            </div>
                          )}
                        </div>
                        <div style={{ color: '#7E7E7E', fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', flexShrink: 0 }}>
                          {date || '—'}
                        </div>
                      </button>
                      {onDeleteServerArticle && (
                        <button
                          disabled={isDeleting}
                          onClick={() => {
                            if (isConfirming) {
                              setDeletingSlug(slug);
                              void onDeleteServerArticle(slug).finally(() => { setDeletingSlug(null); setConfirmingDeleteSlug(null); });
                            } else {
                              setConfirmingDeleteSlug(slug);
                              setTimeout(() => setConfirmingDeleteSlug((s) => s === slug ? null : s), 3000);
                            }
                          }}
                          style={{
                            flexShrink: 0,
                            padding: '6px 12px',
                            marginRight: '8px',
                            border: isConfirming ? '0.5px solid rgba(180,30,30,0.4)' : '0.5px solid #3A3A3A',
                            borderRadius: '6px',
                            background: isConfirming ? 'rgba(180,30,30,0.1)' : 'transparent',
                            color: isConfirming ? '#cf6679' : '#666',
                            fontFamily: 'IBM Plex Mono, monospace',
                            fontSize: '10px',
                            cursor: isDeleting ? 'default' : 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {isDeleting ? '…' : isConfirming ? 'Löschen?' : '×'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {deleteToast && (
              <div style={{
                marginTop: '10px',
                padding: '8px 14px',
                borderRadius: '8px',
                background: deleteToast.ok ? 'rgba(31,111,63,0.12)' : 'rgba(180,30,30,0.1)',
                border: `0.5px solid ${deleteToast.ok ? 'rgba(31,138,65,0.4)' : 'rgba(180,30,30,0.4)'}`,
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '10px',
                color: deleteToast.ok ? '#1F6F3F' : '#B3261E',
              }}>
                {deleteToast.msg}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
