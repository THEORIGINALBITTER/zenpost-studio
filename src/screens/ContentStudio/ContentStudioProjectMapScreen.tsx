import { useMemo, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowDownAZ, faCalendarDays, faFileImport, faFolderOpen } from '@fortawesome/free-solid-svg-icons';
import { importDocumentToMarkdown } from '../../services/documentImportService';

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
  onBack: () => void;
  onStartWriting: () => void;
  onOpenFile: (filePath: string) => void;
  onLoadWebDocument: (content: string, fileName: string) => void;
};

export function ContentStudioProjectMapScreen({
  isDesktopRuntime,
  projectPath,
  allFiles,
  webDocuments,
  onBack,
  onStartWriting,
  onOpenFile,
  onLoadWebDocument,
}: ContentStudioProjectMapScreenProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fileSearch, setFileSearch] = useState('');
  const [fileSort, setFileSort] = useState<'name-asc' | 'name-desc' | 'date-desc' | 'date-asc'>('name-asc');

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
        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FontAwesomeIcon icon={faFolderOpen} style={{ fontSize: '22px', color: '#AC8E66' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 200, color: '#AC8E66', margin: 0, fontFamily: 'IBM Plex Mono, monospace' }}>
              Content Projektmappe
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onBack}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #3A3A3A',
                background: 'transparent',
                color: '#999',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Dashboard
            </button>
            <button
              onClick={onStartWriting}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #AC8E66',
                background: '#d0cbb8',
                color: '#1a1a1a',
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Direkt schreiben
            </button>
          </div>
        </div>

        <p style={{ color: '#999', marginBottom: '14px', fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace' }}>
          {projectPath ? `Projekt: ${projectPath}` : 'Kein Projekt ausgewählt'}
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
            border: `2px dashed ${isDragActive ? '#AC8E66' : '#3A3A3A'}`,
            borderRadius: '12px',
            padding: '18px',
            textAlign: 'center',
            marginBottom: '14px',
            color: '#7a7a7a',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '11px',
          }}
        >
          {isConverting ? 'Konvertiere Dokument…' : 'Datei hier ablegen (Drag & Drop)'}
          <div style={{ marginTop: '8px', fontSize: '9px', color: '#666' }}>
            Unterstützt: .md, .txt, .json, .pdf, .docx, .doc, .pages
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              marginTop: '10px',
              padding: '7px 10px',
              borderRadius: '8px',
              border: '1px dotted #3A3A3A',
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

        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#BEBEBE' }}>
            {isDesktopRuntime ? 'Projektdateien' : 'Web-Dokumente'}
          </span>
          {isDesktopRuntime && (
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
          placeholder="Suche nach Name/Pfad oder *.md"
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
          {isDesktopRuntime
            ? filteredAllFiles.map((file) => (
                <button
                  key={file.path}
                  onClick={() => onOpenFile(file.path)}
                  style={{
                    border: '0.5px solid #3A3A3A',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#7a7a7a',
                    fontFamily: 'IBM Plex Mono, monospace',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#d3d3d3' }}>{file.name}</div>
                  <div style={{ fontSize: '9px', color: '#7a7a7a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.path}
                  </div>
                </button>
              ))
            : filteredWebDocuments.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onLoadWebDocument(doc.content, doc.name)}
                  style={{
                    border: '0.5px solid #3A3A3A',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#7a7a7a',
                    fontFamily: 'IBM Plex Mono, monospace',
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#d3d3d3' }}>{doc.name}</div>
                  <div style={{ fontSize: '9px', color: '#7a7a7a' }}>
                    Zuletzt geladen: {new Date(doc.updatedAt).toLocaleString('de-DE')}
                  </div>
                </button>
              ))}
        </div>

        {((isDesktopRuntime && filteredAllFiles.length === 0) || (!isDesktopRuntime && filteredWebDocuments.length === 0)) && (
          <div style={{ marginTop: '10px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#777' }}>
            {isDesktopRuntime ? (allFiles.length === 0 ? 'Keine Dateien gefunden.' : 'Keine Treffer.') : (webDocuments.length === 0 ? 'Noch keine Web-Dokumente geladen.' : 'Keine Treffer.')}
          </div>
        )}
      </div>
    </div>
  );
}
