import { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBookOpen,
  faChartSimple,
  faFilePen,
  faFolderOpen,
  faMagnifyingGlass,
  faPlus,
} from '@fortawesome/free-solid-svg-icons';
import { ProjectPickerModal } from '../../../components/DocStudio/ProjectPickerModal';
import type { DocStudioRuntime } from '../types';

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
  onOpenRecentDocument?: (path: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
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

  const activeProjectPath = selectedPath ?? projectPath ?? allProjects[0] ?? null;
  const desktopDisabled = runtime === 'web';
  const activeProjectName = activeProjectPath?.split(/[\\/]/).filter(Boolean).pop() || 'Projekt';

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
              fontWeight: '200',
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
            color: '#999',
            marginBottom: '24px',
            maxWidth: '760px',
            fontSize: '11px',
            fontFamily: 'monospace',
            fontWeight: '100',
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
                const isActive = path === activeProjectPath;
                return (
                  <button
                    key={path}
                    onClick={() => {
                      setSelectedPath(path);
                      onSelect(path);
                    }}
                    title={path}
                    style={{
                      width: '36px',
                      height: '80px',
                      borderRadius: '10px 0 0 10px',
                      border: isActive ? '1px solid #b8b0a0' : '0.5px solid #3A3A3A',
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
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = '#2a2a2a';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = '#1a1a1a';
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
                      {tabName}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active card (beige) with hover overlay */}
            {(() => {
              const projectDocs = recentDocuments.filter(
                (doc) => activeProjectPath && doc.projectPath === activeProjectPath,
              );
              const hasDocs = projectDocs.length > 0;
              return (
                <div
                  style={{ position: 'relative', width: '280px', minHeight: '320px', zIndex: 15 }}
                  onMouseEnter={() => hasDocs && setCardHovered(true)}
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
                        <FontAwesomeIcon icon={faFolderOpen} style={{ color: '#AC8E66', fontSize: '16px' }} />
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

                  {/* Hover overlay: project documents */}
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
                            key={doc.path}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenRecentDocument?.(doc.path);
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
                              {doc.path.split('/').slice(-2).join('/')}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: '9px', color: '#AC8E66', fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', opacity: 0.7 }}>
                        Klicken zum Öffnen →
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* + Tab on the right side */}
            <button
              onClick={() => setShowPicker(true)}
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

          {/* Right: Action tiles */}
          {activeProjectPath ? (
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
                title="Projekt neu scannen"
                description="Scan aktualisieren und Projektstruktur neu einlesen"
                icon={faMagnifyingGlass}
                disabled={desktopDisabled}
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
                disabled={false}
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
                disabled={false}
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
                disabled={false}
                onClick={() => {
                  const targetPath = ensureProjectSelected();
                  if (!targetPath && runtime !== 'web') return;
                  onEditInputFields?.();
                }}
              />
            </div>
          ) : null}
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

        {runtime === 'web' && (
          <p style={{ marginTop: '16px', fontSize: '10px', color: '#777', fontFamily: 'monospace' }}>
            Browser-Modus: Projekt-Scan funktioniert nur in der Desktop-App (Tauri).
          </p>
        )}
      </div>

      <ProjectPickerModal
        isOpen={showPicker}
        isWebRuntime={runtime === 'web'}
        onClose={() => setShowPicker(false)}
        onPathSelected={(path) => {
          onSelect(path);
          setShowPicker(false);
        }}
        onContinueWithoutFolder={() => {
          if (runtime !== 'web') return;
          onContinueToEditor?.();
          setShowPicker(false);
        }}
      />
    </div>
  );
}

const ActionTile = ({
  title,
  description,
  icon,
  onClick,
  disabled,
}: {
  title: string;
  description: string;
  icon: any;
  onClick?: () => void;
  disabled?: boolean;
}) => (
  <button
    onClick={() => {
      if (disabled) return;
      onClick?.();
    }}
    style={{
      borderRadius: '12px',
      border: disabled ? '0.5px solid #2A2A2A' : '0.5px solid #3A3A3A',
      background: 'rgba(255,255,255,0.01)',
      color: disabled ? '#666' : '#e7e7e7',
      textAlign: 'left',
      padding: '14px 14px',
      minHeight: '92px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
    }}
  >
    <FontAwesomeIcon icon={icon} style={{ color: disabled ? '#666' : '#AC8E66', marginTop: '2px' }} />
    <div>
      <p style={{ margin: '0 0 5px 0', fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace' }}>{title}</p>
      <p style={{ margin: 0, fontSize: '10px', color: '#919191', fontFamily: 'IBM Plex Mono, monospace' }}>
        {description}
      </p>
    </div>
  </button>
);
