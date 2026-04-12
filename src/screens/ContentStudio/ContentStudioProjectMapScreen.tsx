import { useMemo, useRef, useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDownAZ, faCalendarDays, faCloud, faFileImport, faFolderOpen, faStickyNote } from '@fortawesome/free-solid-svg-icons';
import { importDocumentToMarkdown } from '../../services/documentImportService';
import { isCloudProjectPath } from '../../services/cloudProjectService';

type StudioFile = {
  path: string;
  name: string;
  modifiedAt?: number;
};

type WebDocument = {
  id: string;
  name: string;
  content: string;
  updatedAt: number;
};

type ContentStudioProjectMapScreenProps = {
  isDesktopRuntime: boolean;
  projectPath: string | null;
  allFiles: StudioFile[];
  webDocuments: WebDocument[];
  cloudDocuments: Array<{ id: number; fileName: string; createdAt: string }>;
  onBack: () => void;
  onStartWriting: () => void;
  onOpenFile: (filePath: string) => void;
  onLoadWebDocument: (content: string, fileName: string) => void;
  onOpenCloudDocument: (docId: number, fileName: string) => void;
};

export function ContentStudioProjectMapScreen({
  isDesktopRuntime,
  projectPath,
  allFiles,
  webDocuments,
  cloudDocuments,
  onBack,
  onStartWriting: _onStartWriting,
  onOpenFile,
  onLoadWebDocument,
  onOpenCloudDocument,
}: ContentStudioProjectMapScreenProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fileSearch, setFileSearch] = useState('');
  const [fileSort, setFileSort] = useState<'name-asc' | 'name-desc' | 'date-desc' | 'date-asc'>('name-asc');
  const [activeTab, setActiveTab] = useState<'files' | 'web' | 'cloud' | 'zennote'>(isDesktopRuntime ? 'files' : 'web');
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [titleHovered, setTitleHovered] = useState(false);

  const matchesFileSearch = (name: string, path: string, query: string): boolean => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    if (q.startsWith('*.')) {
      const ext = q.slice(1);
      return name.toLowerCase().endsWith(ext) || path.toLowerCase().endsWith(ext);
    }
    return name.toLowerCase().includes(q) || path.toLowerCase().includes(q);
  };

  const sortedAllFiles = useMemo(() => {
    const files = [...allFiles];
    if (fileSort.startsWith('name')) {
      files.sort((a, b) => {
        const compare = a.name.localeCompare(b.name, 'de', { numeric: true, sensitivity: 'base' });
        return fileSort === 'name-asc' ? compare : -compare;
      });
    } else {
      files.sort((a, b) => {
        const aTime = a.modifiedAt ?? 0;
        const bTime = b.modifiedAt ?? 0;
        const compare = aTime - bTime;
        return fileSort === 'date-asc' ? compare : -compare;
      });
    }
    return files;
  }, [allFiles, fileSort]);

  const filteredAllFiles = useMemo(
    () => sortedAllFiles.filter((file) => matchesFileSearch(file.name, file.path, fileSearch)),
    [sortedAllFiles, fileSearch]
  );

  const filteredWebDocuments = useMemo(
    () => webDocuments.filter((doc) => matchesFileSearch(doc.name, doc.name, fileSearch)),
    [webDocuments, fileSearch]
  );

  const filteredCloudDocuments = useMemo(
    () => cloudDocuments.filter((doc) =>
      !doc.fileName.endsWith('.json') &&
      !doc.fileName.endsWith('.zennote') &&
      matchesFileSearch(doc.fileName, doc.fileName, fileSearch)
    ),
    [cloudDocuments, fileSearch]
  );

  const filteredZenNoteDocuments = useMemo(
    () => cloudDocuments.filter((doc) =>
      doc.fileName.endsWith('.zennote') &&
      matchesFileSearch(doc.fileName, doc.fileName, fileSearch)
    ),
    [cloudDocuments, fileSearch]
  );

  const zenNoteCount = cloudDocuments.filter((doc) => doc.fileName.endsWith('.zennote')).length;

  useEffect(() => {
    if (projectPath && isCloudProjectPath(projectPath)) {
      setActiveTab('cloud');
      return;
    }
    setActiveTab(isDesktopRuntime ? 'files' : 'web');
  }, [projectPath, isDesktopRuntime]);

  const handleWebFile = async (file: File) => {
    setLoadError(null);
    setIsConverting(true);
    try {
      const result = await importDocumentToMarkdown(file, {
        convertCode: false,
        fallbackToRawOnConvertError: false,
        allowJsonPrettyFallback: true,
        requireNonEmpty: true,
      });
      if (!result.success) {
        setLoadError(result.error);
        return;
      }
      onLoadWebDocument(result.content, file.name);
    } catch {
      setLoadError('Datei konnte nicht geladen werden.');
    } finally {
      setIsConverting(false);
    }
  };

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
        <div style={{ marginBottom: '12px' }}>
          <div
            onClick={onBack}
            title="Zurück zum Dashboard"
            onMouseEnter={() => setTitleHovered(true)}
            onMouseLeave={() => setTitleHovered(false)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
            }}
          >
            <FontAwesomeIcon icon={faFolderOpen} style={{ fontSize: '22px', color: '#AC8E66' }} />
            <div style={{ position: 'relative', overflow: 'hidden', height: '27px' }}>
              {/* Original text — slides up on hover */}
              <h2 style={{
                fontSize: '18px', fontWeight: 400, color: '#AC8E66', margin: 0,
                fontFamily: 'IBM Plex Mono, monospace', whiteSpace: 'nowrap',
                transform: titleHovered ? 'translateY(-100%)' : 'translateY(0)',
                opacity: titleHovered ? 0 : 1,
                transition: 'transform 0.22s ease, opacity 0.18s ease',
              }}>
                Content Projektmappe
              </h2>
              {/* Hover text — slides in from below */}
              <h2 style={{
                fontSize: '18px', fontWeight: 400, color: '#AC8E66', margin: 0,
                fontFamily: 'IBM Plex Mono, monospace', whiteSpace: 'nowrap',
                position: 'absolute', top: 0, left: 0,
                transform: titleHovered ? 'translateY(0)' : 'translateY(100%)',
                opacity: titleHovered ? 1 : 0,
                transition: 'transform 0.22s ease, opacity 0.18s ease',
              }}>
                Projekt wechseln →
              </h2>
            </div>
          </div>
        </div>

        <p style={{ color: '#d0cbb8', marginBottom: '14px', fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace' }}>
          {projectPath ? `Dein Projekt Ordner: ${projectPath}` : 'Kein Projekt ausgewählt'}
        </p>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragActive(true);
          }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragActive(false);
            const file = event.dataTransfer.files?.[0];
            if (file) void handleWebFile(file);
          }}
          style={{
            background: '#d0cbb8',
            border: `1px dashed ${isDragActive ? '#AC8E66' : '#3A3A3A'}`,
            borderRadius: '12px',
            padding: '18px',
            textAlign: 'center',
            marginBottom: '14px',
            color: '#1a1a1a',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
          }}
        >
          {isConverting ? 'Konvertiere Dokument…' : 'Datei hier ablegen (Drag & Drop)'}
          <div style={{ marginTop: '8px', fontSize: '9px', color: '#1a1a1a/20' }}>
            Unterstützt: .md, .txt, .json, .pdf, .docx, .doc, .pages
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              marginTop: '10px',
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1px dotted #1a1a1a',
              background: 'transparent',
              color: '#888',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            <FontAwesomeIcon icon={faFileImport} /> Dokument laden
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt,.json,.pdf,.docx,.doc,.pages"
            style={{ display: 'none' }}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleWebFile(file);
              event.currentTarget.value = '';
            }}
          />
        </div>

        {loadError && (
          <div style={{ marginBottom: '12px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#e07a7a' }}>
            {loadError}
          </div>
        )}

        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          {isDesktopRuntime && (
            <button
              onClick={() => setActiveTab('files')}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: `1px solid ${activeTab === 'files' ? '#AC8E66' : '#3A3A3A'}`,
                background: activeTab === 'files' ? '#d0cbb8' : 'transparent',
                color: activeTab === 'files' ? '#1a1a1a' : '#777',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '10px',
                cursor: 'pointer',
              }}
            >
              Projektdateien
            </button>
          )}
          <button
            onClick={() => setActiveTab('web')}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: `1px solid ${activeTab === 'web' ? '#AC8E66' : '#3A3A3A'}`,
              background: activeTab === 'web' ? '#d0cbb8' : 'transparent',
              color: activeTab === 'web' ? '#1a1a1a' : '#777',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            Web · {webDocuments.length}
          </button>
          <button
            onClick={() => setActiveTab('cloud')}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: `1px solid ${activeTab === 'cloud' ? '#AC8E66' : '#3A3A3A'}`,
              background: activeTab === 'cloud' ? '#d0cbb8' : 'transparent',
              color: activeTab === 'cloud' ? '#1a1a1a' : '#777',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <FontAwesomeIcon icon={faCloud} style={{ fontSize: '10px' }} />
            Cloud · {cloudDocuments.filter((d) => !d.fileName.endsWith('.json') && !d.fileName.endsWith('.zennote')).length}
          </button>
          <button
            onClick={() => setActiveTab('zennote')}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: `1px solid ${activeTab === 'zennote' ? '#AC8E66' : '#3A3A3A'}`,
              background: activeTab === 'zennote' ? '#d0cbb8' : 'transparent',
              color: activeTab === 'zennote' ? '#1a1a1a' : '#777',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <FontAwesomeIcon icon={faStickyNote} style={{ fontSize: '10px' }} />
            ZenNote · {zenNoteCount}
          </button>
        </div>

        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#BEBEBE' }}>
            {activeTab === 'files' ? 'Projektdateien' : activeTab === 'cloud' ? 'Cloud-Dokumente' : activeTab === 'zennote' ? 'ZenNote Notizen' : 'Web-Dokumente'}
          </span>
          {activeTab === 'files' && isDesktopRuntime && (
            <button
              type="button"
              onClick={() =>
                setFileSort((prev) =>
                  prev === 'name-asc'
                    ? 'name-desc'
                    : prev === 'name-desc'
                      ? 'date-desc'
                      : prev === 'date-desc'
                        ? 'date-asc'
                        : 'name-asc'
                )
              }
              style={{
                border: '1px solid #3A3A3A',
                borderRadius: '8px',
                padding: '6px 10px',
                color: '#777',
                background: 'transparent',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '10px',
              }}
            >
              <FontAwesomeIcon icon={fileSort.startsWith('name') ? faArrowDownAZ : faCalendarDays} />
              {fileSort === 'name-asc' ? 'A-Z' : fileSort === 'name-desc' ? 'Z-A' : fileSort === 'date-desc' ? 'Neueste' : 'Aelteste'}
            </button>
          )}
        </div>

        <input
          type="text"
          value={fileSearch}
          onChange={(event) => setFileSearch(event.target.value)}
          placeholder="Suchen...und finden"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '8px 10px',
            border: '1px solid #3A3A3A',
            borderRadius: '8px',
            background: 'transparent',
            color: '#7a7a7a',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '10px',
            marginBottom: '12px',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activeTab === 'files' && isDesktopRuntime
            ? filteredAllFiles.map((file) => (
                <button
                  key={file.path}
                  onClick={() => onOpenFile(file.path)}
                  onMouseEnter={() => setHoveredItemId(file.path)}
                  onMouseLeave={() => setHoveredItemId(null)}
                  style={{
                    border: hoveredItemId === file.path ? '1px solid #4caf50' : '0.5px solid #3A3A3A',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    background: hoveredItemId === file.path ? 'rgba(205,195,176,0.12)' : 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#7a7a7a',
                    fontFamily: 'IBM Plex Mono, monospace',
                    transform: hoveredItemId === file.path ? 'translateX(3px)' : 'translateX(0)',
                    transition: 'transform 0.15s ease, border-color 0.15s ease, background 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#d3d3d3' }}>{file.name}</div>
                  <div style={{ fontSize: '9px', color: '#7a7a7a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.path}
                  </div>
                </button>
              ))
            : activeTab === 'cloud'
            ? filteredCloudDocuments.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onOpenCloudDocument(doc.id, doc.fileName)}
                  onMouseEnter={() => setHoveredItemId(String(doc.id))}
                  onMouseLeave={() => setHoveredItemId(null)}
                  style={{
                    border: hoveredItemId === String(doc.id) ? '1px solid #AC8E66' : '0.5px solid #3A3A3A',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    background: hoveredItemId === String(doc.id) ? 'rgba(172,142,102,0.10)' : 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#7a7a7a',
                    fontFamily: 'IBM Plex Mono, monospace',
                    transform: hoveredItemId === String(doc.id) ? 'translateX(3px)' : 'translateX(0)',
                    transition: 'transform 0.15s ease, border-color 0.15s ease, background 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#d3d3d3', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FontAwesomeIcon icon={faCloud} style={{ fontSize: '9px', color: '#AC8E66' }} />
                    {doc.fileName}
                  </div>
                  <div style={{ fontSize: '9px', color: '#7a7a7a' }}>
                    {new Date(doc.createdAt).toLocaleString('de-DE')}
                  </div>
                </button>
              ))
            : activeTab === 'zennote'
            ? filteredZenNoteDocuments.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onOpenCloudDocument(doc.id, doc.fileName)}
                  onMouseEnter={() => setHoveredItemId(String(doc.id))}
                  onMouseLeave={() => setHoveredItemId(null)}
                  style={{
                    border: hoveredItemId === String(doc.id) ? '1px solid #AC8E66' : '0.5px solid #3A3A3A',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    background: hoveredItemId === String(doc.id) ? 'rgba(172,142,102,0.10)' : 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#7a7a7a',
                    fontFamily: 'IBM Plex Mono, monospace',
                    transform: hoveredItemId === String(doc.id) ? 'translateX(3px)' : 'translateX(0)',
                    transition: 'transform 0.15s ease, border-color 0.15s ease, background 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#d3d3d3', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FontAwesomeIcon icon={faStickyNote} style={{ fontSize: '9px', color: '#AC8E66' }} />
                    {doc.fileName.replace(/\.zennote$/, '')}
                  </div>
                  <div style={{ fontSize: '9px', color: '#7a7a7a' }}>
                    {new Date(doc.createdAt).toLocaleString('de-DE')}
                  </div>
                </button>
              ))
            : filteredWebDocuments.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onLoadWebDocument(doc.content, doc.name)}
                  onMouseEnter={() => setHoveredItemId(doc.id)}
                  onMouseLeave={() => setHoveredItemId(null)}
                  style={{
                    border: hoveredItemId === doc.id ? '1px solid #4caf50' : '0.5px solid #3A3A3A',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    background: hoveredItemId === doc.id ? 'rgba(205,195,176,0.12)' : 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#7a7a7a',
                    fontFamily: 'IBM Plex Mono, monospace',
                    transform: hoveredItemId === doc.id ? 'translateX(3px)' : 'translateX(0)',
                    transition: 'transform 0.15s ease, border-color 0.15s ease, background 0.15s ease',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#d3d3d3' }}>{doc.name}</div>
                  <div style={{ fontSize: '9px', color: '#7a7a7a' }}>
                    Zuletzt geladen: {new Date(doc.updatedAt).toLocaleString('de-DE')}
                  </div>
                </button>
              ))}
        </div>

        {activeTab === 'files' && isDesktopRuntime && filteredAllFiles.length === 0 && (
          <div style={{ marginTop: '10px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#777' }}>
            {allFiles.length === 0 ? 'Keine Dateien gefunden.' : 'Keine Treffer.'}
          </div>
        )}
        {activeTab === 'web' && filteredWebDocuments.length === 0 && (
          <div style={{ marginTop: '10px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#777' }}>
            {webDocuments.length === 0 ? 'Noch keine Web-Dokumente geladen.' : 'Keine Treffer.'}
          </div>
        )}
        {activeTab === 'cloud' && filteredCloudDocuments.length === 0 && (
          <div style={{ marginTop: '10px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#777' }}>
            {cloudDocuments.length === 0 ? 'Keine Cloud-Dokumente gefunden.' : 'Keine Treffer.'}
          </div>
        )}
        {activeTab === 'zennote' && filteredZenNoteDocuments.length === 0 && (
          <div style={{ marginTop: '10px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#777' }}>
            {zenNoteCount === 0 ? 'Keine ZenNote-Notizen gefunden.' : 'Keine Treffer.'}
          </div>
        )}
      </div>
    </div>
  );
}
